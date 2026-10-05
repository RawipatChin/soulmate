/**
 * SOULMATE E-COMMERCE
 * STEP 20.3A — Membership Tier Types & Data Model Foundation
 * 
 * Version 1 Permanent Tier Rules (OR logic):
 * A customer qualifies for a tier when they satisfy EITHER
 * the completed-order requirement OR the lifetime-spend requirement.
 * 
 * 1. Classic:   0 orders  OR  ฿0 spend
 * 2. Silver:    3 orders  OR  ฿3,000 spend
 * 3. Gold:      8 orders  OR  ฿10,000 spend
 * 4. Platinum: 15 orders  OR  ฿25,000 spend
 */

export type MembershipTier = 'classic' | 'silver' | 'gold' | 'platinum';

/**
 * Future Firestore customer membership document / sub-object schema
 * To be stored under customer profile in Firestore (Step 21+)
 */
export interface CustomerMembership {
  /** Current qualification level */
  membershipTier: MembershipTier;
  /** Count of orders strictly in 'สำเร็จ' status */
  completedOrderCount: number;
  /** Net product spending after discounts/coupons, excluding shipping fees */
  lifetimeSpend: number;
  /** Timestamp when tier was last upgraded or calculated */
  tierUpdatedAt?: string | number | Date | null;
}

export interface TierThresholdConfig {
  tier: MembershipTier;
  nameEn: string;
  nameTh: string;
  minOrders: number;
  minSpend: number;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  icon: string;
  descriptionTh: string;
}

export interface MembershipProgressResult {
  currentTier: MembershipTier;
  currentTierConfig: TierThresholdConfig;
  completedOrderCount: number;
  lifetimeSpend: number;
  nextTier: MembershipTier | null;
  nextTierConfig: TierThresholdConfig | null;
  isMaxTier: boolean;
  targetOrders: number;
  targetSpend: number;
  remainingOrders: number;
  remainingSpend: number;
  ordersProgressPercent: number; // 0 - 100
  spendProgressPercent: number; // 0 - 100
  ordersAchieved: boolean;
  spendAchieved: boolean;
  progressMessage: string;
}
