export type ProductStatus = 'draft' | 'active' | 'inactive';

export interface OptionValue {
  id: string;
  name: string;
}

export interface OptionGroup {
  id: string;
  name: string;
  values: OptionValue[];
}

export interface VariantOptionRef {
  groupId: string;
  groupName: string;
  valueId: string;
  valueName: string;
}

export interface ProductVariant {
  id: string;
  options: VariantOptionRef[];
  displayName: string;
  price: number;
  stock: number;
  sku: string;
  imageURL: string | null;
  active: boolean;
}

export interface ProductDimensions {
  height: number | null;
  width: number | null;
  length: number | null;
  unit: 'cm';
}

export interface ProductShipping {
  weight: number;
  weightUnit: 'g' | 'kg';
  dimensions: ProductDimensions;
  feeMode?: 'default' | 'custom';
  customFee?: number | null;
  codEnabled: boolean;
}

export interface ProductImage {
  id: string;
  url: string;
  storagePath: string;
  isPrimary: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  highlights?: string;
  ingredients?: string;
  usageInstructions?: string;
  fdaRegistrationNumber?: string;
  countryOfOrigin?: string;
  shelfLife?: string;
  categoryId: string | null;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  status: ProductStatus;
  images: ProductImage[];
  primaryImageURL?: string | null;
  primaryImageId?: string | null;
  sku?: string;
  lowStockThreshold?: number | null;
  hasVariants: boolean;
  optionGroups?: OptionGroup[];
  variants?: ProductVariant[];
  shipping?: ProductShipping;
  createdAt: any;
  updatedAt: any;
}

export interface ProductInput {
  name: string;
  slug?: string;
  shortDescription?: string;
  description?: string;
  highlights?: string;
  ingredients?: string;
  usageInstructions?: string;
  fdaRegistrationNumber?: string;
  countryOfOrigin?: string;
  shelfLife?: string;
  categoryId?: string | null;
  price: number;
  compareAtPrice?: number | null;
  stock: number;
  lowStockThreshold?: number | null;
  status?: ProductStatus;
  images?: ProductImage[];
  primaryImageURL?: string | null;
  primaryImageId?: string | null;
  sku?: string;
  hasVariants?: boolean;
  optionGroups?: OptionGroup[];
  variants?: ProductVariant[];
  shipping?: ProductShipping;
}

