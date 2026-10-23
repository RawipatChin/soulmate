import test from 'node:test';
import assert from 'node:assert/strict';
import { computeCartesianCombinations } from './productVariantManager.ts';
import { resolveVariantSellingPrice } from './productPricing.ts';
import type { OptionGroup, ProductVariant } from '../types/product';

test('generated variants keep separate identities when saved IDs collide', () => {
  const groups: OptionGroup[] = [{
    id: 'size',
    name: 'Size',
    values: [{ id: 'small', name: 'Small' }, { id: 'large', name: 'Large' }],
  }];
  const variant = (valueId: string, valueName: string, price: number): ProductVariant => ({
    id: 'duplicate-id',
    options: [{ groupId: 'size', groupName: 'Size', valueId, valueName }],
    displayName: valueName,
    price,
    stock: 1,
    sku: valueId,
    imageURL: null,
    active: true,
  });

  const result = computeCartesianCombinations(groups, [
    { ...variant('small', 'Small', 10), compareAtPrice: 8 },
    variant('large', 'Large', 20),
  ]);

  assert.equal(result.length, 2);
  assert.notEqual(result[0].id, result[1].id);
  assert.deepEqual(result.map((item) => item.price), [10, 20]);
  assert.deepEqual(result.map((item) => item.compareAtPrice), [8, null]);
  assert.deepEqual(
    computeCartesianCombinations(groups, result).map((item) => item.id),
    result.map((item) => item.id),
  );
});

test('variant sale price applies only when explicitly set on that variant', () => {
  assert.equal(resolveVariantSellingPrice({ price: 379, compareAtPrice: null }), 379);
  assert.equal(resolveVariantSellingPrice({ price: 629, compareAtPrice: 599 }), 599);
  assert.equal(resolveVariantSellingPrice({ price: 629, compareAtPrice: 700 }), 629);
});
