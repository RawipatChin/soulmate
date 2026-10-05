/**
 * SOULMATE E-COMMERCE
 * STEP 20.3A — Reusable Membership Tier Calculation Utility
 * 
 * Rules:
 * - OR logic: Customer qualifies when they satisfy EITHER completedOrderCount OR lifetimeSpend.
 * - Evaluation checks highest qualified tier first:
 *   if completedOrderCount >= 15 || lifetimeSpend >= 25000 -> platinum
 *   else if completedOrderCount >= 8 || lifetimeSpend >= 10000 -> gold
 *   else if completedOrderCount >= 3 || lifetimeSpend >= 3000 -> silver
 *   else -> classic
 * - Completed orders must strictly have status === 'สำเร็จ'.
 * - Lifetime spend is net product amount after discounts, excluding shipping.
 * - Permanent upgrades: No automatic downgrade in Version 1.
 */

import {
  MembershipTier,
  TierThresholdConfig,
  MembershipProgressResult,
  CustomerMembership,
} from '../types/membership';

export const COMPLETED_ORDER_STATUS = 'สำเร็จ';

/**
 * Version 1 Tier Threshold Configurations
 * Visual identity:
 * - Classic: neutral / clean
 * - Silver: silver / light gray accent
 * - Gold: gold accent
 * - Platinum: premium dark / platinum accent
 */
export const TIER_CONFIGS: Record<MembershipTier, TierThresholdConfig> = {
  classic: {
    tier: 'classic',
    nameEn: 'Classic',
    nameTh: 'คลาสสิก',
    minOrders: 0,
    minSpend: 0,
    badgeBg: 'bg-surface-container-low',
    badgeText: 'text-primary',
    badgeBorder: 'border-primary/20',
    icon: 'eco',
    descriptionTh: 'สมาชิกเริ่มต้น เข้าถึงสิทธิประโยชน์พื้นฐานของ SOULMATE',
  },
  silver: {
    tier: 'silver',
    nameEn: 'Silver',
    nameTh: 'ซิลเวอร์',
    minOrders: 3,
    minSpend: 3000,
    badgeBg: 'bg-slate-100 dark:bg-slate-800',
    badgeText: 'text-slate-700 dark:text-slate-200',
    badgeBorder: 'border-slate-300 dark:border-slate-600',
    icon: 'workspace_premium',
    descriptionTh: 'สำเร็จ 3 คำสั่งซื้อ หรือยอดสะสม ฿3,000 ขึ้นไป',
  },
  gold: {
    tier: 'gold',
    nameEn: 'Gold',
    nameTh: 'โกลด์',
    minOrders: 8,
    minSpend: 10000,
    badgeBg: 'bg-amber-50 dark:bg-amber-950/60',
    badgeText: 'text-amber-800 dark:text-amber-300',
    badgeBorder: 'border-amber-300/80 dark:border-amber-700/80',
    icon: 'stars',
    descriptionTh: 'สำเร็จ 8 คำสั่งซื้อ หรือยอดสะสม ฿10,000 ขึ้นไป',
  },
  platinum: {
    tier: 'platinum',
    nameEn: 'Platinum',
    nameTh: 'แพลทินัม',
    minOrders: 15,
    minSpend: 25000,
    badgeBg: 'bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900',
    badgeText: 'text-zinc-900 dark:text-zinc-100',
    badgeBorder: 'border-zinc-700 dark:border-zinc-300',
    icon: 'diamond',
    descriptionTh: 'ระดับสมาชิกสูงสุด สำเร็จ 15 คำสั่งซื้อ หรือยอดสะสม ฿25,000 ขึ้นไป',
  },
};

/**
 * Evaluates highest qualified tier using OR logic.
 * 
 * if completedOrderCount >= 15 || lifetimeSpend >= 25000 -> platinum
 * else if completedOrderCount >= 8 || lifetimeSpend >= 10000 -> gold
 * else if completedOrderCount >= 3 || lifetimeSpend >= 3000 -> silver
 * else -> classic
 */
export function calculateMembershipTier(
  completedOrderCount: number = 0,
  lifetimeSpend: number = 0
): MembershipTier {
  const orders = Math.max(0, Math.floor(completedOrderCount || 0));
  const spend = Math.max(0, Math.floor(lifetimeSpend || 0));

  if (orders >= 15 || spend >= 25000) {
    return 'platinum';
  } else if (orders >= 8 || spend >= 10000) {
    return 'gold';
  } else if (orders >= 3 || spend >= 3000) {
    return 'silver';
  }
  return 'classic';
}

/**
 * Returns numeric rank index: classic (0) < silver (1) < gold (2) < platinum (3)
 */
export function getTierRank(tier: MembershipTier): number {
  switch (tier) {
    case 'platinum':
      return 3;
    case 'gold':
      return 2;
    case 'silver':
      return 1;
    case 'classic':
    default:
      return 0;
  }
}

/**
 * Calculates current progress, remaining requirements toward next tier,
 * and localized messages. Respects permanent upgrade rule (never downgrades).
 */
