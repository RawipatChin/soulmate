import assert from 'node:assert/strict';
import test from 'node:test';
import { formatOrderNumber, getBangkokOrderYear } from './orderNumber.ts';

test('sequential order numbers include the Bangkok calendar year and pad at least four digits', () => {
  assert.equal(formatOrderNumber(2026, 1), 'SM-20260001');
  assert.equal(formatOrderNumber(2026, 9999), 'SM-20269999');
  assert.equal(formatOrderNumber(2026, 10000), 'SM-202610000');
});

test('the annual sequence year follows Asia/Bangkok across UTC year boundaries', () => {
  assert.equal(getBangkokOrderYear(new Date('2026-12-31T16:59:59.000Z')), 2026);
  assert.equal(getBangkokOrderYear(new Date('2026-12-31T17:00:00.000Z')), 2027);
});

test('invalid sequence values are rejected before an order number is generated', () => {
  assert.throws(() => formatOrderNumber(2026, 0), /จำนวนเต็มบวก/);
  assert.throws(() => formatOrderNumber(20, 1), /ปี/);
});
