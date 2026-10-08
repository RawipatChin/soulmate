export interface OrderLineRequest {
  productId: string;
  variantId?: string | null;
  quantity: number;
  expectedPriceSatang?: number;
}

export interface CatalogProduct {
  id: string;
  name: string;
  status: string;
  price: number;
  stock: number;
  images?: Array<{ url?: string }>;
  variants?: Array<{
    id: string;
    displayName: string;
    price: number;
    stock: number;
    active: boolean;
    imageURL?: string | null;
  }>;
}

export interface InventoryLine {
  productId: string;
  variantId: string | null;
  quantity: number;
}

export const ORDER_HOLD_MILLISECONDS = 30 * 60 * 1000;

export function getOrderExpiryTime(createdAtMilliseconds: number) {
  return createdAtMilliseconds + ORDER_HOLD_MILLISECONDS;
}

export function isOrderPastExpiry(expiresAtMilliseconds: number, nowMilliseconds: number) {
  return expiresAtMilliseconds <= nowMilliseconds;
}

export function getPaymentReferenceId(orderId: string) {
  return `soulmate-${orderId}`;
}

export function getChargeOutcome(status: string): 'paid' | 'failed' | 'expired' | 'pending' {
  if (status === 'successful') return 'paid';
  if (status === 'failed') return 'failed';
  if (status === 'expired') return 'expired';
  return 'pending';
}

export function inventoryChanges(
  product: CatalogProduct,
  lines: InventoryLine[],
  direction: 1 | -1
): { stock?: number; variants?: CatalogProduct['variants'] } {
  const productLines = lines.filter((line) => line.productId === product.id);
  const baseQuantity = productLines
    .filter((line) => !line.variantId)
    .reduce((sum, line) => sum + line.quantity, 0);
  const variantQuantities = new Map<string, number>();
  productLines.filter((line) => line.variantId).forEach((line) => {
    const id = line.variantId!;
    variantQuantities.set(id, (variantQuantities.get(id) ?? 0) + line.quantity);
  });
  return {
    ...(baseQuantity ? { stock: product.stock + direction * baseQuantity } : {}),
    ...(variantQuantities.size ? {
      variants: (product.variants ?? []).map((variant) => ({
        ...variant,
        stock: variant.stock + direction * (variantQuantities.get(variant.id) ?? 0),
      })),
    } : {}),
  };
}

export interface PricedOrder {
  items: Array<{
    productId: string;
    productName: string;
    variantId: string | null;
    variantName: string | null;
    unitPriceSatang: number;
    quantity: number;
    productImage: string | null;
    lineTotalSatang: number;
  }>;
  subtotalSatang: number;
  shippingFeeSatang: number;
  totalSatang: number;
  reservations: Array<{ productId: string; variantId: string | null; quantity: number }>;
}

export function findPriceChanges(priced: PricedOrder, requested: OrderLineRequest[]) {
  const expectedPrices = new Map(requested.map((line) => [
    `${line.productId}::${line.variantId || 'base'}`,
    Number(line.expectedPriceSatang),
  ]));
  return priced.items.filter((item) => {
    const expected = expectedPrices.get(`${item.productId}::${item.variantId || 'base'}`);
    return Number.isFinite(expected) && expected !== item.unitPriceSatang;
  });
}

export function priceOrderItems(
  input: OrderLineRequest[],
  products: CatalogProduct[]
): PricedOrder {
  if (!Array.isArray(input) || input.length === 0 || input.length > 30) {
    throw new Error('Cart must contain between 1 and 30 items.');
  }

  const quantities = new Set<string>();
  const items = input.map((line) => {
    const productId = String(line?.productId || '').trim();
    const variantId = line.variantId ? String(line.variantId) : null;
    const quantity = Number(line.quantity);
    const identity = `${productId}::${variantId || 'base'}`;
    if (!productId || !Number.isInteger(quantity) || quantity < 1 || quantity > 99 || quantities.has(identity)) {
      throw new Error('Cart item is invalid.');
    }
    quantities.add(identity);

    const product = products.find((candidate) => candidate.id === productId);
    if (!product || product.status !== 'active') throw new Error('A product is no longer available.');
    const variant = variantId ? product.variants?.find((candidate) => candidate.id === variantId) : null;
    if (variantId && (!variant || !variant.active)) throw new Error('A product option is no longer available.');
    const stock = variant?.stock ?? product.stock;
    if (!Number.isInteger(stock) || stock < quantity) throw new Error('Not enough stock for a product.');

    const price = variant?.price ?? product.price;
    const unitPriceSatang = Math.round(Number(price) * 100);
    if (!Number.isSafeInteger(unitPriceSatang) || unitPriceSatang < 0) throw new Error('Product price is invalid.');
    const lineTotalSatang = unitPriceSatang * quantity;
    return {
      productId,
      productName: product.name,
      variantId,
      variantName: variant?.displayName ?? null,
      unitPriceSatang,
      quantity,
      productImage: variant?.imageURL || product.images?.[0]?.url || null,
      lineTotalSatang,
    };
  });

  const subtotalSatang = items.reduce((sum, item) => sum + item.lineTotalSatang, 0);
  const shippingFeeSatang = 3000;
  return {
    items,
    subtotalSatang,
    shippingFeeSatang,
    totalSatang: subtotalSatang + shippingFeeSatang,
    reservations: items.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity })),
  };
}
