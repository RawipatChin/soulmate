import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { ref as storageRef, deleteObject, listAll } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import type { Product, ProductInput, ProductStatus, ProductShipping, ProductImage } from '../types';
import { resolveAllProductImages, resolveProductImage } from './productImageService';

export { resolveAllProductImages, resolveProductImage };

export function generateSlug(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[\s\W-]+/g, '-')
      .replace(/^-+|-+$/g, '') || `product-${Date.now()}`
  );
}

/**
 * Normalizes images from Firestore document to canonical ProductImage[]
 * Supports backward compatibility for legacy field names:
 * imageURL, photoURL, imageUrls, imageURLs, gallery, productImages
 */
export function normalizeProductImages(
  docData: any,
  productId: string
): { images: ProductImage[]; primaryImageURL: string | null; primaryImageId: string | null } {
  if (!docData) return { images: [], primaryImageURL: null, primaryImageId: null };

  let rawList: any[] = [];
  if (Array.isArray(docData.images) && docData.images.length > 0) {
    rawList = docData.images;
  } else if (Array.isArray(docData.imageUrls) && docData.imageUrls.length > 0) {
    rawList = docData.imageUrls;
  } else if (Array.isArray(docData.imageURLs) && docData.imageURLs.length > 0) {
    rawList = docData.imageURLs;
  } else if (Array.isArray(docData.gallery) && docData.gallery.length > 0) {
    rawList = docData.gallery;
  } else if (Array.isArray(docData.productImages) && docData.productImages.length > 0) {
    rawList = docData.productImages;
  } else if (typeof docData.imageURL === 'string' && docData.imageURL.trim()) {
    rawList = [docData.imageURL.trim()];
  } else if (typeof docData.photoURL === 'string' && docData.photoURL.trim()) {
    rawList = [docData.photoURL.trim()];
  }

  const result = canonicalizeProductImages(rawList, productId, docData.primaryImageId);
  const primaryImageURL = docData.primaryImageURL || result.primaryImageURL;
  const primaryImageId = docData.primaryImageId || result.primaryImageId;

  return {
    images: result.images,
    primaryImageURL,
    primaryImageId,
  };
}

/**
 * Safely extracts FDA Registration Number with backward compatibility
 * for legacy field names: fdaNumber, fda, registrationNumber, fdaRegistrationNo, thaiFdaNumber
 */
export function extractFdaRegistrationNumber(docData: any): string {
  if (!docData) return '';
  const candidates = [
    docData.fdaRegistrationNumber,
    docData.fdaNumber,
    docData.fda,
    docData.registrationNumber,
    docData.fdaRegistrationNo,
    docData.thaiFdaNumber,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim() !== '') {
      return c.trim();
    }
  }
  return '';
}

