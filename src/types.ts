export type ScreenCategory = 'storefront' | 'admin' | 'brand';
export type ViewportMode = 'mobile' | 'tablet' | 'desktop';

export interface ScreenDefinition {
  id: string;
  title: string;
  category: ScreenCategory;
  path: string;
  htmlPath: string;
  description: string;
  defaultViewport: 'mobile' | 'desktop';
  aliases: string[];
}

export * from './types/membership';
export * from './types/customer';
export * from './types/cart';
export * from './types/product';
