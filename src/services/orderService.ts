import { signInAnonymously, type User } from 'firebase/auth';
import {
  collection, doc, getDoc, getDocs, query, runTransaction, serverTimestamp,
  updateDoc, setDoc, where, type DocumentData, type Timestamp,
} from 'firebase/firestore';
import { getBlob, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from '../lib/firebase';
import type { StorefrontCartItem } from './cartService';
import { MAX_ORDER_LINES, optionId, optionRef, type SellableOption } from './inventoryService';
import { calculateMembershipTier, getTierRank } from '../utils/membership';
import type { MembershipTier } from '../types/membership';
import { getPublicStoreSettings } from './storeSettingsService';

export interface OrderContact {
  firstName: string; lastName: string; phone: string; email: string;
  addressLine1: string; subdistrict: string; district: string; province: string; postalCode: string;
}
export interface OrderLine {
  productId: string; optionId: string; productName: string; variantId: string | null;
  variantName: string | null; unitPriceSatang: number; quantity: number;
  productImage: string | null; lineTotalSatang: number;
}
export interface StoreOrder extends DocumentData {
  id: string; orderNumber: string; schemaVersion?: number; ownerUid: string;
  ownerType: 'guest' | 'customer'; contact: OrderContact; items: OrderLine[];
  subtotalSatang: number; shippingFeeSatang: number; totalSatang: number;
  status: 'pending_payment' | 'awaiting_review' | 'paid' | 'cancelled' | 'payment_failed' | 'expired';
  payment: { method: 'manual_promptpay' | 'cod' | 'promptpay' | null; status: string; promptPayPhone?: string | null; chargeId?: string | null; qrUrl?: string | null };
  slipPath?: string | null; submittedAt?: Timestamp | null;
  review?: { by: string; at: Timestamp; result: 'approved' | 'cancelled'; reason: string } | null;
  createdAt?: Timestamp; updatedAt?: Timestamp; inventoryRestored?: boolean;
}
export class OrderReviewError extends Error {
  currentItems?: Array<{ productId: string; variantId: string | null; unitPriceSatang: number; productName: string; variantName: string | null }>;
}
export class OrderUnavailableItemError extends Error {
  constructor(public readonly productId: string, public readonly variantId: string | null, productName: string) {
    super(variantId === null
      ? `กรุณาเลือกตัวเลือกสินค้า ${productName} ใหม่`
      : `ตัวเลือกสินค้า ${productName} ไม่พร้อมขาย กรุณาเลือกใหม่`);
  }
}
const requestKeyName = 'soulmate_order_request_key_v1';
export function clearPendingOrderRequestKey() { sessionStorage.removeItem(requestKeyName); }
function services() {
  if (!auth || !db || !storage) throw new Error('ระบบคำสั่งซื้อยังไม่ได้ตั้งค่า Firebase');
  return { auth, db, storage };
}
export async function ensureCheckoutIdentity(): Promise<User> {
  const { auth: firebaseAuth } = services();
  await firebaseAuth.authStateReady();
  return firebaseAuth.currentUser ?? (await signInAnonymously(firebaseAuth)).user;
}
function validateContact(contact: OrderContact) {
  if (Object.values(contact).some((value) => !String(value).trim()) || !/^\S+@\S+\.\S+$/.test(contact.email)) {
    throw new Error('กรุณากรอกชื่อ เบอร์โทร อีเมล และที่อยู่ให้ครบถ้วน');
  }
}
export async function getPromptPaySettings(): Promise<{ phone: string; payeeName: string } | null> {
  const snapshot = await getDoc(doc(services().db, 'config', 'payment'));
  if (!snapshot.exists() || !snapshot.data().enabled) return null;
  return { phone: String(snapshot.data().phone ?? ''), payeeName: String(snapshot.data().payeeName ?? '') };
}
export async function getPromptPayConfig(): Promise<{ phone: string; payeeName: string; enabled: boolean } | null> {
  const snapshot = await getDoc(doc(services().db, 'config', 'payment'));
  if (!snapshot.exists()) return null;
  return {
    phone: String(snapshot.data().phone ?? ''),
    payeeName: String(snapshot.data().payeeName ?? ''),
    enabled: snapshot.data().enabled === true,
  };
}
export async function savePromptPaySettings(phone: string, payeeName: string, enabled = true) {
  const { db: firestore, auth: firebaseAuth } = services();
  if (enabled && !/^0\d{9}$/.test(phone)) throw new Error('เบอร์พร้อมเพย์ต้องเป็นเบอร์มือถือ 10 หลัก');
  try {
    await setDoc(doc(firestore, 'config', 'payment'), {
      phone, payeeName: payeeName.trim(), enabled,
      updatedAt: serverTimestamp(), updatedBy: firebaseAuth.currentUser?.uid,
    });
  } catch (error) {
    console.error('[SOULMATE Settings] Failed writing config/payment', error);
    throw new Error(`บันทึกบัญชี PromptPay (config/payment) ไม่สำเร็จ: ${error instanceof Error ? error.message : String(error)}`);
  }
}
export async function findMissingVariantSelection(items: StorefrontCartItem[]): Promise<OrderUnavailableItemError | null> {
  const { db: firestore } = services();
  const withoutVariant = items.filter((item) => item.variantId === null);
  const products = await Promise.all(withoutVariant.map((item) => getDoc(doc(firestore, 'products', item.productId))));
  const index = products.findIndex((snapshot) => snapshot.data()?.hasVariants === true);
  if (index < 0) return null;
  const item = withoutVariant[index];
  return new OrderUnavailableItemError(item.productId, null, item.productName);
}
export async function createPendingOrder(
  items: StorefrontCartItem[],
  contact: OrderContact,
  shippingMethodId = 'standard',
  selectedPaymentMethod: 'manual_promptpay' | 'cod' = 'manual_promptpay',
) {
  const { db: firestore } = services();
  const user = await ensureCheckoutIdentity();
  const publicStoreSettings = await getPublicStoreSettings();
  const paymentEnabled = publicStoreSettings.paymentMethods
    ? publicStoreSettings.paymentMethods.some((method) => method.id === (selectedPaymentMethod === 'cod' ? 'cod' : 'promptpay') && method.enabled)
    : selectedPaymentMethod === 'manual_promptpay';
  if (!paymentEnabled) throw new Error('วิธีชำระเงินนี้ปิดใช้งานแล้ว กรุณาเลือกวิธีอื่น');
  const paymentSettings = selectedPaymentMethod === 'manual_promptpay' ? await getPromptPaySettings() : null;
  if (selectedPaymentMethod === 'manual_promptpay' && !paymentSettings) throw new Error('ร้านยังไม่ได้ตั้งค่าบัญชี PromptPay กรุณาติดต่อร้าน');
  const activeShippingMethods = publicStoreSettings.shippingMethods?.filter((method) => method.enabled) ?? [];
  if (!activeShippingMethods.length) activeShippingMethods.push({ id: 'standard', name: 'จัดส่งมาตรฐาน', fee: 30, freeShippingThreshold: null, enabled: true });
  const shippingMethod = activeShippingMethods.find((method) => method.id === shippingMethodId);
  if (!shippingMethod) throw new Error('วิธีจัดส่งนี้ไม่พร้อมให้บริการ กรุณาเลือกวิธีจัดส่งใหม่');
  validateContact(contact);
  if (!items.length || items.length > MAX_ORDER_LINES) throw new Error('หนึ่งออเดอร์ใส่สินค้าได้สูงสุด 5 รายการต่างกัน');
  if (items.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99)) throw new Error('จำนวนสินค้าไม่ถูกต้อง');
  const ids = items.map((item) => `${item.productId}/${optionId(item.variantId)}`);
  if (new Set(ids).size !== ids.length) throw new Error('มีสินค้าซ้ำในตะกร้า');
  const missingVariant = await findMissingVariantSelection(items);
  if (missingVariant) throw missingVariant;
  const fingerprint = JSON.stringify({ contact, shippingMethodId, selectedPaymentMethod, items: items.map((item) => [item.productId, item.variantId, item.quantity]) });
  let saved: { key: string; fingerprint: string } | null = null;
  try { saved = JSON.parse(sessionStorage.getItem(requestKeyName) || 'null'); } catch { /* replace stale key */ }
  const key = saved?.fingerprint === fingerprint ? saved.key : crypto.randomUUID().replaceAll('-', '');
  sessionStorage.setItem(requestKeyName, JSON.stringify({ key, fingerprint }));
  const orderRef = doc(firestore, 'orders', key);
  const refs = items.map((item) => optionRef(firestore, item.productId, item.variantId));
  return runTransaction(firestore, async (tx) => {
    const prior = await tx.get(orderRef);
    if (prior.exists()) {
      if (prior.data().ownerUid !== user.uid) throw new Error('คำสั่งซื้อนี้เป็นของบัญชีอื่น');
      return { orderId: key, orderNumber: prior.data().orderNumber as string, ownerType: prior.data().ownerType as 'guest' | 'customer', replay: true };
    }
    const publicSettingsRef = doc(firestore, 'settings', 'public');
    const [settingsSnapshot, ...snapshots] = await Promise.all([
      tx.get(publicSettingsRef), ...refs.map((item) => tx.get(item)),
    ]);
    const publicSettings = settingsSnapshot.data() ?? {};
    const options = snapshots.map((snapshot) => snapshot.exists() ? snapshot.data() as SellableOption : null);
    const currentItems = options.map((option, index) => ({
      productId: items[index].productId, variantId: items[index].variantId,
      unitPriceSatang: option?.unitPriceSatang ?? 0,
      productName: option?.productName ?? items[index].productName,
      variantName: option?.variantName ?? items[index].variantName,
    }));
    if (options.some((option, index) => option && option.unitPriceSatang !== Math.round(items[index].unitPrice * 100))) {
      const error = new OrderReviewError('ราคาสินค้าเปลี่ยนแล้ว กรุณาตรวจสอบตะกร้าอีกครั้ง');
      error.currentItems = currentItems;
      throw error;
    }
    const lines: OrderLine[] = items.map((item, index) => {
      const option = options[index];
      if (!option || !option.active || option.productId !== item.productId || option.variantId !== item.variantId) {
        throw new OrderUnavailableItemError(item.productId, item.variantId, item.productName);
      }
      if (option.available < item.quantity) throw new Error(`สินค้า ${option.productName} มีไม่พอ`);
      return {
        productId: item.productId, optionId: optionId(item.variantId), productName: option.productName,
        variantId: item.variantId, variantName: option.variantName,
        unitPriceSatang: option.unitPriceSatang, quantity: item.quantity,
        productImage: option.productImage, lineTotalSatang: option.unitPriceSatang * item.quantity,
      };
    });
    const subtotalSatang = lines.reduce((sum, line) => sum + line.lineTotalSatang, 0);
    const shippingFee = shippingMethod.freeShippingThreshold != null && subtotalSatang >= Math.round(shippingMethod.freeShippingThreshold * 100)
      ? 0
      : Math.round(shippingMethod.fee * 100);
    const orderPrefix = (publicStoreSettings.orderPrefix || 'SM-').trim().slice(0, 20);
    const sequenceMode = /^\d{8,15}$/.test(orderPrefix);
    let orderNumber: string;
    if (sequenceMode) {
      const configuredLastNumber = Number(orderPrefix);
      const lastNumber = Number.isSafeInteger(publicSettings.orderSequence)
        ? publicSettings.orderSequence as number
        : configuredLastNumber;
      if (!Number.isSafeInteger(lastNumber) || lastNumber < 0 || lastNumber >= Number.MAX_SAFE_INTEGER) {
        throw new Error('เลขออเดอร์เกินขอบเขตที่รองรับ กรุณาตรวจการตั้งค่าเลขออเดอร์');
      }
      const nextNumber = lastNumber + 1;
      orderNumber = String(nextNumber).padStart(Math.max(8, orderPrefix.length), '0');
      tx.set(publicSettingsRef, {
        orderSequence: nextNumber,
        orderSequenceText: orderNumber,
        orderSequenceOrderId: key,
      }, { merge: true });
    } else {
      orderNumber = `${orderPrefix}${key.slice(0, 10).toUpperCase()}`;
    }
    lines.forEach((line, index) => tx.update(refs[index], {
      available: options[index]!.available - line.quantity, lastOrderId: key, lastOrderLine: index,
    }));
    tx.set(orderRef, {
      schemaVersion: 2, orderNumber, ownerUid: user.uid, ownerType: user.isAnonymous ? 'guest' : 'customer',
      contact, items: lines, subtotalSatang, shippingMethodId, shippingFeeSatang: shippingFee,
      totalSatang: subtotalSatang + shippingFee, currency: 'THB',
      status: 'pending_payment', payment: {
        method: selectedPaymentMethod,
        status: 'pending',
        promptPayPhone: paymentSettings?.phone ?? null,
      },
      slipPath: null, submittedAt: null, review: null, inventoryRestored: false,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    return { orderId: key, orderNumber, ownerType: user.isAnonymous ? 'guest' as const : 'customer' as const, replay: false };
  });
}
export async function submitOrderSlip(order: StoreOrder, file: File) {
  const { db: firestore, storage: bucket, auth: firebaseAuth } = services();
  if (firebaseAuth.currentUser?.uid !== order.ownerUid || order.status !== 'pending_payment' || order.payment?.method !== 'manual_promptpay') throw new Error('ออเดอร์นี้ยังไม่เปิดรับสลิป');
  if (file.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('ใช้รูป JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB');
  const path = `orders/${order.id}/slip`;
  await uploadBytes(ref(bucket, path), file, { contentType: file.type });
  await updateDoc(doc(firestore, 'orders', order.id), {
    status: 'awaiting_review', slipPath: path, submittedAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
}
export async function loadOrderSlip(order: StoreOrder): Promise<Blob> {
  if (!order.slipPath) throw new Error('ยังไม่มีสลิป');
  return getBlob(ref(services().storage, order.slipPath));
}
export async function reviewOrder(orderId: string, action: 'approved' | 'cancelled', reason = '') {
  const { db: firestore, auth: firebaseAuth } = services();
  const adminUid = firebaseAuth.currentUser?.uid;
  if (!adminUid) throw new Error('กรุณาเข้าสู่ระบบแอดมิน');
  const orderRef = doc(firestore, 'orders', orderId);
  await runTransaction(firestore, async (tx) => {
    const snapshot = await tx.get(orderRef);
    if (!snapshot.exists()) throw new Error('ไม่พบออเดอร์');
    const order = { id: snapshot.id, ...snapshot.data() } as StoreOrder;
    if (order.schemaVersion !== 2) throw new Error('ออเดอร์รุ่นเดิมต้องจัดการแยกจากระบบใหม่');
    if (order.status === 'paid' || order.status === 'cancelled') return;
    if (action === 'approved') {
      const isCodCollection = order.payment?.method === 'cod' && order.status === 'pending_payment';
      if (!isCodCollection && (order.status !== 'awaiting_review' || !order.slipPath)) throw new Error('ต้องมีสลิปให้ตรวจสอบก่อนอนุมัติ');
      const customerRef = order.ownerType === 'customer' ? doc(firestore, 'users', order.ownerUid) : null;
      const customer = customerRef ? await tx.get(customerRef) : null;
      if (customerRef && customer?.exists()) {
        const profile = customer.data();
        const completedOrderCount = Number(profile.completedOrderCount ?? 0) + 1;
        const lifetimeSpend = Number(profile.lifetimeSpend ?? 0) + order.subtotalSatang / 100;
        const calculated = calculateMembershipTier(completedOrderCount, lifetimeSpend);
        const previous = (profile.membershipTier ?? 'classic') as MembershipTier;
        tx.update(customerRef, { completedOrderCount, lifetimeSpend,
          membershipTier: getTierRank(calculated) > getTierRank(previous) ? calculated : previous,
          updatedAt: serverTimestamp() });
      }
      tx.update(orderRef, { status: 'paid', 'payment.status': 'successful',
        review: { by: adminUid, at: serverTimestamp(), result: action, reason: '' }, updatedAt: serverTimestamp() });
      return;
    }
    const refs = order.items.map((line) => optionRef(firestore, line.productId, line.variantId));
    const stock = await Promise.all(refs.map((item) => tx.get(item)));
    if (stock.some((item) => !item.exists())) throw new Error('ไม่พบสต็อกสำหรับคืนสินค้า');
    refs.forEach((item, index) => tx.update(item, { available: Number(stock[index].data()?.available ?? 0) + order.items[index].quantity, lastOrderId: orderId }));
    tx.update(orderRef, { status: 'cancelled', 'payment.status': 'cancelled', inventoryRestored: true,
      review: { by: adminUid, at: serverTimestamp(), result: action, reason: reason.trim() }, updatedAt: serverTimestamp() });
  });
}
export async function getOrder(orderId: string): Promise<StoreOrder | null> {
  const snapshot = await getDoc(doc(services().db, 'orders', orderId));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as StoreOrder : null;
}
function newestFirst(orders: StoreOrder[]) {
  return orders.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
}
export async function listMyOrders(): Promise<StoreOrder[]> {
  const { auth: firebaseAuth, db: firestore } = services();
  const user = firebaseAuth.currentUser;
  if (!user || user.isAnonymous) return [];
  const snapshot = await getDocs(query(collection(firestore, 'orders'), where('ownerUid', '==', user.uid)));
  return newestFirst(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as StoreOrder)));
}
export async function listAdminOrders(): Promise<StoreOrder[]> {
  const snapshot = await getDocs(collection(services().db, 'orders'));
  return newestFirst(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as StoreOrder)));
}
