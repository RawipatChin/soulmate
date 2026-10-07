import assert from 'node:assert/strict';
import test from 'node:test';
import { findPriceChanges, inventoryChanges, priceOrderItems } from './order-domain.ts';

test('a guest order prices the catalog items and adds one 30 baht shipping fee', () => {
  const priced = priceOrderItems(
    [{ productId: 'tea', quantity: 2 }],
    [{
      id: 'tea',
      name: 'Herbal tea',
      status: 'active',
      price: 129.5,
      stock: 4,
      images: [],
    }]
  );

  assert.deepEqual(priced, {
    items: [{
      productId: 'tea',
      productName: 'Herbal tea',
      variantId: null,
      variantName: null,
      unitPriceSatang: 12950,
      quantity: 2,
      productImage: null,
      lineTotalSatang: 25900,
    }],
    subtotalSatang: 25900,
    shippingFeeSatang: 3000,
    totalSatang: 28900,
    reservations: [{ productId: 'tea', variantId: null, quantity: 2 }],
  });
});

test('client supplied price is not part of the order input and inactive or short-stock products are rejected', () => {
  assert.throws(
    () => priceOrderItems([{ productId: 'tea', quantity: 1 }], [{
      id: 'tea', name: 'Herbal tea', status: 'draft', price: 129.5, stock: 4,
    }]),
    /no longer available/i
  );
  assert.throws(
    () => priceOrderItems([{ productId: 'tea', quantity: 5 }], [{
      id: 'tea', name: 'Herbal tea', status: 'active', price: 129.5, stock: 4,
    }]),
    /not enough stock/i
  );
});

test('a changed catalog price must be reviewed and client price never changes the server total', () => {
  const lines = [{ productId: 'tea', quantity: 1, expectedPriceSatang: 1 }];
  const priced = priceOrderItems(lines, [{ id: 'tea', name: 'Herbal tea', status: 'active', price: 129.5, stock: 4 }]);
  assert.equal(priced.items[0].unitPriceSatang, 12950);
  assert.equal(priced.totalSatang, 15950);
  assert.equal(findPriceChanges(priced, lines).length, 1);
  assert.equal(findPriceChanges(priced, [{ ...lines[0], expectedPriceSatang: 12950 }]).length, 0);
});

test('inventory changes aggregate selected variants and can be reversed exactly', () => {
  const product = {
    id: 'tea', name: 'Herbal tea', status: 'active', price: 129.5, stock: 8,
    variants: [
      { id: 'small', displayName: 'Small', price: 129.5, stock: 5, active: true },
      { id: 'large', displayName: 'Large', price: 199, stock: 3, active: true },
    ],
  };
  const lines = [
    { productId: 'tea', variantId: 'small', quantity: 2 },
    { productId: 'tea', variantId: 'large', quantity: 1 },
  ];
  const reserved = inventoryChanges(product, lines, -1);
  assert.deepEqual(reserved.variants?.map(({ stock }) => stock), [3, 2]);
  const restored = inventoryChanges({ ...product, ...reserved }, lines, 1);
  assert.deepEqual(restored.variants?.map(({ stock }) => stock), [5, 3]);
});
