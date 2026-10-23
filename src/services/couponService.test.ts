import test from 'node:test';
import assert from 'node:assert/strict';
import { Timestamp } from 'firebase/firestore';
import { couponDiscount, type Coupon } from './couponService.ts';

const coupon: Coupon = {
  code: 'SAVE10', type: 'percent', value: 10, maxDiscountSatang: 5000,
  minSubtotalSatang: 10000, startsAt: Timestamp.fromDate(new Date('2026-01-01')),
  endsAt: Timestamp.fromDate(new Date('2027-01-01')), active: true,
  usageLimit: 2, usedCount: 0,
};
const now = new Date('2026-10-24');
test('percentage discount uses subtotal and respects cap', () => {
  assert.equal(couponDiscount(coupon, 20000, now), 2000);
  assert.equal(couponDiscount(coupon, 100000, now), 5000);
});
test('fixed discount cannot exceed item subtotal', () => {
  assert.equal(couponDiscount({ ...coupon, type: 'fixed', value: 20000, maxDiscountSatang: null }, 10000, now), 10000);
});
test('quota, minimum, status and dates reject redemption', () => {
  assert.throws(() => couponDiscount({ ...coupon, usedCount: 2 }, 20000, now));
  assert.throws(() => couponDiscount(coupon, 9999, now), { message: 'เงื่อนไขไม่ตรงกับการใช้งาน' });
  assert.throws(() => couponDiscount({ ...coupon, active: false }, 20000, now));
  assert.throws(() => couponDiscount(coupon, 20000, new Date('2027-02-01')));
});
