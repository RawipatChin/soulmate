import assert from 'node:assert/strict';
import test from 'node:test';
import { assessCartItem } from './cartAvailability.ts';
import type { Product } from '../types/product';
import type { StorefrontCartItem } from './cartService';
import { addCartItem, clearCart, getCartSnapshot } from './cartService.ts';

const product = (changes: Partial<Product> = {}): Product => ({
  id: 'tea', name: 'Tea', slug: 'tea', shortDescription: '', description: '',
  categoryId: null, price: 120, compareAtPrice: null, stock: 5,
  status: 'active', images: [], hasVariants: false, createdAt: null,
  updatedAt: null, ...changes,
});
const item = (changes: Partial<StorefrontCartItem> = {}): StorefrontCartItem => ({
  id: 'tea::base', productId: 'tea', productName: 'Tea', variantId: null,
  variantName: null, unitPrice: 120, quantity: 2, productImage: null,
  ...changes,
});

test('cart reports missing and unpublished products as unavailable', () => {
  assert.equal(assessCartItem(item(), null).status, 'unavailable');
  assert.equal(assessCartItem(item(), product({ status: 'draft' })).status, 'unavailable');
});

test('cart reports changed price and insufficient stock for correction', () => {
  assert.equal(assessCartItem(item(), product({ price: 150 })).status, 'changed');
  assert.equal(assessCartItem(item(), product({ stock: 1 })).status, 'changed');
});

test('cart validates the exact selected option', () => {
  const selected = item({ id: 'tea::large', variantId: 'large', unitPrice: 160 });
  const variant = { id: 'large', displayName: 'Large', options: [], price: 160,
    stock: 4, sku: '', imageURL: null, active: true };
  assert.equal(assessCartItem(selected, product({ hasVariants: true, variants: [variant] })).status, 'available');
  assert.equal(assessCartItem(selected, product({ hasVariants: true, variants: [{ ...variant, active: false }] })).status, 'unavailable');
  assert.equal(assessCartItem(item(), product({ hasVariants: true, variants: [variant] })).status, 'unavailable');
});

test('repeated adds cannot exceed available stock', () => {
  clearCart();
  const input = { productId: 'tea', productName: 'Tea', unitPrice: 120, availableStock: 2 };
  addCartItem(input);
  addCartItem(input);
  assert.throws(() => addCartItem(input), /เกินสต็อก/);
  assert.equal(getCartSnapshot().itemCount, 2);
  clearCart();
});
