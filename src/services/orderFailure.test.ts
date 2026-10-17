import assert from 'node:assert/strict';
import test from 'node:test';
import { orderFailureCode, orderFailureMessage } from './orderFailure.ts';

test('an opaque Firebase error has an actionable checkout message', () => {
  const error = { code: 'unknown', message: 'internal[0]' };
  assert.equal(orderFailureCode(error), 'unknown');
  assert.match(orderFailureMessage(error), /บันทึกคำสั่งซื้อไม่สำเร็จ/);
  assert.doesNotMatch(orderFailureMessage(error), /internal/);
});

test('a denied transaction and a review error have distinct messages', () => {
  assert.match(orderFailureMessage({ code: 'permission-denied' }), /ราคาและสต็อก/);
  assert.equal(
    orderFailureMessage({ code: 'failed-precondition', message: 'ราคาสินค้าเปลี่ยนแล้ว' }),
    'ราคาสินค้าเปลี่ยนแล้ว',
  );
});
