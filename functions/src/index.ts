import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { findPriceChanges, inventoryChanges, priceOrderItems, type CatalogProduct, type OrderLineRequest } from './order-domain.js';

initializeApp();
const db = getFirestore();
const omiseSecretKey = defineSecret('OMISE_SECRET_KEY');
const omiseWebhookSecret = defineSecret('OMISE_WEBHOOK_SECRET');
const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';

function requireIdentity(request: { auth?: { uid: string; token: Record<string, unknown> } | null }) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in or continue as guest before checkout.');
  return request.auth;
}

function isAnonymous(token: Record<string, unknown>) {
  return (token.firebase as { sign_in_provider?: string } | undefined)?.sign_in_provider === 'anonymous';
}

async function requireCustomer(uid: string, anonymous: boolean) {
  if (anonymous) return;
  const user = await db.doc(`users/${uid}`).get();
  if (!user.exists || user.data()?.status !== 'active' || user.data()?.role !== 'customer') {
    throw new HttpsError('permission-denied', 'An active customer account is required.');
  }
}

function cleanContact(raw: unknown) {
  if (!raw || typeof raw !== 'object') throw new HttpsError('invalid-argument', 'Shipping details are required.');
  const value = raw as Record<string, unknown>;
  const fields = ['firstName', 'lastName', 'phone', 'email', 'addressLine1', 'subdistrict', 'district', 'province', 'postalCode'];
  const contact = Object.fromEntries(fields.map((key) => [key, String(value[key] ?? '').trim()]));
  if (fields.some((key) => !contact[key]) || !/^\S+@\S+\.\S+$/.test(contact.email)) {
    throw new HttpsError('invalid-argument', 'กรุณากรอกชื่อ เบอร์โทร อีเมล และที่อยู่ให้ครบถ้วน');
  }
  return contact;
}

function requireOmise() {
  const secret = omiseSecretKey.value();
  if (isEmulator || !secret || !secret.startsWith('skey_test_')) {
    throw new HttpsError('failed-precondition', 'ยังไม่ได้ตั้งค่า Omise Test Mode จึงยังเริ่มชำระเงินไม่ได้');
  }
  return secret;
}

