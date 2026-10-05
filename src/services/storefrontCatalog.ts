import type { Product } from '../types/product';
import { getProducts, getProductBySlugOrId } from './productService';

const fixtureKey = 'soulmate_browser_test_products';
const errorKey = 'soulmate_browser_test_catalog_error';

export async function getPublishedProducts(): Promise<Product[]> {
  if (import.meta.env.MODE === 'browser-test') {
    const delay = Number(window.localStorage.getItem('soulmate_browser_test_catalog_delay_ms') || 0);
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
    if (window.localStorage.getItem(errorKey) === 'true') {
      throw new Error('Browser test catalog read failed');
    }
    const fixture = window.localStorage.getItem(fixtureKey);
    if (!fixture) return [];
    return (JSON.parse(fixture) as Product[]).filter((product) => product.status === 'active');
  }
  return getProducts({ status: 'active' });
}

export async function getPublishedProduct(identifier: string): Promise<Product | null> {
  if (import.meta.env.MODE === 'browser-test') {
    return (await getPublishedProducts()).find((product) =>
      product.id === identifier || product.slug === identifier) || null;
  }
  return getProductBySlugOrId(identifier);
}
