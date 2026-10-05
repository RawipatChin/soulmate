export interface CartItem {
  id: string; // cartItemId in Firestore (or local id for guest)
  productId: string;
  productName: string;
  productImage?: string | null;
  variantId?: string | null;
  variantName?: string | null;
  unitPrice: number;
  quantity: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface AddToCartInput {
  productId: string;
  productName: string;
  productImage?: string | null;
  variantId?: string | null;
  variantName?: string | null;
  unitPrice: number;
  quantity?: number;
}
