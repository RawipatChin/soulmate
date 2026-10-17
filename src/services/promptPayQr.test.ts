import assert from 'node:assert/strict';
import test from 'node:test';
import { promptPayPayload } from './promptPayQr.ts';

test('PromptPay QR encodes recipient and exact order amount', () => {
  const payload = promptPayPayload('0812345678', 15950);
  assert.match(payload, /29370016A00000067701011101130066812345678/);
  assert.match(payload, /5303764/);
  assert.match(payload, /5406159\.50/);
  assert.match(payload, /6304[0-9A-F]{4}$/);
  assert.notEqual(promptPayPayload('0812345678', 15951), payload);
});

test('PromptPay QR rejects unsafe recipient and amount', () => {
  assert.throws(() => promptPayPayload('123', 15950));
  assert.throws(() => promptPayPayload('0812345678', 0));
});
