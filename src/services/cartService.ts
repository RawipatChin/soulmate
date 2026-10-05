export interface StorefrontCartItem {
  id: string;
  productId: string;
  productName: string;
  variantId: string | null;
  variantName: string | null;
  unitPrice: number;
  quantity: number;
  productImage: string | null;
}

export interface AddStorefrontCartItemInput {
  productId: string;
  productName: string;
  variantId?: string | null;
  variantName?: string | null;
  unitPrice: number;
  quantity?: number;
  productImage?: string | null;
}

export interface StorefrontCartSnapshot {
  items: StorefrontCartItem[];
  itemCount: number;
  subtotal: number;
}

const CART_STORAGE_KEY = 'soulmate_storefront_cart_v1';

let memoryCart: StorefrontCartItem[] = [];

function makeId(productId: string, variantId?: string | null): string {
  return `${productId}::${variantId || 'base'}`;
}

export function sanitizePersistedCartItems(
  value: unknown
): StorefrontCartItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((raw: any): StorefrontCartItem | null => {
      const productId = String(raw?.productId || '').trim();
      const productName = String(raw?.productName || '').trim();
      const unitPrice = Number(raw?.unitPrice);
      const quantity = Math.max(
        1,
        Math.floor(Number(raw?.quantity || 1))
      );

      if (
        !productId ||
        !productName ||
        !Number.isFinite(unitPrice) ||
        unitPrice < 0 ||
        !Number.isFinite(quantity)
      ) {
        return null;
      }

      const variantId =
        raw?.variantId === null ||
        raw?.variantId === undefined ||
        raw?.variantId === ''
          ? null
          : String(raw.variantId);

      return {
        id:
          String(raw?.id || '').trim() ||
          makeId(productId, variantId),
        productId,
        productName,
        variantId,
        variantName:
          raw?.variantName === null ||
          raw?.variantName === undefined ||
          raw?.variantName === ''
            ? null
            : String(raw.variantName),
        unitPrice,
        quantity,
        productImage:
          typeof raw?.productImage === 'string' &&
          raw.productImage.trim()
            ? raw.productImage.trim()
            : null,
      };
    })
    .filter(
      (item): item is StorefrontCartItem => Boolean(item)
    );
}

function readStorage(): StorefrontCartItem[] {
  if (typeof window === 'undefined') {
    return memoryCart;
  }

  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);

    if (raw) {
      const parsed = sanitizePersistedCartItems(JSON.parse(raw));
      memoryCart = parsed;
      return parsed;
    }
  } catch (error) {
    console.warn('[SOULMATE CartService] localStorage read failed:', error);
  }

  try {
    const raw = window.sessionStorage.getItem(CART_STORAGE_KEY);

    if (raw) {
      const parsed = sanitizePersistedCartItems(JSON.parse(raw));
      memoryCart = parsed;
      return parsed;
    }
  } catch (error) {
    console.warn('[SOULMATE CartService] sessionStorage read failed:', error);
  }

  return memoryCart;
}

function writeStorage(
  items: StorefrontCartItem[]
): StorefrontCartItem[] {
  const clean = sanitizePersistedCartItems(items);
  memoryCart = clean;

  if (typeof window !== 'undefined') {
    const json = JSON.stringify(clean);

    try {
      window.localStorage.setItem(CART_STORAGE_KEY, json);
    } catch (error) {
      console.warn('[SOULMATE CartService] localStorage write failed:', error);
    }

    try {
      window.sessionStorage.setItem(CART_STORAGE_KEY, json);
    } catch (error) {
      console.warn('[SOULMATE CartService] sessionStorage write failed:', error);
    }

    try {
      window.dispatchEvent(
        new CustomEvent('soulmate-cart-updated', {
          detail: getCartSnapshotFromItems(clean),
        })
      );
    } catch {
      // Best effort only.
    }
  }

  return clean;
}

function getCartSnapshotFromItems(
  items: StorefrontCartItem[]
): StorefrontCartSnapshot {
  return {
    items,
    itemCount: items.reduce(
      (sum, item) => sum + item.quantity,
      0
    ),
    subtotal: items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    ),
  };
}

export function getCartSnapshot(): StorefrontCartSnapshot {
  return getCartSnapshotFromItems(readStorage());
}

export function replaceCartItems(
  items: StorefrontCartItem[]
): StorefrontCartSnapshot {
  return getCartSnapshotFromItems(writeStorage(items));
}

export function addCartItem(
  input: AddStorefrontCartItemInput
): StorefrontCartSnapshot {
  const productId = String(input.productId || '').trim();
  const productName = String(input.productName || '').trim();
  const unitPrice = Number(input.unitPrice);
  const addQuantity = Math.max(
    1,
    Math.floor(Number(input.quantity || 1))
  );

  if (!productId) {
    throw new Error('ไม่พบรหัสสินค้า');
  }

  if (!productName) {
    throw new Error('ไม่พบชื่อสินค้า');
  }

  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    throw new Error('ราคาสินค้าไม่ถูกต้อง');
  }

  const variantId =
    input.variantId === null ||
    input.variantId === undefined ||
    input.variantId === ''
      ? null
      : String(input.variantId);

  const id = makeId(productId, variantId);
  const current = readStorage();
  const existingIndex = current.findIndex(
    (item) => item.id === id
  );

  let next: StorefrontCartItem[];

  if (existingIndex >= 0) {
    next = current.map((item, index) =>
      index === existingIndex
        ? {
            ...item,
            productName,
            variantName:
              input.variantName === null ||
              input.variantName === undefined ||
              input.variantName === ''
                ? null
                : String(input.variantName),
            unitPrice,
            quantity: item.quantity + addQuantity,
            productImage:
              typeof input.productImage === 'string' &&
              input.productImage.trim()
                ? input.productImage.trim()
                : item.productImage,
          }
        : item
    );
  } else {
    next = [
      ...current,
      {
        id,
        productId,
        productName,
        variantId,
        variantName:
          input.variantName === null ||
          input.variantName === undefined ||
          input.variantName === ''
            ? null
            : String(input.variantName),
        unitPrice,
        quantity: addQuantity,
        productImage:
          typeof input.productImage === 'string' &&
          input.productImage.trim()
            ? input.productImage.trim()
            : null,
      },
    ];
  }

  return getCartSnapshotFromItems(writeStorage(next));
}

export function updateCartItemQuantity(
  cartItemId: string,
  quantity: number
): StorefrontCartSnapshot {
  const current = readStorage();
  const nextQuantity = Math.floor(Number(quantity));

  const next =
    !Number.isFinite(nextQuantity) || nextQuantity <= 0
      ? current.filter((item) => item.id !== cartItemId)
      : current.map((item) =>
          item.id === cartItemId
            ? { ...item, quantity: nextQuantity }
            : item
        );

  return getCartSnapshotFromItems(writeStorage(next));
}

export function removeCartItem(
  cartItemId: string
): StorefrontCartSnapshot {
  const next = readStorage().filter(
    (item) => item.id !== cartItemId
  );

  return getCartSnapshotFromItems(writeStorage(next));
}

export function clearCart(): StorefrontCartSnapshot {
  return getCartSnapshotFromItems(writeStorage([]));
}