async function omiseRequest(path: string, key: string, body?: Record<string, unknown>) {
  const form = body ? new URLSearchParams(Object.entries(body).map(([name, value]) => [name, String(value)])) : undefined;
  const response = await fetch(`https://api.omise.co${path}`, {
    method: body ? 'POST' : 'GET',
      headers: {
      Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}`,
      ...(form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: form,
  });
  const data = await response.json() as Record<string, any>;
  if (!response.ok) {
    logger.error('Omise request failed', { status: response.status, code: data.code });
    throw new HttpsError(response.status >= 500 ? 'unavailable' : 'failed-precondition', 'Omise ยังไม่สามารถเริ่มรายการชำระเงินได้');
  }
  return data;
}

export const createPendingOrder = onCall({ secrets: [omiseSecretKey] }, async (request) => {
  if (!isEmulator) requireOmise();
  const identity = requireIdentity(request);
  const anonymous = isAnonymous(identity.token);
  await requireCustomer(identity.uid, anonymous);
  const payload = request.data as Record<string, unknown> | undefined;
  const key = String(payload?.idempotencyKey ?? '');
  if (!/^[a-zA-Z0-9_-]{16,80}$/.test(key)) throw new HttpsError('invalid-argument', 'Order request key is invalid.');
  const contact = cleanContact(payload?.contact);
  if (!Array.isArray(payload?.items)) throw new HttpsError('invalid-argument', 'Cart items are required.');
  const input = payload.items as OrderLineRequest[];
  if (input.some((item) => !Number.isSafeInteger(Number(item?.expectedPriceSatang)) || Number(item.expectedPriceSatang) < 0)) {
    throw new HttpsError('invalid-argument', 'Current cart prices are required for review.');
  }
  const productIds = [...new Set(input.map((item) => String(item?.productId ?? '')))].filter(Boolean);
  const orderId = createHash('sha256').update(`${identity.uid}:${key}`).digest('hex');
  const orderRef = db.doc(`orders/${orderId}`);
  const requestHash = createHash('sha256').update(JSON.stringify({ contact, items: input.map(({ productId, variantId, quantity }) => ({ productId, variantId: variantId || null, quantity })) })).digest('hex');

  const result = await db.runTransaction(async (transaction) => {
    const previous = await transaction.get(orderRef);
    if (previous.exists) {
      if (previous.data()?.requestHash !== requestHash) throw new HttpsError('failed-precondition', 'ข้อมูลตะกร้าหรือที่อยู่เปลี่ยน กรุณาส่งคำสั่งซื้อใหม่');
      return { orderId, orderNumber: previous.data()?.orderNumber as string, ownerType: previous.data()?.ownerType as 'guest' | 'customer', replay: true };
    }
    const productRefs = productIds.map((id) => db.doc(`products/${id}`));
    const productDocs = await Promise.all(productRefs.map((ref) => transaction.get(ref)));
    const catalog: CatalogProduct[] = productDocs.map((snapshot) => ({ id: snapshot.id, ...(snapshot.data() ?? {}) }) as CatalogProduct);
    let priced;
    try {
      priced = priceOrderItems(input, catalog);
    } catch (error) {
      throw new HttpsError('failed-precondition', (error as Error).message);
    }
    const changedPrices = findPriceChanges(priced, input);
    if (changedPrices.length) {
      throw new HttpsError('failed-precondition', 'ราคาสินค้าเปลี่ยนแล้ว กรุณาตรวจสอบตะกร้าอีกครั้ง', {
        currentItems: priced.items.map(({ productId, variantId, unitPriceSatang, productName, variantName }) => ({ productId, variantId, unitPriceSatang, productName, variantName })),
      });
    }
    const orderNumber = `SM-${Date.now().toString(36).toUpperCase()}-${orderId.slice(0, 6).toUpperCase()}`;
    for (const id of productIds) {
      const index = productIds.indexOf(id);
      const product = catalog[index];
      const ref = productRefs[index];
      transaction.update(ref, { ...inventoryChanges(product, priced.reservations, -1), updatedAt: FieldValue.serverTimestamp() });
    }
    transaction.create(orderRef, {
      orderNumber,
      ownerUid: identity.uid,
      ownerType: anonymous ? 'guest' : 'customer',
      contact,
      items: priced.items,
      subtotalSatang: priced.subtotalSatang,
      shippingFeeSatang: priced.shippingFeeSatang,
      totalSatang: priced.totalSatang,
      currency: 'THB',
      status: 'pending_payment',
      payment: { method: 'promptpay', status: 'pending', provider: 'omise', chargeId: null, qrUrl: null },
      inventoryRestored: false,
      requestHash,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { orderId, orderNumber, ownerType: anonymous ? 'guest' : 'customer', replay: false };
  });
  return result;
});

export const startPromptPay = onCall({ secrets: [omiseSecretKey] }, async (request) => {
  const identity = requireIdentity(request);
  await requireCustomer(identity.uid, isAnonymous(identity.token));
  const orderId = String((request.data as Record<string, unknown> | undefined)?.orderId ?? '');
  const orderRef = db.doc(`orders/${orderId}`);
  const key = requireOmise();
  const attemptRef = db.doc(`orderPaymentAttempts/${orderId}`);
  const claim = await db.runTransaction(async (transaction) => {
    const [orderSnapshot, attemptSnapshot] = await Promise.all([transaction.get(orderRef), transaction.get(attemptRef)]);
    if (!orderSnapshot.exists || orderSnapshot.data()?.ownerUid !== identity.uid) throw new HttpsError('not-found', 'ไม่พบคำสั่งซื้อ');
    const order = orderSnapshot.data()!;
    if (order.payment?.chargeId && order.payment?.qrUrl) return { existing: { chargeId: order.payment.chargeId as string, qrUrl: order.payment.qrUrl as string } };
    if (order.status !== 'pending_payment' || order.payment?.status !== 'pending') throw new HttpsError('failed-precondition', 'คำสั่งซื้อนี้เริ่มชำระเงินไม่ได้');
    const attempt = attemptSnapshot.data();
    if (attempt?.status === 'creating' || attempt?.status === 'unknown') {
      throw new HttpsError('aborted', 'กำลังตรวจสอบรายการชำระเงินนี้อยู่ กรุณารอสักครู่และอย่าส่งซ้ำ');
    }
    transaction.set(attemptRef, { orderId, ownerUid: identity.uid, status: 'creating', createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    return { order };
  });
  if ('existing' in claim) return claim.existing;
  const order = claim.order;
  let charge: Record<string, any>;
  try {
    // Omise supports creating a PromptPay source and charge in one request.
    // A Firestore attempt lock prevents concurrent submits from charging twice.
    charge = await omiseRequest('/charges', key, {
      amount: order.totalSatang,
      currency: 'THB',
      'source[type]': 'promptpay',
      'metadata[order_id]': orderId,
    });
  } catch (error) {
    const code = (error as HttpsError).code;
    await attemptRef.update({ status: code === 'failed-precondition' ? 'failed' : 'unknown', updatedAt: FieldValue.serverTimestamp() });
    throw error;
  }
  if (charge.livemode !== false || charge.amount !== order.totalSatang || String(charge.currency).toUpperCase() !== 'THB' || charge.source?.type !== 'promptpay' || charge.metadata?.order_id !== orderId) {
    await attemptRef.update({ status: 'unknown', chargeId: charge.id, updatedAt: FieldValue.serverTimestamp() });
    throw new HttpsError('failed-precondition', 'ตรวจสอบข้อมูล PromptPay จาก Omise ไม่ผ่าน จึงยังไม่แสดง QR');
  }
  const qrUrl = charge.source?.scannable_code?.image?.download_uri ?? null;
  if (!qrUrl) {
    await attemptRef.update({ status: 'unknown', chargeId: charge.id, updatedAt: FieldValue.serverTimestamp() });
    throw new HttpsError('unavailable', 'Omise ไม่ได้ส่ง QR PromptPay กลับมา; รายการถูกล็อกไว้เพื่อป้องกันการสร้าง charge ซ้ำ');
  }
  await db.runTransaction(async (transaction) => {
    transaction.update(orderRef, { 'payment.chargeId': charge.id, 'payment.qrUrl': qrUrl, updatedAt: FieldValue.serverTimestamp() });
    transaction.update(attemptRef, { status: 'started', chargeId: charge.id, qrUrl, updatedAt: FieldValue.serverTimestamp() });
  });
  return { chargeId: charge.id, qrUrl };
});

function isValidOmiseSignature(rawBody: Buffer, timestamp: string, signature: string, secret: string) {
  const timestampSeconds = Number(timestamp);
  if (!Number.isInteger(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > 300) return false;
  const secretBytes = Buffer.from(secret, 'base64');
  if (secretBytes.length === 0) return false;
  const expected = createHmac('sha256', secretBytes).update(`${timestamp}.`).update(rawBody).digest();
  return signature.split(',').some((entry) => {
    const candidate = Buffer.from(entry.trim(), 'hex');
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  });
}

export const omiseWebhook = onRequest({ secrets: [omiseSecretKey, omiseWebhookSecret] }, async (request, response) => {
  if (request.method !== 'POST') { response.status(405).send('Method not allowed'); return; }
  try {
    const timestamp = request.get('Omise-Signature-Timestamp') ?? '';
    const signature = request.get('Omise-Signature') ?? '';
    const rawBody = (request as typeof request & { rawBody?: Buffer }).rawBody;
    if (!omiseWebhookSecret.value() || !rawBody || !isValidOmiseSignature(rawBody, timestamp, signature, omiseWebhookSecret.value())) {
      response.status(401).send('Invalid Omise webhook signature');
      return;
    }
    const key = requireOmise();
    const event = request.body as Record<string, any>;
    const chargeId = event?.key?.startsWith('charge.') && event?.data?.object === 'charge' ? event.data.id : null;
    if (!chargeId) { response.status(200).send('Ignored'); return; }
    const charge = await omiseRequest(`/charges/${encodeURIComponent(String(chargeId))}`, key);
    const orderId = String(charge.metadata?.order_id ?? '');
    const orderRef = db.doc(`orders/${orderId}`);
    await db.runTransaction(async (transaction) => {
      const orderSnapshot = await transaction.get(orderRef);
      if (!orderSnapshot.exists) return;
      const order = orderSnapshot.data()!;
      if (charge.amount !== order.totalSatang || String(charge.currency).toUpperCase() !== 'THB' || charge.source?.type !== 'promptpay') return;
      if (order.payment?.chargeId && order.payment.chargeId !== charge.id) return;
      const succeeded = charge.status === 'successful';
      const failed = ['failed', 'expired'].includes(charge.status);
      const restock = failed && order.payment.status === 'pending' && !order.inventoryRestored;
      const productIds = restock ? [...new Set(order.items.map((item: { productId: string }) => item.productId))] : [];
      const productSnapshots = restock
        ? await Promise.all(productIds.map((id) => transaction.get(db.doc(`products/${id}`))))
        : [];
      if (succeeded && order.payment.status === 'pending') {
        transaction.update(orderRef, { status: 'paid', 'payment.status': 'successful', 'payment.chargeId': charge.id, updatedAt: FieldValue.serverTimestamp() });
        return;
      }
      if (succeeded && order.payment.status !== 'successful') {
        logger.warn('Ignoring paid charge for an order already marked terminal', { orderId, chargeId: charge.id, status: order.payment.status });
        return;
      }
      if (restock) {
        transaction.update(orderRef, { status: 'payment_failed', 'payment.status': charge.status, inventoryRestored: true, updatedAt: FieldValue.serverTimestamp() });
        for (const productId of productIds) {
          const productRef = db.doc(`products/${productId}`);
          const productSnapshot = productSnapshots[productIds.indexOf(productId)];
          if (!productSnapshot.exists) continue;
          const product = productSnapshot.data()!;
          const productLines = order.items.filter((item: { productId: string }) => item.productId === productId);
          transaction.update(productRef, {
            ...inventoryChanges({ id: productId, ...product } as CatalogProduct, productLines, 1),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      }
    });
    response.status(200).send('OK');
  } catch (error) {
    logger.error('Omise webhook reconciliation failed', error);
    response.status(500).send('Unable to verify charge');
  }
});
