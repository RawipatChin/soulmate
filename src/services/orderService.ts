import { signInAnonymously, type User } from 'firebase/auth';
import {
  collection,
  getDoc,
  getDocs,
  query,
  where,
  doc,
  type DocumentData,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../lib/firebase';
import type { StorefrontCartItem } from './cartService';
import { logOrderFailure } from './orderFailure';

export interface OrderContact {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  addressLine1: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
}

export interface StoreOrder extends DocumentData {
  id: string;
  orderNumber: string;
  ownerUid: string;
  ownerType: 'guest' | 'customer';
  contact: OrderContact;
  items: Array<{
    productId: string;
    productName: string;
    variantId: string | null;
    variantName: string | null;
    unitPriceSatang: number;
    quantity: number;
    lineTotalSatang: number;
  }>;
  subtotalSatang: number;
  shippingFeeSatang: number;
  totalSatang: number;
  status: 'pending_payment' | 'paid' | 'payment_failed' | 'expired';
  expiresAt?: { toMillis: () => number; toDate?: () => Date };
  payment: { method: 'promptpay' | null; status: string; chargeId: string | null; qrUrl: string | null };
  createdAt?: { toDate: () => Date };
}

export class OrderReviewError extends Error {
  currentItems?: Array<{ productId: string; variantId: string | null; unitPriceSatang: number; productName: string; variantName: string | null }>;
}

export function clearPendingOrderRequestKey() {
  sessionStorage.removeItem('soulmate_order_request_key_v1');
}

function requireServices() {
  if (!auth || !db || !functions) throw new Error('ระบบคำสั่งซื้อยังไม่ได้ตั้งค่า Firebase');
  return { auth, db, functions };
}

function newestFirst(orders: StoreOrder[]) {
  return orders.sort((a, b) => (b.createdAt?.toDate?.().getTime() ?? 0) - (a.createdAt?.toDate?.().getTime() ?? 0));
}

async function reconcileOrderIds(orderIds: string[]) {
  if (!orderIds.length) return;
  const { functions } = requireServices();
  const callable = httpsCallable(functions, 'reconcileOrderExpirations');
  for (let index = 0; index < orderIds.length; index += 50) {
    const batch = { orderIds: orderIds.slice(index, index + 50) };
    await callable(batch);
  }
}

async function reconcilePendingOrders(orders: StoreOrder[]) {
  await reconcileOrderIds(orders.filter((order) => order.status === 'pending_payment').map((order) => order.id));
}

export async function ensureCheckoutIdentity(): Promise<User> {
  const { auth } = requireServices();
  await auth.authStateReady();
  if (auth.currentUser) return auth.currentUser;
  return (await signInAnonymously(auth)).user;
}

export async function createPendingOrder(items: StorefrontCartItem[], contact: OrderContact) {
  const { functions } = requireServices();
  await ensureCheckoutIdentity();
  const storageKey = 'soulmate_order_request_key_v1';
  const callable = httpsCallable(functions, 'createPendingOrder');
  const requestItems = items.map(({ productId, variantId, quantity, unitPrice }) => ({
    productId,
    variantId,
    quantity,
    expectedPriceSatang: Math.round(unitPrice * 100),
  }));
  const fingerprint = JSON.stringify({ contact, items: requestItems });
  const previousRequest = sessionStorage.getItem(storageKey);
  let saved: { key: string; fingerprint: string } | null = null;
  try { saved = previousRequest ? JSON.parse(previousRequest) as { key: string; fingerprint: string } : null; } catch { /* Replace stale pre-fingerprint session values. */ }
  const currentKey = saved?.fingerprint === fingerprint ? saved.key : crypto.randomUUID().replaceAll('-', '');
  sessionStorage.setItem(storageKey, JSON.stringify({ key: currentKey, fingerprint }));
  try {
    const response = await callable({
      idempotencyKey: currentKey,
      contact,
      items: requestItems,
    });
    return response.data as { orderId: string; orderNumber: string; ownerType: 'guest' | 'customer'; replay: boolean };
  } catch (cause) {
    logOrderFailure('createPendingOrder', cause);
    const error = cause as Error & {
      details?: { currentItems?: OrderReviewError['currentItems'] };
      customData?: { details?: { currentItems?: OrderReviewError['currentItems'] } };
    };
    const changedItems = error.details?.currentItems ?? error.customData?.details?.currentItems;
    if (changedItems) {
      const reviewError = new OrderReviewError(error.message);
      reviewError.currentItems = changedItems;
      throw reviewError;
    }
    throw cause;
  }
}

export async function startPromptPay(orderId: string) {
  const { functions } = requireServices();
  const callable = httpsCallable(functions, 'startPromptPay');
  const response = await callable({ orderId });
  return response.data as { chargeId: string; qrUrl: string };
}

export async function getOrder(orderId: string): Promise<StoreOrder | null> {
  const { db } = requireServices();
  const orderRef = doc(db, 'orders', orderId);
  let snapshot = await getDoc(orderRef);
  if (!snapshot.exists()) return null;
  if (snapshot.data().status === 'pending_payment') {
    try {
      await reconcileOrderIds([orderId]);
      snapshot = await getDoc(orderRef);
    } catch (cause) {
      logOrderFailure('reconcileOrderExpirations', cause);
      // An unavailable reconciliation function must not hide a saved Order.
    }
  }
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as StoreOrder) : null;
}

export async function listMyOrders(): Promise<StoreOrder[]> {
  const { auth, db } = requireServices();
  const user = auth.currentUser;
  if (!user || user.isAnonymous) return [];
  const ordersQuery = query(collection(db, 'orders'), where('ownerUid', '==', user.uid));
  let snapshot = await getDocs(ordersQuery);
  try {
    await reconcilePendingOrders(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as StoreOrder)));
    snapshot = await getDocs(ordersQuery);
  } catch (cause) {
    logOrderFailure('reconcileMyOrders', cause);
  }
  return newestFirst(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as StoreOrder)));
}

export async function listAdminOrders(): Promise<StoreOrder[]> {
  const { db } = requireServices();
  const ordersQuery = query(collection(db, 'orders'));
  let snapshot = await getDocs(ordersQuery);
  try {
    await reconcilePendingOrders(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as StoreOrder)));
    snapshot = await getDocs(ordersQuery);
  } catch (cause) {
    logOrderFailure('reconcileAdminOrders', cause);
  }
  return newestFirst(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as StoreOrder)));
}
