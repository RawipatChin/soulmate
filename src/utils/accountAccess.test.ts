import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccessAdmin, customerReturnPath, hasActiveAccount } from './accountAccess.ts';
import type { CustomerProfile } from '../types/customer';

const profile = (role: string, status = 'active') => ({ role, status }) as CustomerProfile;

test('only active administrator profiles can enter the admin area', () => {
  assert.equal(canAccessAdmin(profile('customer')), false);
  assert.equal(canAccessAdmin(profile('admin')), true);
  assert.equal(canAccessAdmin(profile('super_admin')), true);
  assert.equal(canAccessAdmin(profile('admin', 'suspended')), false);
  assert.equal(canAccessAdmin(null), false);
  assert.equal(hasActiveAccount(profile('customer', 'suspended')), false);
});

test('login returns only to supported account destinations', () => {
  assert.equal(customerReturnPath('/account/profile'), '/account/profile');
  assert.equal(customerReturnPath('/account/orders/order-1'), '/account/orders/order-1');
  assert.equal(customerReturnPath('//outside.example'), '/account');
  assert.equal(customerReturnPath('/admin/dashboard'), '/account');
  assert.equal(customerReturnPath('/account/orders/../../admin'), '/account');
});
