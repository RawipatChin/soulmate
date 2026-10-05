import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  variantId: string | null;
  variantName: string | null;
  unitPrice: number;
  quantity: number;
  productImage: string | null;
}

export interface AddToCartInput {
  productId: string;
  productName: string;
  variantId?: string | null;
  variantName?: string | null;
  unitPrice: number;
  quantity?: number;
  productImage?: string | null;
}

export interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  addToCart: (input: AddToCartInput) => Promise<void>;
  updateCartQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  removeCartItem: (cartItemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
}

const CART_STORAGE_KEY = 'soulmate_cart_v1';

const CartContext = createContext<CartContextType | undefined>(undefined);

function makeCartItemId(productId: string, variantId?: string | null): string {
  return `${productId}::${variantId || 'base'}`;
}

function sanitizeStoredItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((raw: any): CartItem | null => {
      const productId = String(raw?.productId || '').trim();
      const productName = String(raw?.productName || '').trim();
      const unitPrice = Number(raw?.unitPrice);
      const quantity = Number(raw?.quantity);

      if (
        !productId ||
        !productName ||
        !Number.isFinite(unitPrice) ||
        unitPrice < 0 ||
        !Number.isFinite(quantity) ||
        quantity <= 0
      ) {
        return null;
      }

      const variantId =
        raw?.variantId === null || raw?.variantId === undefined || raw?.variantId === ''
          ? null
          : String(raw.variantId);

      return {
        id:
          String(raw?.id || '').trim() ||
          makeCartItemId(productId, variantId),
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
        quantity: Math.max(1, Math.floor(quantity)),
        productImage:
          typeof raw?.productImage === 'string' && raw.productImage.trim()
            ? raw.productImage.trim()
            : null,
      };
    })
    .filter((item): item is CartItem => Boolean(item));
}

function loadCartFromStorage(): CartItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];

    return sanitizeStoredItems(JSON.parse(raw));
  } catch (error) {
    console.warn('[SOULMATE Cart] Could not load local cart:', error);
    return [];
  }
}

function persistCart(items: CartItem[]): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error('[SOULMATE Cart] Could not persist local cart:', error);
  }
}

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [items, setItems] = useState<CartItem[]>(() => loadCartFromStorage());

  // Persist every committed cart state so route changes / iframe reloads do not
  // reset the cart.
  useEffect(() => {
    persistCart(items);
  }, [items]);

  // Keep another tab/window in sync as well.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onStorage = (event: StorageEvent) => {
      if (event.key !== CART_STORAGE_KEY) return;

      try {
        const next = event.newValue
          ? sanitizeStoredItems(JSON.parse(event.newValue))
          : [];
        setItems(next);
      } catch (error) {
        console.warn('[SOULMATE Cart] Invalid storage update:', error);
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const addToCart = useCallback(async (input: AddToCartInput) => {
    const productId = String(input.productId || '').trim();
    const productName = String(input.productName || '').trim();
    const unitPrice = Number(input.unitPrice);
    const addQuantity = Math.max(1, Math.floor(Number(input.quantity || 1)));

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

    const cartItemId = makeCartItemId(productId, variantId);

    setItems((current) => {
      const existingIndex = current.findIndex(
        (item) => item.id === cartItemId
      );

      let next: CartItem[];

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
            id: cartItemId,
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

      // Persist synchronously too. This matters when the user navigates to
      // /cart immediately after clicking Add to Cart.
      persistCart(next);
      return next;
    });
  }, []);

  const updateCartQuantity = useCallback(
    async (cartItemId: string, quantity: number) => {
      const nextQuantity = Math.floor(Number(quantity));

      setItems((current) => {
        const next =
          !Number.isFinite(nextQuantity) || nextQuantity <= 0
            ? current.filter((item) => item.id !== cartItemId)
            : current.map((item) =>
                item.id === cartItemId
                  ? { ...item, quantity: nextQuantity }
                  : item
              );

        persistCart(next);
        return next;
      });
    },
    []
  );

  const removeCartItem = useCallback(async (cartItemId: string) => {
    setItems((current) => {
      const next = current.filter((item) => item.id !== cartItemId);
      persistCart(next);
      return next;
    });
  }, []);

  const clearCart = useCallback(async () => {
    setItems([]);
    persistCart([]);
  }, []);

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0
      ),
    [items]
  );

  const value = useMemo<CartContextType>(
    () => ({
      items,
      itemCount,
      subtotal,
      addToCart,
      updateCartQuantity,
      removeCartItem,
      clearCart,
    }),
    [
      items,
      itemCount,
      subtotal,
      addToCart,
      updateCartQuantity,
      removeCartItem,
      clearCart,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export function useCart(): CartContextType {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }

  return context;
}
