import type { Product, ProductVariant } from '../types/product';

/** Resolve only the sale price explicitly assigned to a variant. */
export function resolveVariantSellingPrice(
  variant: Pick<ProductVariant, 'price' | 'compareAtPrice'>
): number {
  const regular = Number(variant.price);
  const promo = Number(variant.compareAtPrice);
  return Number.isFinite(promo) && Number(promo) > 0 && Number(promo) < regular
    ? Number(promo)
    : regular;
}

export function resolveProductSellingPrice(product: Pick<Product, 'price' | 'compareAtPrice'>): number {
  const regular = Number(product.price);
  const promo = Number(product.compareAtPrice);
  return Number.isFinite(promo) && promo > 0 && promo < regular ? promo : regular;
}
