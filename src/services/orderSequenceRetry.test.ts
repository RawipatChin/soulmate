import assert from 'node:assert/strict';
import test from 'node:test';
import { retryOrderSequenceConflict } from './orderSequenceRetry.ts';

test('retries a denied order once when another order advanced the sequence', async () => {
  let calls = 0;
  const result = await retryOrderSequenceConflict(async (record) => {
    calls++;
    record({ year: 2026, number: calls - 1 });
    if (calls === 1) throw Object.assign(new Error('conflict'), { code: 'permission-denied' });
    return 'saved';
  }, async () => ({ year: 2026, number: 1 }));
  assert.equal(result, 'saved');
  assert.equal(calls, 2);
});

test('does not retry a denial when the order sequence did not change', async () => {
  let calls = 0;
  await assert.rejects(retryOrderSequenceConflict(async (record) => {
    calls++;
    record({ year: 2026, number: 4 });
    throw Object.assign(new Error('rules denied'), { code: 'permission-denied' });
  }, async () => ({ year: 2026, number: 4 })), /rules denied/);
  assert.equal(calls, 1);
});

test('does not retry non-permission failures', async () => {
  let reads = 0;
  await assert.rejects(retryOrderSequenceConflict(async (record) => {
    record({ year: 2026, number: 4 });
    throw new Error('out of stock');
  }, async () => { reads++; return { year: 2026, number: 5 }; }), /out of stock/);
  assert.equal(reads, 0);
});
