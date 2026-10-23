import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeFlashSaleLink } from './flashSaleService.ts';

test('Flash Sale links must stay inside the storefront', () => {
  assert.equal(normalizeFlashSaleLink('/products'), '/products');
  assert.equal(normalizeFlashSaleLink('/products/protein-1?variant=large'), '/products/protein-1?variant=large');
  assert.throws(() => normalizeFlashSaleLink('https://example.com'), /เส้นทางภายในร้าน/);
  assert.throws(() => normalizeFlashSaleLink('//example.com'), /เส้นทางภายในร้าน/);
  assert.throws(() => normalizeFlashSaleLink('/products/ชื่อสินค้า'), /เส้นทางภายในร้าน/);
});
