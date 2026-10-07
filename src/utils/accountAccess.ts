import type { CustomerProfile } from '../types/customer';

export function hasActiveAccount(profile: CustomerProfile | null): boolean {
  return profile?.status === 'active';
}

export function canAccessAdmin(profile: CustomerProfile | null): boolean {
  return hasActiveAccount(profile) &&
    (profile?.role === 'admin' || profile?.role === 'super_admin');
}

const customerDestinations = new Set([
  '/account',
  '/account/profile',
  '/account/addresses',
  '/account/wishlist',
]);

export function customerReturnPath(value: unknown): string {
  if (typeof value !== 'string') return '/account';
  if (customerDestinations.has(value)) return value;
  if (value === '/account/orders' || /^\/account\/orders\/[a-zA-Z0-9_-]+$/.test(value)) {
    return value;
  }
  return '/account';
}
