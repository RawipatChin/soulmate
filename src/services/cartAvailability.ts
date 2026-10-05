import type { Product } from '../types/product';
import type { StorefrontCartItem } from './cartService';
import { resolveProductSelectionPricing } from './storefrontPricing.ts';

export interface CartItemAssessment {
  status: 'available' | 'changed' | 'unavailable';
  reason: 'price' | 'stock' | 'unavailable' | null;
  message: string;
  currentPrice: number | null;
  currentStock: number;
}

export function hasAvailableProductOption(product: Product): boolean {
  if (product.status !== 'active') return false;
  return product.hasVariants
    ? Boolean(product.variants?.some((variant) => variant.active !== false && variant.stock > 0))
    : product.stock > 0;
}

export function assessCartItem(
  item: StorefrontCartItem,
  product: Product | null
): CartItemAssessment {
  const unavailable = (message: string): CartItemAssessment => ({
    status: 'unavailable', reason: 'unavailable', message, currentPrice: null, currentStock: 0,
  });
  if (!product || product.status !== 'active') {
    return unavailable('สินค้านี้ไม่วางจำหน่ายแล้ว');
  }

  const variant = item.variantId
    ? product.variants?.find((option) => option.id === item.variantId)
    : null;
  if (product.hasVariants && (!variant || variant.active === false)) {
    return unavailable('ตัวเลือกนี้ไม่วางจำหน่ายแล้ว กรุณาเลือกใหม่');
  }
  if (!product.hasVariants && item.variantId) {
    return unavailable('ตัวเลือกสินค้าเปลี่ยนไป กรุณาเลือกใหม่');
  }

  const stock = Math.max(0, Number(variant ? variant.stock : product.stock) || 0);
  if (stock === 0) return unavailable('สินค้านี้หมดสต็อก');

  const currentPrice = resolveProductSelectionPricing(product, variant).sellingPrice;
  if (item.quantity > stock) {
    return { status: 'changed', reason: 'stock', message: `เหลือสินค้า ${stock} ชิ้น กรุณาปรับจำนวน`, currentPrice, currentStock: stock };
  }
  if (item.unitPrice !== currentPrice) {
    return { status: 'changed', reason: 'price', message: `ราคาเปลี่ยนเป็น ฿${currentPrice.toLocaleString('th-TH')} กรุณาตรวจสอบสินค้าอีกครั้ง`, currentPrice, currentStock: stock };
  }
  return { status: 'available', reason: null, message: '', currentPrice, currentStock: stock };
}
