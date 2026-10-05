import type { MembershipTier } from './membership';

export interface ShippingAddress {
  firstName: string;
  lastName: string;
  phone: string;
  addressLine1: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
}

export interface CustomerProfile {
  uid: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  phone: string;
  photoURL: string | null;
  role: 'customer' | 'admin' | 'super_admin' | string;
  status: 'active' | 'suspended' | string;
  membershipTier: MembershipTier;
  completedOrderCount: number;
  lifetimeSpend: number;
  defaultShippingAddress?: ShippingAddress | null;
  createdAt?: any;
  updatedAt?: any;
}

export interface CustomerRegistrationPayload {
  firstName: string;
  lastName: string;
  phone: string;
}

export interface CustomerProfileUpdatePayload {
  firstName: string;
  lastName: string;
  phone: string;
}