function mapProductDoc(id: string, d: any): Product {
  let shipping: ProductShipping | undefined = undefined;
  if (d.shipping) {
    shipping = {
      weight: typeof d.shipping.weight === 'number' ? d.shipping.weight : 0,
      weightUnit: d.shipping.weightUnit === 'kg' ? 'kg' : 'g',
      dimensions: {
        height: typeof d.shipping.dimensions?.height === 'number' ? d.shipping.dimensions.height : null,
        width: typeof d.shipping.dimensions?.width === 'number' ? d.shipping.dimensions.width : null,
        length: typeof d.shipping.dimensions?.length === 'number' ? d.shipping.dimensions.length : null,
        unit: 'cm',
      },
      feeMode: d.shipping.feeMode === 'custom' ? 'custom' : 'default',
      customFee: typeof d.shipping.customFee === 'number' ? d.shipping.customFee : null,
      codEnabled: !!d.shipping.codEnabled,
    };
  }

  const optionGroups = Array.isArray(d.optionGroups)
    ? d.optionGroups.map((g: any) => ({
        id: g.id || '',
        name: g.name || '',
        values: Array.isArray(g.values)
          ? g.values.map((v: any) => ({
              id: v.id || '',
              name: v.name || '',
            }))
          : [],
      }))
    : [];

  const { images, primaryImageURL, primaryImageId } = normalizeProductImages(d, id);
  const fdaRegistrationNumber = extractFdaRegistrationNumber(d);
  const countryOfOrigin = typeof d.countryOfOrigin === 'string' ? d.countryOfOrigin : (typeof d.mfgCountry === 'string' ? d.mfgCountry : '');
  const shelfLife = typeof d.shelfLife === 'string' ? d.shelfLife : '';
  const highlights = typeof d.highlights === 'string' ? d.highlights : '';
  const ingredients = typeof d.ingredients === 'string' ? d.ingredients : '';
  const usageInstructions = typeof d.usageInstructions === 'string' ? d.usageInstructions : (typeof d.usage === 'string' ? d.usage : (typeof d.directions === 'string' ? d.directions : ''));
  const lowStockThreshold = typeof d.lowStockThreshold === 'number' ? d.lowStockThreshold : null;

  return {
    id,
    name: typeof d.name === 'string' ? d.name : String(d.name ?? ''),
    slug: typeof d.slug === 'string' && d.slug ? d.slug : id,
    shortDescription: d.shortDescription || '',
    description: d.description || '',
    highlights,
    ingredients,
    usageInstructions,
    countryOfOrigin,
    shelfLife,
    categoryId: d.categoryId || null,
    price: typeof d.price === 'number' ? d.price : 0,
    compareAtPrice: typeof d.compareAtPrice === 'number' ? d.compareAtPrice : null,
    stock: typeof d.stock === 'number' ? d.stock : 0,
    status: (d.status as ProductStatus) || 'draft',
    images,
    primaryImageURL,
    primaryImageId,
    fdaRegistrationNumber,
    sku: d.sku || '',
    lowStockThreshold,
    hasVariants: !!d.hasVariants,
    optionGroups,
    variants: Array.isArray(d.variants) ? d.variants : [],
    shipping,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

export async function getProducts(options?: {
  status?: ProductStatus | 'all';
}): Promise<Product[]> {
  if (!db) {
    console.warn('[ProductService] Firestore is not initialized');
    return [];
  }

  try {
    const productsColRef = collection(db, 'products');
    const statusFilter = options?.status && options.status !== 'all'
      ? where('status', '==', options.status)
      : null;
    const orderedQuery = statusFilter
      ? query(productsColRef, statusFilter, orderBy('createdAt', 'desc'))
      : query(productsColRef, orderBy('createdAt', 'desc'));
    let snapshot;
    try {
      snapshot = await getDocs(orderedQuery);
    } catch (err: any) {
      if (err?.code !== 'failed-precondition') throw err;
      // Keep the status constraint when the ordered query needs an index.
      snapshot = await getDocs(statusFilter ? query(productsColRef, statusFilter) : productsColRef);
    }

    const items: Product[] = snapshot.docs.map((docSnap) => {
      return mapProductDoc(docSnap.id, docSnap.data());
    });

    if (options?.status && options.status !== 'all') {
      return items.filter((p) => p.status === options.status);
    }

    return items;
  } catch (err) {
    console.error('[ProductService] Error getting products:', err);
    throw err;
  }
}

/**
 * Real-time subscription to products collection in Firestore.
 * Automatically falls back to unordered query if composite index is pending.
 */
export function subscribeToProducts(
  callback: (products: Product[]) => void,
  options?: { status?: ProductStatus | 'all' }
): () => void {
  if (!db) {
    callback([]);
    return () => {};
  }

  const productsColRef = collection(db, 'products');
  const q = query(productsColRef, orderBy('createdAt', 'desc'));

  const handleSnapshot = (snapshot: any) => {
    let items: Product[] = snapshot.docs.map((docSnap: any) => {
      return mapProductDoc(docSnap.id, docSnap.data());
    });

    if (options?.status && options.status !== 'all') {
      items = items.filter((p) => p.status === options.status);
    }

    callback(items);
  };

  try {
    const unsub = onSnapshot(
      q,
      handleSnapshot,
      (err) => {
        console.warn('[ProductService] Live subscription orderBy failed, falling back to unordered:', err);
        return onSnapshot(productsColRef, handleSnapshot);
      }
    );
    return unsub;
  } catch {
    return onSnapshot(productsColRef, handleSnapshot);
  }
}

export async function getProductById(productId: string): Promise<Product | null> {
  if (!db || !productId) return null;
  try {
    const docRef = doc(db, 'products', productId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const baseProduct = mapProductDoc(snap.id, snap.data());

    // Asynchronously resolve any storagePaths to download URLs if needed
    const rawImages = snap.data().images || baseProduct.images;
    const { images, primaryImageURL, primaryImageId } = await resolveAllProductImages(
      rawImages,
      productId,
      snap.data().primaryImageId || baseProduct.primaryImageId,
      snap.data().primaryImageURL || baseProduct.primaryImageURL
    );

    return {
      ...baseProduct,
      images,
      primaryImageURL: primaryImageURL || baseProduct.primaryImageURL,
      primaryImageId: primaryImageId || baseProduct.primaryImageId,
    };
  } catch (err) {
    console.error('[ProductService] Error getting product by ID:', err);
    return null;
  }
}

export async function getProductBySlugOrId(identifier: string): Promise<Product | null> {
  if (!db || !identifier) return null;
  try {
    // Storefront queries must only request published products so Firestore rules can allow them.
    const all = await getProducts({ status: 'active' });
    const found = all.find((p) => p.slug === identifier || p.id === identifier);
    if (!found) return null;

    return await getProductById(found.id);
  } catch (err) {
    console.error('[ProductService] Error getting product by slug/id:', err);
    throw err;
  }
}

/**
 * Canonicalizes an image array to ProductImage[]
 * Ensures only real download URLs, no blob/data URLs, exactly one isPrimary,
 * and extracts matching primaryImageURL and primaryImageId.
 */
export function canonicalizeProductImages(
  rawImages: any[],
  productId: string,
  explicitPrimaryId?: string | null
): { images: ProductImage[]; primaryImageURL: string | null; primaryImageId: string | null } {
  if (!Array.isArray(rawImages)) {
    return { images: [], primaryImageURL: null, primaryImageId: null };
  }

  const normalized: ProductImage[] = [];
  for (let i = 0; i < rawImages.length; i++) {
    const item = rawImages[i];
    if (!item) continue;
    let id = `img_${i}_${Date.now()}`;
    let url = '';
    let storagePath = '';
    let isPrimary = false;

    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (!trimmed || trimmed.startsWith('blob:') || trimmed.startsWith('data:')) continue;
      if (trimmed.startsWith('https://')) {
        url = trimmed;
        storagePath = `products/${productId}/images/${id}`;
      } else if (trimmed.startsWith('products/') || trimmed.startsWith('gs://')) {
        storagePath = trimmed.replace(/^gs:\/\/[^/]+\//, '').replace(/^\/+/, '');
      }
    } else if (typeof item === 'object') {
      id = item.id || item.imageId || `img_${i}_${Date.now()}`;
      isPrimary = !!item.isPrimary;
      const rawPath = (item.storagePath || item.path || item.filePath || '').trim();
      storagePath = rawPath.replace(/^gs:\/\/[^/]+\//, '').replace(/^\/+/, '');

      const candidates = [item.url, item.downloadURL, item.imageURL, item.src];
      for (const c of candidates) {
        if (typeof c === 'string' && c.trim()) {
          const t = c.trim();
          if (t.startsWith('https://')) {
            url = t;
            break;
          } else if (!storagePath && (t.startsWith('gs://') || t.startsWith('products/'))) {
            storagePath = t.replace(/^gs:\/\/[^/]+\//, '').replace(/^\/+/, '');
          }
        }
      }

      if (url.startsWith('blob:') || url.startsWith('data:')) {
        url = '';
      }
    }

    if (!storagePath) {
      storagePath = `products/${productId}/images/${id}`;
    }

    if (url || storagePath) {
      normalized.push({
        id,
        url,
        storagePath,
        isPrimary,
      });
    }
  }

  if (normalized.length > 0) {
    let primaryIdx = -1;
    if (explicitPrimaryId) {
      primaryIdx = normalized.findIndex((img) => img.id === explicitPrimaryId);
    }
    if (primaryIdx === -1) {
      const primaryCount = normalized.filter((img) => img.isPrimary).length;
      if (primaryCount === 1) {
        primaryIdx = normalized.findIndex((img) => img.isPrimary);
      } else {
        primaryIdx = 0;
      }
    }

    normalized.forEach((img, idx) => {
      img.isPrimary = idx === primaryIdx;
    });

    const chosen = normalized[primaryIdx];
    return {
      images: normalized,
      primaryImageURL: chosen.url || null,
      primaryImageId: chosen.id || null,
    };
  }

  return { images: [], primaryImageURL: null, primaryImageId: null };
}

export async function createProduct(
  input: ProductInput,
  explicitId?: string
): Promise<string> {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  const newDoc = explicitId
    ? doc(db, 'products', explicitId)
    : doc(collection(db, 'products'));
  const slug = input.slug?.trim() || generateSlug(input.name);
  const status: ProductStatus = input.status || 'draft';

  const {
    images: canonicalImages,
    primaryImageURL: derivedPrimaryURL,
    primaryImageId: derivedPrimaryId,
  } = canonicalizeProductImages(
    input.images || [],
    newDoc.id,
    input.primaryImageId
  );

  const fdaRegistrationNumber =
    typeof input.fdaRegistrationNumber === 'string'
      ? input.fdaRegistrationNumber.trim()
      : '';

  const lowStockThreshold =
    input.lowStockThreshold !== undefined && input.lowStockThreshold !== null
      ? Number(input.lowStockThreshold)
      : null;

  const primaryImageURL =
    input.primaryImageURL !== undefined ? input.primaryImageURL : derivedPrimaryURL;
  const primaryImageId =
    input.primaryImageId !== undefined ? input.primaryImageId : derivedPrimaryId;

  const data: Record<string, any> = {
    name: input.name.trim(),
    slug,
    shortDescription: input.shortDescription || '',
    description: input.description || '',
    highlights: input.highlights || '',
    ingredients: input.ingredients || '',
    usageInstructions: input.usageInstructions || '',
    countryOfOrigin: input.countryOfOrigin ? input.countryOfOrigin.trim() : '',
    shelfLife: input.shelfLife ? input.shelfLife.trim() : '',
    categoryId: input.categoryId || null,
    price: Number(input.price) || 0,
    compareAtPrice: input.compareAtPrice !== null && input.compareAtPrice !== undefined ? Number(input.compareAtPrice) : null,
    stock: Number(input.stock) || 0,
    lowStockThreshold,
    status,
    images: canonicalImages,
    primaryImageURL,
    primaryImageId,
    fdaRegistrationNumber,
    sku: input.sku || '',
    hasVariants: !!input.hasVariants,
    optionGroups: Array.isArray(input.optionGroups)
      ? input.optionGroups.map((g) => ({
          id: g.id,
          name: g.name.trim(),
          values: Array.isArray(g.values)
            ? g.values.map((v) => ({ id: v.id, name: v.name.trim() }))
            : [],
        }))
      : [],
    variants: Array.isArray(input.variants) ? input.variants : [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (input.shipping) {
    data.shipping = {
      weight: Number(input.shipping.weight) || 0,
      weightUnit: input.shipping.weightUnit === 'kg' ? 'kg' : 'g',
      dimensions: {
        height: input.shipping.dimensions?.height !== null && input.shipping.dimensions?.height !== undefined ? Number(input.shipping.dimensions.height) : null,
        width: input.shipping.dimensions?.width !== null && input.shipping.dimensions?.width !== undefined ? Number(input.shipping.dimensions.width) : null,
        length: input.shipping.dimensions?.length !== null && input.shipping.dimensions?.length !== undefined ? Number(input.shipping.dimensions.length) : null,
        unit: 'cm',
      },
      feeMode: input.shipping.feeMode === 'custom' ? 'custom' : 'default',
      customFee: input.shipping.feeMode === 'custom' && typeof input.shipping.customFee === 'number' ? Number(input.shipping.customFee) : null,
      codEnabled: !!input.shipping.codEnabled,
    };
  }

  await setDoc(newDoc, data);
  return newDoc.id;
}

export async function updateProduct(
  productId: string,
  input: Partial<ProductInput>
): Promise<void> {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  const docRef = doc(db, 'products', productId);
  const updatePayload: Record<string, any> = {
    updatedAt: serverTimestamp(),
  };

  if (input.name !== undefined) updatePayload.name = input.name.trim();
  if (input.slug !== undefined) updatePayload.slug = input.slug.trim();
  if (input.shortDescription !== undefined) updatePayload.shortDescription = input.shortDescription;
  if (input.description !== undefined) updatePayload.description = input.description;
  if (input.highlights !== undefined) updatePayload.highlights = input.highlights;
  if (input.ingredients !== undefined) updatePayload.ingredients = input.ingredients;
  if (input.usageInstructions !== undefined) updatePayload.usageInstructions = input.usageInstructions;
  if (input.countryOfOrigin !== undefined) updatePayload.countryOfOrigin = input.countryOfOrigin.trim();
  if (input.shelfLife !== undefined) updatePayload.shelfLife = input.shelfLife.trim();
  if (input.categoryId !== undefined) updatePayload.categoryId = input.categoryId;
  if (input.price !== undefined) updatePayload.price = Number(input.price) || 0;
  if (input.compareAtPrice !== undefined) {
    updatePayload.compareAtPrice =
      input.compareAtPrice !== null ? Number(input.compareAtPrice) : null;
  }
  if (input.stock !== undefined) updatePayload.stock = Number(input.stock) || 0;
  if (input.lowStockThreshold !== undefined) {
    updatePayload.lowStockThreshold =
      input.lowStockThreshold !== null ? Number(input.lowStockThreshold) : null;
  }
  if (input.status !== undefined) updatePayload.status = input.status;
  if (input.images !== undefined) {
    const {
      images: canonicalImages,
      primaryImageURL: derivedPrimaryURL,
      primaryImageId: derivedPrimaryId,
    } = canonicalizeProductImages(
      input.images || [],
      productId,
      input.primaryImageId
    );
    updatePayload.images = canonicalImages;
    updatePayload.primaryImageURL = input.primaryImageURL !== undefined ? input.primaryImageURL : derivedPrimaryURL;
    updatePayload.primaryImageId = input.primaryImageId !== undefined ? input.primaryImageId : derivedPrimaryId;
  } else {
    if (input.primaryImageURL !== undefined) {
      updatePayload.primaryImageURL = input.primaryImageURL;
    }
    if (input.primaryImageId !== undefined) {
      updatePayload.primaryImageId = input.primaryImageId;
    }
  }
  if (input.fdaRegistrationNumber !== undefined) {
    updatePayload.fdaRegistrationNumber =
      typeof input.fdaRegistrationNumber === 'string'
        ? input.fdaRegistrationNumber.trim()
        : '';
  }
  if (input.sku !== undefined) updatePayload.sku = input.sku;
  if (input.hasVariants !== undefined) updatePayload.hasVariants = !!input.hasVariants;
  if (input.optionGroups !== undefined) {
    updatePayload.optionGroups = Array.isArray(input.optionGroups)
      ? input.optionGroups.map((g) => ({
          id: g.id,
          name: g.name.trim(),
          values: Array.isArray(g.values)
            ? g.values.map((v) => ({ id: v.id, name: v.name.trim() }))
            : [],
        }))
      : [];
  }
  if (input.variants !== undefined) updatePayload.variants = input.variants;
  if (input.shipping !== undefined) {
    updatePayload.shipping = {
      weight: Number(input.shipping.weight) || 0,
      weightUnit: input.shipping.weightUnit === 'kg' ? 'kg' : 'g',
      dimensions: {
        height: input.shipping.dimensions?.height !== null && input.shipping.dimensions?.height !== undefined ? Number(input.shipping.dimensions.height) : null,
        width: input.shipping.dimensions?.width !== null && input.shipping.dimensions?.width !== undefined ? Number(input.shipping.dimensions.width) : null,
        length: input.shipping.dimensions?.length !== null && input.shipping.dimensions?.length !== undefined ? Number(input.shipping.dimensions.length) : null,
        unit: 'cm',
      },
      feeMode: input.shipping.feeMode === 'custom' ? 'custom' : 'default',
      customFee: input.shipping.feeMode === 'custom' && typeof input.shipping.customFee === 'number' ? Number(input.shipping.customFee) : null,
      codEnabled: !!input.shipping.codEnabled,
    };
  }

  await updateDoc(docRef, updatePayload);
}

/**
 * Safely cleans up Firebase Storage files belonging strictly to this product:
 * - products/{productId}/images/...
 * - products/{productId}/variants/...
 *
 * Uses explicit storagePath values when available, and sweeps canonical directories.
 * Strictly verifies paths start with products/{productId}/ to prevent touching other files.
 * Continues safely if an image is missing or deletion fails.
 */
export async function cleanupProductStorage(product: Product): Promise<void> {
  if (!storage || !product?.id) {
    return;
  }
  const activeStorage = storage;

  const productId = product.id.trim();
  if (!productId) return;

  const productPrefix = `products/${productId}/`;
  const deletedPaths = new Set<string>();

  // 1. Delete by stored storagePath in images
  if (Array.isArray(product.images)) {
    for (const img of product.images) {
      if (img?.storagePath && typeof img.storagePath === 'string') {
        const path = img.storagePath.trim();
        if (path.startsWith(productPrefix) && !deletedPaths.has(path)) {
          deletedPaths.add(path);
          try {
            await deleteObject(storageRef(activeStorage, path));
          } catch (err: any) {
            console.warn(`[SOULMATE Product Delete] Storage image cleanup notice (${path}):`, err?.message || err);
          }
        }
      }
    }
  }

  // 2. Delete by stored storagePath in variants
  if (Array.isArray(product.variants)) {
    for (const v of product.variants) {
      const vPath = (v as any)?.storagePath;
      if (vPath && typeof vPath === 'string') {
        const path = vPath.trim();
        if (path.startsWith(productPrefix) && !deletedPaths.has(path)) {
          deletedPaths.add(path);
          try {
            await deleteObject(storageRef(activeStorage, path));
          } catch (err: any) {
            console.warn(`[SOULMATE Product Delete] Storage variant cleanup notice (${path}):`, err?.message || err);
          }
        }
      }
    }
  }

  // 3. Sweep products/{productId}/images and products/{productId}/variants directories
  const sweepFolder = async (folderPath: string) => {
    if (!folderPath.startsWith(productPrefix)) return;
    try {
      const folderRef = storageRef(activeStorage, folderPath);
      const res = await listAll(folderRef);
      await Promise.allSettled(
        res.items.map(async (itemRef) => {
          if (itemRef.fullPath.startsWith(productPrefix) && !deletedPaths.has(itemRef.fullPath)) {
            deletedPaths.add(itemRef.fullPath);
            try {
              await deleteObject(itemRef);
            } catch (err: any) {
              console.warn(`[SOULMATE Product Delete] Storage sweep item notice (${itemRef.fullPath}):`, err?.message || err);
            }
          }
        })
      );
      await Promise.allSettled(
        res.prefixes.map((subFolder) => sweepFolder(subFolder.fullPath))
      );
    } catch {
      // Missing folder or permissions: continue safely
    }
  };

  await sweepFolder(`products/${productId}/images`);
  await sweepFolder(`products/${productId}/variants`);
}

/**
 * Permanently deletes a Draft product and its associated Storage assets.
 * Enforces product.status === "draft".
 * Rejects deletion if product status is active/published with Thai message:
 * "ไม่สามารถลบสินค้าที่เผยแพร่แล้วได้"
 */
export async function deleteDraftProduct(productId: string): Promise<void> {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  if (!productId || typeof productId !== 'string') {
    throw new Error('รหัสสินค้าไม่ถูกต้อง');
  }

  // 1. Fetch current product document to verify draft status
  const product = await getProductById(productId);
  if (!product) {
    // If not found in Firestore, perform safe deleteDoc cleanup on ID
    const docRef = doc(db, 'products', productId);
    await deleteDoc(docRef);
    return;
  }

  // Rule: Only draft products can be permanently deleted
  if (product.status !== 'draft') {
    throw new Error('ไม่สามารถลบสินค้าที่เผยแพร่แล้วได้');
  }

  // 2. Clean up associated Firebase Storage files safely (non-blocking for missing files)
  try {
    await cleanupProductStorage(product);
  } catch (storageErr) {
    console.warn('[SOULMATE Product Delete] Storage cleanup warning, continuing with document delete:', storageErr);
  }

  // 3. Permanently delete products/{productId} in Firestore
  const docRef = doc(db, 'products', productId);
  await deleteDoc(docRef);
}

export async function deleteProduct(productId: string): Promise<void> {
  return deleteDraftProduct(productId);
}

/**
 * Canonical shared product payload builder for both:
 * - บันทึกแบบร่าง (Save Draft)
 * - เผยแพร่สินค้า (Publish Product)
 * Across /admin/products/new and /admin/products/:productId/edit
 */
export function buildProductPayload(
  doc: Document,
  variantMgr: { getState: () => { hasVariants: boolean; optionGroups: any[]; variants: any[]; totalStock: number } },
  currentImages: ProductImage[],
  defaultSlug?: string
): ProductInput {
  const nameInput = (doc.getElementById('prodName') || doc.querySelector('input[placeholder*="ระบุชื่อ"]')) as HTMLInputElement | null;
  const slugInput = (doc.getElementById('prodSlug') || doc.querySelector('input[name="slug"]')) as HTMLInputElement | null;
  const skuInput = (doc.getElementById('prodSku') || doc.querySelector('input[name="sku"]')) as HTMLInputElement | null;
  const priceInput = (doc.getElementById('regularPrice') || doc.querySelector('input[placeholder*="ราคาปกติ"]')) as HTMLInputElement | null;
  const salePriceInput = (doc.getElementById('salePrice') || doc.querySelector('input[placeholder*="ราคาพิเศษ"]')) as HTMLInputElement | null;
  const stockInput = (doc.getElementById('stockQty') || doc.querySelector('input[placeholder*="จำนวนสต็อก"]')) as HTMLInputElement | null;
  const lowStockInput = (doc.getElementById('lowStockThreshold') || doc.querySelector('input[name="lowStock"]')) as HTMLInputElement | null;
  const shortDescInput = (doc.getElementById('prodShortDesc') || doc.querySelector('textarea[name="shortDescription"]')) as HTMLTextAreaElement | null;
  const categorySelect = doc.getElementById('prodCategory') as HTMLSelectElement | null;

  // Content textareas (handle both Add and Edit DOMs)
  const descInput = (doc.getElementById('prodDescription') || doc.querySelector('#tab-desc textarea') || doc.querySelector('textarea[name="description"]')) as HTMLTextAreaElement | null;
  const highlightsInput = (doc.getElementById('prodHighlights') || doc.querySelector('#tab-highlights textarea') || doc.querySelector('textarea[name="highlights"]')) as HTMLTextAreaElement | null;
  const ingredientsInput = (doc.getElementById('prodIngredients') || doc.querySelector('#tab-ingredients textarea') || doc.querySelector('textarea[name="ingredients"]')) as HTMLTextAreaElement | null;
  const usageInput = (doc.getElementById('prodUsage') || doc.getElementById('prodDirections') || doc.querySelector('#tab-directions textarea') || doc.querySelector('textarea[name="usageInstructions"]')) as HTMLTextAreaElement | null;

  // FDA and origin specifications
  const fdaInput = (doc.getElementById('fdaRegistrationNumber') || doc.getElementById('fdaNumber') || doc.querySelector('input[name="fdaRegistrationNumber"]')) as HTMLInputElement | null;
  const mfgCountryInput = (doc.getElementById('mfgCountry') || doc.getElementById('countryOfOrigin') || doc.querySelector('input[name="countryOfOrigin"]')) as HTMLInputElement | null;
  const shelfLifeInput = (doc.getElementById('shelfLife') || doc.querySelector('input[name="shelfLife"]')) as HTMLInputElement | null;

  // Shipping
  const weightInput = doc.getElementById('shippingWeight') as HTMLInputElement | null;
  const weightUnitSelect = doc.getElementById('shippingWeightUnit') as HTMLSelectElement | null;
  const heightInput = doc.getElementById('shippingHeight') as HTMLInputElement | null;
  const widthInput = doc.getElementById('shippingWidth') as HTMLInputElement | null;
  const lengthInput = doc.getElementById('shippingLength') as HTMLInputElement | null;
  const codToggle = doc.getElementById('codToggle') as HTMLInputElement | null;

  const name = nameInput?.value.trim() || '';
  const slug = slugInput?.value.trim() || (name ? generateSlug(name) : (defaultSlug || ''));
  const sku = skuInput?.value.trim() || '';
  const price = priceInput && priceInput.value.trim() !== '' ? (parseFloat(priceInput.value) || 0) : 0;
  const compareAtPrice = salePriceInput && salePriceInput.value.trim() !== '' ? (parseFloat(salePriceInput.value) || null) : null;
  const lowStockThreshold = lowStockInput && lowStockInput.value.trim() !== '' ? (parseInt(lowStockInput.value, 10) || null) : null;
  const shortDescription = shortDescInput?.value || '';
  const description = descInput?.value || '';
  const highlights = highlightsInput?.value || '';
  const ingredients = ingredientsInput?.value || '';
  const usageInstructions = usageInput?.value || '';
  const fdaRegistrationNumber = fdaInput?.value.trim() || '';
  const countryOfOrigin = mfgCountryInput?.value.trim() || '';
  const shelfLife = shelfLifeInput?.value.trim() || '';
  const categoryId = categorySelect?.value || null;

  const shippingWeight = weightInput && weightInput.value.trim() !== '' ? (parseFloat(weightInput.value) || 0) : 0;
  const shippingWeightUnit = (weightUnitSelect?.value || 'g') as 'g' | 'kg';
  const shippingHeight = heightInput && heightInput.value.trim() !== '' ? (parseFloat(heightInput.value) || null) : null;
  const shippingWidth = widthInput && widthInput.value.trim() !== '' ? (parseFloat(widthInput.value) || null) : null;
  const shippingLength = lengthInput && lengthInput.value.trim() !== '' ? (parseFloat(lengthInput.value) || null) : null;
  const isCodEnabled = codToggle ? codToggle.checked : true;

  const shipping: ProductShipping = {
    weight: shippingWeight,
    weightUnit: shippingWeightUnit,
    dimensions: {
      height: shippingHeight,
      width: shippingWidth,
      length: shippingLength,
      unit: 'cm',
    },
    feeMode: 'default',
    customFee: null,
    codEnabled: isCodEnabled,
  };

  const variantState = variantMgr.getState();
  const rawStock = stockInput && stockInput.value.trim() !== '' ? (parseInt(stockInput.value, 10) || 0) : 0;
  const stock = variantState.hasVariants ? variantState.totalStock : rawStock;

  const primaryImg =
    currentImages.find((img) => img.isPrimary) ||
    (currentImages.length > 0 ? currentImages[0] : null);
  const primaryImageURL = primaryImg ? primaryImg.url : null;
  const primaryImageId = primaryImg ? primaryImg.id : null;

  return {
    name,
    slug,
    sku,
    price,
    compareAtPrice,
    stock,
    lowStockThreshold,
    shortDescription,
    description,
    highlights,
    ingredients,
    usageInstructions,
    fdaRegistrationNumber,
    countryOfOrigin,
    shelfLife,
    categoryId,
    hasVariants: variantState.hasVariants,
    optionGroups: variantState.hasVariants ? variantState.optionGroups : [],
    variants: variantState.hasVariants ? variantState.variants : [],
    images: currentImages,
    primaryImageURL,
    primaryImageId,
    shipping,
  };
}

export function validateForPublish(
  payload: ProductInput,
  variantMgr?: { validate?: () => { isValid: boolean; errors: string[] } }
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!payload.name) {
    errors.push('ชื่อสินค้า (Product Name)');
  }
  if (isNaN(payload.price) || payload.price <= 0) {
    errors.push('ราคาปกติ (Price) ต้องมากกว่า 0');
  }
  const weight = payload.shipping?.weight ?? 0;
  if (weight <= 0) {
    errors.push('น้ำหนักพัสดุ (Shipping Weight) ต้องมากกว่า 0');
  }
  if (payload.hasVariants) {
    if (variantMgr && typeof variantMgr.validate === 'function') {
      const valRes = variantMgr.validate();
      if (!valRes.isValid) {
        errors.push(...valRes.errors);
      }
    }
  } else {
    if (isNaN(payload.stock) || payload.stock < 0) {
      errors.push('จำนวนสต็อก (Stock) ต้องไม่ติดลบ');
    }
  }
  return { isValid: errors.length === 0, errors };
}
