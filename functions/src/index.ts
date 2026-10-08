import { createHash } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { defineString } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import {
  findPriceChanges,
  getOrderExpiryTime,
  inventoryChanges,
  isOrderPastExpiry,
  priceOrderItems,
  type CatalogProduct,
  type OrderLineRequest,
} from './order-domain.js';

initializeApp();
const db = getFirestore();
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
  const user = await db.doc('users/' + uid).get();
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

function requireTestCheckout() {
  if (!isEmulator && checkoutMode.value() !== 'test') {
    throw new HttpsError('failed-precondition', 'การรับคำสั่งซื้อยังไม่เปิดใน Firebase โปรเจกต์นี้');
  }
}

function orderExpiryMilliseconds(order: Record<string, any>) {
  if (typeof order.expiresAt?.toMillis === 'function') return order.expiresAt.toMillis() as number;
  if (typeof order.createdAt?.toMillis === 'function') return getOrderExpiryTime(order.createdAt.toMillis());
  return Number.POSITIVE_INFINITY;
}

async function expireOrderIfDue(orderId: string) {
  const orderRef = db.doc('orders/' + orderId);
  const orderSnapshot = await orderRef.get();
  if (!orderSnapshot.exists) return false;
  const order = orderSnapshot.data()!;
  if (order.status !== 'pending_payment' || !isOrderPastExpiry(orderExpiryMilliseconds(order), Date.now())) return false;

  return db.runTransaction(async (transaction) => {
    const currentSnapshot = await transaction.get(orderRef);
    if (!currentSnapshot.exists) return false;
    const current = currentSnapshot.data()!;
    if (current.status !== 'pending_payment' || !isOrderPastExpiry(orderExpiryMilliseconds(current), Date.now())) return false;
    // A charge created by an older payment build must be reconciled before its stock is released.
    if (current.payment?.chargeId) return false;
    const attemptSnapshot = await transaction.get(db.doc('orderPaymentAttempts/' + orderId));
    if (attemptSnapshot.exists && ['creating', 'unknown', 'started'].includes(String(attemptSnapshot.data()?.status ?? ''))) return false;

    const productIds: string[] = current.inventoryRestored === true
      ? []
      : [...new Set<string>((current.items ?? []).map((item: { productId: string }) => item.productId))];
    const productRefs = productIds.map((id) => db.doc('products/' + id));
    const productSnapshots = await Promise.all(productRefs.map((ref) => transaction.get(ref)));
    transaction.update(orderRef, {
      status: 'expired',
      'payment.status': 'expired',
      inventoryRestored: true,
      expiredAt: Timestamp.now(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    productSnapshots.forEach((snapshot, index) => {
      if (!snapshot.exists) return;
      const productId = productIds[index];
      const lines = (current.items ?? []).filter((item: { productId: string }) => item.productId === productId);
      transaction.update(productRefs[index], {
        ...inventoryChanges({ id: productId, ...snapshot.data() } as CatalogProduct, lines, 1),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    return true;
  });
}

async function expireDueOrders() {
  const snapshot = await db.collection('orders').where('status', '==', 'pending_payment').get();
  const now = Date.now();
  for (const item of snapshot.docs) {
    if (!isOrderPastExpiry(orderExpiryMilliseconds(item.data()), now)) continue;
    try {
      await expireOrderIfDue(item.id);
    } catch (error) {
      logger.warn('Could not expire an order during checkout', { orderId: item.id, error });
    }
  }
}

export const reconcileOrderExpirations = onCall(async (request) => {
  const identity = requireIdentity(request);
  const anonymous = isAnonymous(identity.token);
  const profile = anonymous ? null : await db.doc('users/' + identity.uid).get();
  const isAdmin = profile?.exists === true
    && profile.data()?.status === 'active'
    && ['admin', 'super_admin'].includes(String(profile.data()?.role ?? ''));
  if (!anonymous && !isAdmin) await requireCustomer(identity.uid, false);
  const requestedIds = (request.data as { orderIds?: unknown } | undefined)?.orderIds;
  if (!Array.isArray(requestedIds) || requestedIds.length > 50) {
    throw new HttpsError('invalid-argument', 'At most 50 order IDs can be reconciled at once.');
  }
  const orderIds = [...new Set(requestedIds.map((value) => String(value ?? '')).filter(Boolean))];
  for (const orderId of orderIds) {
    const snapshot = await db.doc('orders/' + orderId).get();
    if (!snapshot.exists) continue;
    if (!isAdmin && snapshot.data()?.ownerUid !== identity.uid) {
      throw new HttpsError('permission-denied', 'You cannot reconcile another customer’s order.');
    }
    await expireOrderIfDue(orderId);
  }
  return { processed: orderIds.length };
});

// This endpoint persists an Order before any payment provider is involved.
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
  const orderId = createHash('sha256').update(identity.uid + ':' + key).digest('hex');
  const orderRef = db.doc('orders/' + orderId);
  const requestHash = createHash('sha256').update(JSON.stringify({
    contact,
    items: input.map(({ productId, variantId, quantity }) => ({ productId, variantId: variantId || null, quantity })),
  })).digest('hex');

  return db.runTransaction(async (transaction) => {
    const previous = await transaction.get(orderRef);
    if (previous.exists) {
      if (previous.data()?.requestHash !== requestHash) {
        throw new HttpsError('failed-precondition', 'ข้อมูลตะกร้าหรือที่อยู่เปลี่ยน กรุณาส่งคำสั่งซื้อใหม่');
      }
      return {
        orderId,
        orderNumber: previous.data()?.orderNumber as string,
        ownerType: previous.data()?.ownerType as 'guest' | 'customer',
        replay: true,
      };
    }
    const productRefs = productIds.map((id) => db.doc('products/' + id));
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
        currentItems: priced.items.map(({ productId, variantId, unitPriceSatang, productName, variantName }) => ({
          productId, variantId, unitPriceSatang, productName, variantName,
        })),
      });
    }
    const orderNumber = 'SM-' + Date.now().toString(36).toUpperCase() + '-' + orderId.slice(0, 6).toUpperCase();
    for (let index = 0; index < productIds.length; index += 1) {
      const product = catalog[index];
      transaction.update(productRefs[index], {
        ...inventoryChanges(product, priced.reservations, -1),
        updatedAt: FieldValue.serverTimestamp(),
      });
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
      payment: { method: null, status: 'pending', provider: null, chargeId: null, qrUrl: null },
      inventoryRestored: false,
      requestHash,
      expiresAt: Timestamp.fromMillis(getOrderExpiryTime(Date.now())),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { orderId, orderNumber, ownerType: anonymous ? 'guest' : 'customer', replay: false };
  });
});
