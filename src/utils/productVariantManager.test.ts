import test from 'node:test';
import assert from 'node:assert/strict';
import { computeCartesianCombinations } from './productVariantManager.ts';
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
    variant('small', 'Small', 10),
    variant('large', 'Large', 20),
  ]);

  assert.equal(result.length, 2);
  assert.notEqual(result[0].id, result[1].id);
  assert.deepEqual(result.map((item) => item.price), [10, 20]);
  assert.deepEqual(
    computeCartesianCombinations(groups, result).map((item) => item.id),
    result.map((item) => item.id),
  );
});
