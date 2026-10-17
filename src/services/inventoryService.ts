import { collection, doc, getDocs, runTransaction, type Firestore } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Product, ProductVariant } from '../types';

export const MAX_ORDER_LINES = 5;
export const ORDER_SHIPPING_SATANG = 3000;

export interface SellableOption {
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  unitPriceSatang: number;
  stock: number;
  available: number;
  active: boolean;
  productImage: string | null;
  lastOrderId: string | null;
  lastOrderLine: number | null;
}

export function optionId(variantId: string | null | undefined) {
  return variantId ? `v_${variantId}` : 'base';
}

export function optionRef(firestore: Firestore, productId: string, variantId: string | null | undefined) {
  return doc(firestore, 'inventory', productId, 'options', optionId(variantId));
}

function optionData(product: Product, variant: ProductVariant | null): SellableOption {
  const stock = Number(variant?.stock ?? product.stock);
  return {
    productId: product.id,
    variantId: variant?.id ?? null,
    productName: product.name,
    variantName: variant?.displayName ?? null,
    unitPriceSatang: Math.round(Number(variant?.price ?? product.price) * 100),
    stock,
    available: stock,
    active: product.status === 'active' && (variant ? variant.active : !product.hasVariants),
    productImage: variant?.imageURL || product.primaryImageURL || product.images?.[0]?.url || null,
    lastOrderId: null,
    lastOrderLine: null,
  };
}

export function productOptions(product: Product) {
  return [optionData(product, null), ...(product.variants ?? []).map((variant) => optionData(product, variant))];
}

/** Keep the independently reserved quantity while an admin edits catalog stock. */
export async function syncProductOptions(product: Product): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');
  const firestore = db;
  const desired = productOptions(product);
  const existing = await getDocs(collection(firestore, 'inventory', product.id, 'options'));
  const oldById = new Map(existing.docs.map((item) => [item.id, item.data() as SellableOption]));
  await runTransaction(firestore, async (tx) => {
    const refs = [...new Set([...desired.map((item) => optionId(item.variantId)), ...oldById.keys()])]
      .map((id) => doc(firestore, 'inventory', product.id, 'options', id));
    const snapshots = await Promise.all(refs.map((ref) => tx.get(ref)));
    for (let index = 0; index < refs.length; index += 1) {
      const id = refs[index].id;
      const next = desired.find((item) => optionId(item.variantId) === id);
      const prior = snapshots[index].exists() ? snapshots[index].data() as SellableOption : null;
      if (!next) {
        if (prior) tx.update(refs[index], { active: false });
        continue;
      }
      const reserved = prior ? Math.max(0, prior.stock - prior.available) : 0;
      if (next.stock < reserved) throw new Error(`สต็อก ${next.productName} ต่ำกว่าจำนวนที่จองอยู่`);
      tx.set(refs[index], { ...next, available: next.stock - reserved, lastOrderId: prior?.lastOrderId ?? null, lastOrderLine: prior?.lastOrderLine ?? null });
    }
  });
}

/** Catalog and sellable options commit together so buyers never see split prices. */
export async function writeProductWithOptions(productId: string, payload: Record<string, unknown>, creating: boolean): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');
  const firestore = db;
  const productRef = doc(firestore, 'products', productId);
  const existing = await getDocs(collection(firestore, 'inventory', productId, 'options'));
  const existingIds = existing.docs.map((item) => item.id);
  await runTransaction(firestore, async (tx) => {
    const priorProduct = await tx.get(productRef);
    if (creating && priorProduct.exists()) throw new Error('รหัสสินค้านี้มีอยู่แล้ว');
    if (!creating && !priorProduct.exists()) throw new Error('ไม่พบสินค้า');
    const product = { ...(priorProduct.data() ?? {}), ...payload, id: productId } as unknown as Product;
    const desired = productOptions(product);
    const refs = [...new Set([...desired.map((item) => optionId(item.variantId)), ...existingIds])]
      .map((id) => doc(firestore, 'inventory', productId, 'options', id));
    const snapshots = await Promise.all(refs.map((ref) => tx.get(ref)));
    for (let index = 0; index < refs.length; index += 1) {
      const next = desired.find((item) => optionId(item.variantId) === refs[index].id);
      const prior = snapshots[index].exists() ? snapshots[index].data() as SellableOption : null;
      if (!next) {
        if (prior) tx.update(refs[index], { active: false });
        continue;
      }
      const reserved = prior ? Math.max(0, prior.stock - prior.available) : 0;
      if (next.stock < reserved) throw new Error(`สต็อก ${next.productName} ต่ำกว่าจำนวนที่จองอยู่`);
      tx.set(refs[index], { ...next, available: next.stock - reserved, lastOrderId: prior?.lastOrderId ?? null, lastOrderLine: prior?.lastOrderLine ?? null });
    }
    if (creating) tx.set(productRef, payload);
    else tx.update(productRef, payload);
  });
}

/** Run once as an admin after deploying rules, before enabling direct checkout. */
export async function backfillSellableOptions(products: Product[]): Promise<number> {
  let prepared = 0;
  for (const product of products) {
    await syncProductOptions(product);
    prepared += 1;
  }
  return prepared;
}
