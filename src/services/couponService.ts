import { collection, deleteDoc, doc, getDoc, getDocs, runTransaction, serverTimestamp, setDoc, updateDoc, type Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Coupon {
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  maxDiscountSatang: number | null;
  minSubtotalSatang: number;
  startsAt: Timestamp;
  endsAt: Timestamp;
  active: boolean;
  usageLimit: number | null;
  usedCount: number;
  everUsed?: boolean;
}
export type CouponInput = Omit<Coupon, 'usedCount' | 'everUsed'>;
const firestore = () => { if (!db) throw new Error('ยังไม่ได้ตั้งค่า Firebase'); return db; };
export const normalizeCouponCode = (code: string) => code.trim().toUpperCase();
export function couponDiscount(coupon: Coupon, subtotalSatang: number, now = new Date()): number {
  if (!coupon.active || coupon.startsAt.toDate() > now || coupon.endsAt.toDate() < now) throw new Error('คูปองยังไม่เปิดใช้หรือหมดอายุแล้ว');
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) throw new Error('คูปองถูกใช้ครบแล้ว');
  if (subtotalSatang < coupon.minSubtotalSatang) throw new Error('เงื่อนไขไม่ตรงกับการใช้งาน');
  const raw = coupon.type === 'percent' ? Math.floor(subtotalSatang * coupon.value / 100) : coupon.value;
  return Math.min(subtotalSatang, raw, coupon.maxDiscountSatang ?? subtotalSatang);
}
export async function listCoupons(): Promise<Coupon[]> {
  return (await getDocs(collection(firestore(), 'coupons'))).docs.map((item) => item.data() as Coupon);
}
export async function getCoupon(code: string): Promise<Coupon | null> {
  const snapshot = await getDoc(doc(firestore(), 'coupons', normalizeCouponCode(code)));
  return snapshot.exists() ? snapshot.data() as Coupon : null;
}
export async function saveCoupon(input: CouponInput): Promise<void> {
  const code = normalizeCouponCode(input.code);
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) throw new Error('รหัสคูปองต้องมี 3–32 ตัว ใช้ A–Z, 0–9, _ หรือ -');
  if (!Number.isInteger(input.value) || input.value <= 0 || (input.type === 'percent' && input.value > 100)) throw new Error('ส่วนลดไม่ถูกต้อง');
  if (!Number.isInteger(input.minSubtotalSatang) || input.minSubtotalSatang < 0 ||
      (input.maxDiscountSatang != null && (!Number.isInteger(input.maxDiscountSatang) || input.maxDiscountSatang <= 0)) ||
      (input.usageLimit != null && (!Number.isInteger(input.usageLimit) || input.usageLimit < 1))) throw new Error('เงื่อนไขคูปองไม่ถูกต้อง');
  if (input.endsAt.toMillis() <= input.startsAt.toMillis()) throw new Error('วันสิ้นสุดต้องอยู่หลังวันเริ่ม');
  const ref = doc(firestore(), 'coupons', code);
  await runTransaction(firestore(), async (tx) => {
    const prior = await tx.get(ref);
    if (prior.exists() && prior.data().everUsed === true) {
      const old = prior.data() as Coupon;
      for (const field of ['type', 'value', 'maxDiscountSatang', 'minSubtotalSatang', 'startsAt', 'endsAt', 'usageLimit'] as const) {
        const a = old[field]; const b = input[field];
        if (a instanceof Object && 'toMillis' in a ? (a as Timestamp).toMillis() !== (b as Timestamp).toMillis() : a !== b) throw new Error('คูปองที่มีการใช้แล้วแก้ไขเงื่อนไขไม่ได้');
      }
    }
    tx.set(ref, { ...input, code, usedCount: Number(prior.data()?.usedCount ?? 0), everUsed: prior.data()?.everUsed === true, updatedAt: serverTimestamp() }, { merge: true });
  });
}
export async function setCouponActive(code: string, active: boolean): Promise<void> {
  await updateDoc(doc(firestore(), 'coupons', normalizeCouponCode(code)), { active, updatedAt: serverTimestamp() });
}
export async function deleteCoupon(code: string): Promise<void> {
  const ref = doc(firestore(), 'coupons', normalizeCouponCode(code));
  const prior = await getDoc(ref);
  if (prior.data()?.everUsed === true) throw new Error('คูปองที่ใช้แล้วลบไม่ได้ ให้ปิดใช้งานแทน');
  await deleteDoc(ref);
}
