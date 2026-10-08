import assert from 'node:assert/strict';
import test from 'node:test';
import { orderFailureCode, orderFailureMessage } from './orderFailure.ts';

test('an opaque callable internal error has an actionable checkout message', () => {
  const error = { code: 'functions/internal', message: 'internal[0]' };
  assert.equal(orderFailureCode(error), 'functions/internal');
  assert.match(orderFailureMessage(error), /บันทึกคำสั่งซื้อไม่สำเร็จ/);
  assert.doesNotMatch(orderFailureMessage(error), /internal/);
});

test('a missing checkout callable and a review error have distinct messages', () => {
  assert.match(orderFailureMessage({ code: 'functions/not-found' }), /Firebase/);
  assert.equal(
    orderFailureMessage({ code: 'functions/failed-precondition', message: 'ราคาสินค้าเปลี่ยนแล้ว' }),
    'ราคาสินค้าเปลี่ยนแล้ว',
  );
});