export function getMembershipProgress(
  completedOrderCount: number = 0,
  lifetimeSpend: number = 0,
  currentStoredTier?: MembershipTier
): MembershipProgressResult {
  const orders = Math.max(0, Math.floor(completedOrderCount || 0));
  const spend = Math.max(0, Math.floor(lifetimeSpend || 0));

  // Natural calculated tier from order metrics
  const calculatedTier = calculateMembershipTier(orders, spend);

  // Permanent Upgrade Rule (Section 4 & 15):
  // Once a user reaches a tier, do not automatically downgrade them.
  let activeTier: MembershipTier = calculatedTier;
  if (currentStoredTier) {
    if (getTierRank(currentStoredTier) > getTierRank(calculatedTier)) {
      activeTier = currentStoredTier;
    }
  }

  const currentTierConfig = TIER_CONFIGS[activeTier];

  // Platinum is the maximum tier
  if (activeTier === 'platinum') {
    return {
      currentTier: 'platinum',
      currentTierConfig,
      completedOrderCount: orders,
      lifetimeSpend: spend,
      nextTier: null,
      nextTierConfig: null,
      isMaxTier: true,
      targetOrders: 15,
      targetSpend: 25000,
      remainingOrders: 0,
      remainingSpend: 0,
      ordersProgressPercent: 100,
      spendProgressPercent: 100,
      ordersAchieved: true,
      spendAchieved: true,
      progressMessage: 'คุณอยู่ในระดับสมาชิกสูงสุดแล้ว',
    };
  }

  // Next target tier definition
  const nextTier: MembershipTier =
    activeTier === 'classic' ? 'silver' : activeTier === 'silver' ? 'gold' : 'platinum';
  const nextTierConfig = TIER_CONFIGS[nextTier];

  const targetOrders = nextTierConfig.minOrders;
  const targetSpend = nextTierConfig.minSpend;

  const remainingOrders = Math.max(0, targetOrders - orders);
  const remainingSpend = Math.max(0, targetSpend - spend);

  const ordersAchieved = remainingOrders === 0;
  const spendAchieved = remainingSpend === 0;

  const ordersProgressPercent = Math.min(100, Math.round((orders / targetOrders) * 100));
  const spendProgressPercent = Math.min(100, Math.round((spend / targetSpend) * 100));

  // Dynamic progress message rule (Step 20.3A OR logic):
  // Because either requirement qualifies the customer, display:
  // "ทำอย่างใดอย่างหนึ่งเพื่อขึ้น {NextTier}"
  const progressMessage = `ทำอย่างใดอย่างหนึ่งเพื่อขึ้น ${nextTierConfig.nameEn}`;

  return {
    currentTier: activeTier,
    currentTierConfig,
    completedOrderCount: orders,
    lifetimeSpend: spend,
    nextTier,
    nextTierConfig,
    isMaxTier: false,
    targetOrders,
    targetSpend,
    remainingOrders,
    remainingSpend,
    ordersProgressPercent,
    spendProgressPercent,
    ordersAchieved,
    spendAchieved,
    progressMessage,
  };
}

/**
 * STEP 20.3 & STEP 21 Architecture Hook:
 * Filter rule for order status aggregation.
 * Only orders whose status is strictly 'สำเร็จ' qualify.
 */
export function isOrderCompletedForTier(orderStatus: string): boolean {
  if (!orderStatus) return false;
  return orderStatus.trim() === COMPLETED_ORDER_STATUS;
}

/**
 * Calculates net spend for an order:
 * Net product amount actually completed by customer AFTER discounts/coupons
 * EXCLUDING shipping fees.
 */
export function calculateOrderNetProductSpend(order: {
  subtotal?: number;
  discountTotal?: number;
  shippingFee?: number;
  status?: string;
}): number {
  if (!order || !isOrderCompletedForTier(order.status || '')) {
    return 0;
  }
  const subtotal = Math.max(0, order.subtotal || 0);
  const discount = Math.max(0, order.discountTotal || 0);
  return Math.max(0, subtotal - discount);
}

/**
 * Recalculates membership state given order history.
 * Permanent upgrade pattern: never returns a lower tier than currentTier.
 */
export function evaluateCustomerMembership(
  orders: Array<{
    status: string;
    subtotal?: number;
    discountTotal?: number;
  }>,
  currentStoredTier?: MembershipTier
): CustomerMembership {
  const completedOrders = orders.filter((o) => isOrderCompletedForTier(o.status));
  const completedOrderCount = completedOrders.length;
  const lifetimeSpend = completedOrders.reduce((sum, o) => {
    return sum + calculateOrderNetProductSpend(o);
  }, 0);

  const calculatedTier = calculateMembershipTier(completedOrderCount, lifetimeSpend);

  // Preserve permanent higher tier
  let finalTier = calculatedTier;
  if (currentStoredTier && getTierRank(currentStoredTier) > getTierRank(calculatedTier)) {
    finalTier = currentStoredTier;
  }

  return {
    membershipTier: finalTier,
    completedOrderCount,
    lifetimeSpend,
    tierUpdatedAt: new Date().toISOString(),
  };
}
