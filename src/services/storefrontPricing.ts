import type { Product, ProductVariant } from '../types/product';

export interface StorefrontPricing {
  regularPrice: number;
  specialPrice: number | null;
  sellingPrice: number;
  hasSpecialPrice: boolean;
}

export function resolveStorefrontPricing(
  source: { price?: number; regularPrice?: number; compareAtPrice?: number | null; salePrice?: number | null },
  fallbackRegularPrice = 0,
  fallbackSpecialPrice: number | null = null
): StorefrontPricing {
  const toNumber = (value: unknown): number | null => {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const regularPrice = Math.max(0,
    toNumber(source.price) ?? toNumber(source.regularPrice) ?? toNumber(fallbackRegularPrice) ?? 0);
  const candidate = toNumber(source.compareAtPrice) ??
    toNumber(source.salePrice) ?? toNumber(fallbackSpecialPrice);
  const hasSpecialPrice = candidate !== null && candidate > 0 &&
    regularPrice > 0 && candidate < regularPrice;
  const specialPrice = hasSpecialPrice ? candidate : null;
  return { regularPrice, specialPrice, sellingPrice: specialPrice ?? regularPrice, hasSpecialPrice };
}

export function resolveProductSelectionPricing(
  product: Product,
  variant?: ProductVariant | null
): StorefrontPricing {
  const base = resolveStorefrontPricing(product);
  if (!variant) return base;
  const source = variant as ProductVariant & {
    compareAtPrice?: number | null;
    salePrice?: number | null;
  };
  const regularPrice = Number.isFinite(Number(source.price)) ? Number(source.price) : base.regularPrice;
  const explicitSpecial = source.compareAtPrice ?? source.salePrice ?? null;
  const inheritedSpecial = explicitSpecial ??
    (regularPrice === base.regularPrice ? base.specialPrice : null);
  return resolveStorefrontPricing({ price: regularPrice, compareAtPrice: inheritedSpecial });
}
