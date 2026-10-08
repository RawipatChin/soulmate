import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { defineSecret, defineString } from 'firebase-functions/params';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import {
  findPriceChanges,
  getChargeOutcome,
  getOrderExpiryTime,
  getPaymentReferenceId,
  inventoryChanges,
  isOrderPastExpiry,
  ORDER_HOLD_MILLISECONDS,
  priceOrderItems,
  type CatalogProduct,
  type OrderLineRequest,
} from './order-domain.js';

initializeApp();
const db = getFirestore();
const omiseSecretKey = defineSecret('OMISE_SECRET_KEY');
const omiseWebhookSecret = defineSecret('OMISE_WEBHOOK_SECRET');
const checkoutMode = defineString('CHECKOUT_MODE', { default: 'disabled' });
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

function requireOmiseWebhookSecret() {
  const secret = omiseWebhookSecret.value();
  if (!secret) {
    throw new HttpsError('failed-precondition', 'ยังไม่ได้ตั้งค่า Omise webhook จึงยังเริ่ม PromptPay ไม่ได้');
  }
  return secret;
}

function requireTestCheckout() {
  if (!isEmulator && checkoutMode.value() !== 'test') {
    throw new HttpsError('failed-precondition', 'การรับคำสั่งซื้อยังไม่เปิดใน Firebase โปรเจกต์นี้');
  }
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

type OmiseCharge = Record<string, any> & {
  id: string;
  ref_id?: string;
  status: string;
  amount: number;
  currency: string;
  livemode: boolean;
  metadata?: { order_id?: string };
  source?: { type?: string; scannable_code?: { image?: { download_uri?: string } } };
};

function orderExpiryMilliseconds(order: Record<string, any>) {
  if (typeof order.expiresAt?.toMillis === 'function') return order.expiresAt.toMillis() as number;
  if (typeof order.createdAt?.toMillis === 'function') {
    return getOrderExpiryTime(order.createdAt.toMillis());
  }
  return Number.POSITIVE_INFINITY;
}

function optionalOmiseTestKey() {
  try {
    const key = omiseSecretKey.value();
    return !isEmulator && key.startsWith('skey_test_') ? key : null;
  } catch {
    return null;
  }
}

function isChargeForOrder(charge: OmiseCharge, orderId: string, order: Record<string, any>) {
  return charge.livemode === false
    && charge.amount === order.totalSatang
    && String(charge.currency).toUpperCase() === 'THB'
    && charge.source?.type === 'promptpay'
    && charge.metadata?.order_id === orderId
    && charge.ref_id === getPaymentReferenceId(orderId);
}

async function findChargeByReference(orderId: string, order: Record<string, any>, key: string) {
  const createdAt = typeof order.createdAt?.toDate === 'function' ? order.createdAt.toDate() as Date : new Date(Date.now() - ORDER_HOLD_MILLISECONDS);
  const to = new Date();
  let offset = 0;
  while (offset < 500) {
    const params = new URLSearchParams({
      from: createdAt.toISOString(),
      to: to.toISOString(),
      limit: '100',
      offset: String(offset),
      order: 'reverse_chronological',
    });
    const page = await omiseRequest(`/charges?${params.toString()}`, key);
    const charges = Array.isArray(page.data) ? page.data as OmiseCharge[] : [];
    const match = charges.find((charge) => isChargeForOrder(charge, orderId, order));
    if (match) return match;
    if (charges.length < 100 || offset + charges.length >= Number(page.total ?? 0)) break;
    offset += charges.length;
  }
  return null;
}

async function applyOrderChargeOutcome(orderId: string, charge: OmiseCharge | null, requireExpired = true) {
  const orderRef = db.doc(`orders/${orderId}`);
  const attemptRef = db.doc(`orderPaymentAttempts/${orderId}`);
  const now = Timestamp.now();
  return db.runTransaction(async (transaction) => {
    const [orderSnapshot, attemptSnapshot] = await Promise.all([
      transaction.get(orderRef),
      transaction.get(attemptRef),
    ]);
    if (!orderSnapshot.exists) return false;
    const order = orderSnapshot.data()!;
    if (order.status !== 'pending_payment') return false;
    if (requireExpired && !isOrderPastExpiry(orderExpiryMilliseconds(order), now.toMillis())) return false;
    if (charge && !isChargeForOrder(charge, orderId, order)) return false;
    const outcome = charge ? getChargeOutcome(charge.status) : 'expired';
    if (outcome === 'pending') return false;
    if (order.payment?.chargeId && charge && order.payment.chargeId !== charge.id) return false;

    if (outcome === 'paid') {
      transaction.update(orderRef, {
        status: 'paid',
        'payment.status': 'successful',
        'payment.chargeId': charge!.id,
        updatedAt: FieldValue.serverTimestamp(),
      });
      if (attemptSnapshot.exists) transaction.update(attemptRef, { status: 'successful', chargeId: charge!.id, updatedAt: FieldValue.serverTimestamp() });
      return true;
    }

    const shouldRestore = order.inventoryRestored !== true;
    const productIds: string[] = shouldRestore
      ? [...new Set<string>((order.items ?? []).map((item: { productId: string }) => item.productId))]
      : [];
    const productRefs = productIds.map((id) => db.doc(`products/${id}`));
    const productSnapshots = await Promise.all(productRefs.map((ref) => transaction.get(ref)));
    const terminalOrderStatus = outcome === 'failed' ? 'payment_failed' : 'expired';
    const terminalPaymentStatus = outcome === 'failed' ? 'failed' : 'expired';
    transaction.update(orderRef, {
      status: terminalOrderStatus,
      'payment.status': terminalPaymentStatus,
      ...(charge ? { 'payment.chargeId': charge.id } : {}),
      inventoryRestored: true,
      ...(outcome === 'expired' ? { expiredAt: now } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (attemptSnapshot.exists) transaction.update(attemptRef, {
      status: terminalPaymentStatus,
      ...(charge ? { chargeId: charge.id } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });
    productSnapshots.forEach((snapshot, index) => {
      if (!snapshot.exists) return;
      const productId = productIds[index];
      const product = snapshot.data()!;
      const lines = (order.items ?? []).filter((item: { productId: string }) => item.productId === productId);
      transaction.update(productRefs[index], {
        ...inventoryChanges({ id: productId, ...product } as CatalogProduct, lines, 1),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    return true;
  });
}

async function expireOrderIfDue(orderId: string) {
  const orderSnapshot = await db.doc(`orders/${orderId}`).get();
  if (!orderSnapshot.exists) return false;
  const order = orderSnapshot.data()!;
  if (order.status !== 'pending_payment' || !isOrderPastExpiry(orderExpiryMilliseconds(order), Date.now())) return false;

  const attemptSnapshot = await db.doc(`orderPaymentAttempts/${orderId}`).get();
  const attempt = attemptSnapshot.data();
  const needsOmiseCheck = Boolean(order.payment?.chargeId)
    || ['creating', 'unknown', 'started'].includes(String(attempt?.status ?? ''));
  let charge: OmiseCharge | null = null;
  if (needsOmiseCheck) {
    const key = optionalOmiseTestKey();
    if (!key) return false;
    charge = order.payment?.chargeId
      ? await omiseRequest(`/charges/${encodeURIComponent(String(order.payment.chargeId))}`, key) as OmiseCharge
      : await findChargeByReference(orderId, order, key);
    if (!charge) return false;
  }
  return applyOrderChargeOutcome(orderId, charge);
}

async function expireDueOrders() {
  const snapshot = await db.collection('orders').where('status', '==', 'pending_payment').get();
  const now = Date.now();
  const dueIds = snapshot.docs
    .filter((item) => isOrderPastExpiry(orderExpiryMilliseconds(item.data()), now))
    .map((item) => item.id);
  for (const orderId of dueIds) {
    try {
      await expireOrderIfDue(orderId);
    } catch (error) {
      logger.warn('Could not reconcile an expired order during checkout', { orderId, error });
    }
  }
}

async function reconcileOrdersForIdentity(identity: ReturnType<typeof requireIdentity>, requestedIds: unknown) {
  const anonymous = isAnonymous(identity.token);
  const profile = anonymous ? null : await db.doc(`users/${identity.uid}`).get();
  const isAdmin = profile?.exists === true
    && profile.data()?.status === 'active'
    && ['admin', 'super_admin'].includes(String(profile.data()?.role ?? ''));
  if (!anonymous && !isAdmin) await requireCustomer(identity.uid, false);
  if (!Array.isArray(requestedIds) || requestedIds.length > 50) {
    throw new HttpsError('invalid-argument', 'At most 50 order IDs can be reconciled at once.');
  }
  const orderIds = [...new Set(requestedIds.map((value) => String(value ?? '')).filter(Boolean))];
  for (const orderId of orderIds) {
    const snapshot = await db.doc(`orders/${orderId}`).get();
    if (!snapshot.exists) continue;
    if (!isAdmin && snapshot.data()?.ownerUid !== identity.uid) {
      throw new HttpsError('permission-denied', 'You cannot reconcile another customer’s order.');
    }
    await expireOrderIfDue(orderId);
  }
  return { processed: orderIds.length };
}

export const reconcileOrderExpirations = onCall(async (request) => {
  const identity = requireIdentity(request);
  return reconcileOrdersForIdentity(identity, (request.data as { orderIds?: unknown } | undefined)?.orderIds);
});

export const reconcileOmiseOrderExpirations = onCall({ secrets: [omiseSecretKey] }, async (request) => {
  requireTestCheckout();
  const identity = requireIdentity(request);
  return reconcileOrdersForIdentity(identity, (request.data as { orderIds?: unknown } | undefined)?.orderIds);
});

export const createPendingOrder = onCall(async (request) => {
  requireTestCheckout();
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
  await expireDueOrders();
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
      expiresAt: Timestamp.fromMillis(getOrderExpiryTime(Date.now())),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { orderId, orderNumber, ownerType: anonymous ? 'guest' : 'customer', replay: false };
  });
  return result;
});

async function savePromptPayCharge(orderId: string, charge: OmiseCharge) {
  const orderRef = db.doc(`orders/${orderId}`);
  const attemptRef = db.doc(`orderPaymentAttempts/${orderId}`);
  const snapshot = await orderRef.get();
  if (!snapshot.exists || !isChargeForOrder(charge, orderId, snapshot.data()!)) {
    await attemptRef.set({ status: 'unknown', chargeId: charge.id, refId: getPaymentReferenceId(orderId), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    throw new HttpsError('failed-precondition', 'ตรวจสอบข้อมูล PromptPay จาก Omise ไม่ผ่าน จึงยังไม่แสดง QR');
  }
  if (getChargeOutcome(charge.status) !== 'pending') {
    await applyOrderChargeOutcome(orderId, charge, false);
    throw new HttpsError('failed-precondition', 'charge สิ้นสุดก่อนแสดง QR กรุณาตรวจสอบสถานะคำสั่งซื้อ');
  }
  const qrUrl = charge.source?.scannable_code?.image?.download_uri ?? null;
  if (!qrUrl) {
    await attemptRef.set({ status: 'unknown', chargeId: charge.id, refId: getPaymentReferenceId(orderId), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    throw new HttpsError('unavailable', 'Omise ไม่ได้ส่ง QR PromptPay กลับมา; ระบบกำลังตรวจสอบ charge เดิมก่อนลองซ้ำ');
  }
  const stored = await db.runTransaction(async (transaction) => {
    const [orderSnapshot, attemptSnapshot] = await Promise.all([
      transaction.get(orderRef),
      transaction.get(attemptRef),
    ]);
    if (!orderSnapshot.exists) throw new HttpsError('not-found', 'ไม่พบคำสั่งซื้อ');
    const order = orderSnapshot.data()!;
    if (order.status !== 'pending_payment' || order.payment?.status !== 'pending') return false;
    if (order.payment?.chargeId && order.payment.chargeId !== charge.id) return false;
    if (isOrderPastExpiry(orderExpiryMilliseconds(order), Date.now())) return false;
    transaction.update(orderRef, {
      'payment.chargeId': charge.id,
      'payment.qrUrl': qrUrl,
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.set(attemptRef, {
      ...(attemptSnapshot.data() ?? {}),
      status: 'started',
      orderId,
      refId: getPaymentReferenceId(orderId),
      chargeId: charge.id,
      qrUrl,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return true;
  });
  if (!stored) {
    await expireOrderIfDue(orderId);
    throw new HttpsError('failed-precondition', 'คำสั่งซื้อนี้หมดเวลารอชำระแล้ว กรุณาตรวจสอบสถานะคำสั่งซื้อ');
  }
  return { chargeId: charge.id, qrUrl };
}

export const startPromptPay = onCall({ secrets: [omiseSecretKey, omiseWebhookSecret] }, async (request) => {
  requireTestCheckout();
  const identity = requireIdentity(request);
  const anonymous = isAnonymous(identity.token);
  await requireCustomer(identity.uid, anonymous);
  const orderId = String((request.data as Record<string, unknown> | undefined)?.orderId ?? '');
  if (!orderId) throw new HttpsError('invalid-argument', 'Order ID is required.');
  const orderRef = db.doc(`orders/${orderId}`);
  const visibleOrder = await orderRef.get();
  if (!visibleOrder.exists || visibleOrder.data()?.ownerUid !== identity.uid) {
    throw new HttpsError('not-found', 'ไม่พบคำสั่งซื้อ');
  }
  await expireOrderIfDue(orderId);
  const key = requireOmise();
  requireOmiseWebhookSecret();
  const attemptRef = db.doc(`orderPaymentAttempts/${orderId}`);
  const refId = getPaymentReferenceId(orderId);
  type PaymentClaim =
    | { existing: { chargeId: string; qrUrl: string } }
    | { reconcile: { order: Record<string, any>; attempt: Record<string, any> } }
    | { order: Record<string, any> };
  const claim = await db.runTransaction(async (transaction): Promise<PaymentClaim> => {
    const [orderSnapshot, attemptSnapshot] = await Promise.all([transaction.get(orderRef), transaction.get(attemptRef)]);
    if (!orderSnapshot.exists || orderSnapshot.data()?.ownerUid !== identity.uid) throw new HttpsError('not-found', 'ไม่พบคำสั่งซื้อ');
    const order = orderSnapshot.data()!;
    if (order.status !== 'pending_payment' || order.payment?.status !== 'pending') throw new HttpsError('failed-precondition', 'คำสั่งซื้อนี้เริ่มชำระเงินไม่ได้');
    if (isOrderPastExpiry(orderExpiryMilliseconds(order), Date.now())) throw new HttpsError('failed-precondition', 'คำสั่งซื้อนี้หมดเวลารอชำระแล้ว กรุณาสร้างคำสั่งซื้อใหม่');
    if (order.payment?.chargeId && order.payment?.qrUrl) return { existing: { chargeId: order.payment.chargeId as string, qrUrl: order.payment.qrUrl as string } };
    const attempt = attemptSnapshot.data();
    if (['creating', 'unknown', 'started'].includes(String(attempt?.status ?? ''))) {
      return { reconcile: { order, attempt: attempt! } };
    }
    transaction.set(attemptRef, {
      orderId,
      ownerUid: identity.uid,
      refId,
      status: 'creating',
      createdAt: attempt?.createdAt ?? FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { order };
  });
  if ('existing' in claim) return claim.existing;
  if ('reconcile' in claim) {
    const { order, attempt } = claim.reconcile;
    const charge = attempt.chargeId
      ? await omiseRequest(`/charges/${encodeURIComponent(String(attempt.chargeId))}`, key) as OmiseCharge
      : await findChargeByReference(orderId, order, key);
    if (!charge) throw new HttpsError('aborted', 'ยังยืนยันผลคำขอเดิมจาก Omise ไม่ได้ กรุณารอสักครู่แล้วลองตรวจสอบอีกครั้ง');
    if (!isChargeForOrder(charge, orderId, order)) {
      throw new HttpsError('failed-precondition', 'ข้อมูล charge เดิมไม่ตรงกับคำสั่งซื้อ จึงยังไม่สามารถแสดง QR ได้');
    }
    if (getChargeOutcome(charge.status) !== 'pending') {
      await applyOrderChargeOutcome(orderId, charge, false);
      throw new HttpsError('failed-precondition', 'charge เดิมสิ้นสุดแล้ว กรุณาตรวจสอบสถานะคำสั่งซื้อ');
    }
    return savePromptPayCharge(orderId, charge);
  }
  const order = claim.order;
  let charge: OmiseCharge;
  try {
    charge = await omiseRequest('/charges', key, {
      amount: order.totalSatang,
      currency: 'THB',
      'source[type]': 'promptpay',
      'metadata[order_id]': orderId,
      ref_id: refId,
      expires_at: new Date(orderExpiryMilliseconds(order)).toISOString(),
    }) as OmiseCharge;
  } catch (error) {
    const code = (error as HttpsError).code;
    await attemptRef.update({ status: code === 'failed-precondition' ? 'failed' : 'unknown', updatedAt: FieldValue.serverTimestamp() });
    throw error;
  }
  return savePromptPayCharge(orderId, charge);
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
    const charge = await omiseRequest(`/charges/${encodeURIComponent(String(chargeId))}`, key) as OmiseCharge;
    const orderId = String(charge.metadata?.order_id ?? '');
    if (!orderId) { response.status(200).send('Ignored'); return; }
    await applyOrderChargeOutcome(orderId, charge, false);
    response.status(200).send('OK');
  } catch (error) {
    logger.error('Omise webhook reconciliation failed', error);
    response.status(500).send('Unable to verify charge');
  }
});
