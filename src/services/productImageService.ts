import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { storage } from '../lib/firebase';
import type { ProductImage } from '../types/product';

export const MAX_PRODUCT_IMAGES = 8;
export const MAX_PRODUCT_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

export interface FileValidationResult {
  validFiles: File[];
  errors: string[];
}

type SupportedImageMime = 'image/jpeg' | 'image/png' | 'image/webp';

interface PreparedImageUpload {
  bytes: Uint8Array;
  mimeType: SupportedImageMime;
  extension: 'jpg' | 'png' | 'webp';
}

/**
 * Detect the REAL image type from binary signature bytes.
 *
 * This is intentionally based on the file contents, not only file.name/file.type.
 * It prevents invalid or stringified data from being uploaded as an image.
 */
function detectImageType(bytes: Uint8Array): {
  mimeType: SupportedImageMime;
  extension: 'jpg' | 'png' | 'webp';
} | null {
  // JPEG: FF D8 FF
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return {
      mimeType: 'image/jpeg',
      extension: 'jpg',
    };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return {
      mimeType: 'image/png',
      extension: 'png',
    };
  }

  // WEBP: RIFF....WEBP
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && // R
    bytes[1] === 0x49 && // I
    bytes[2] === 0x46 && // F
    bytes[3] === 0x46 && // F
    bytes[8] === 0x57 && // W
    bytes[9] === 0x45 && // E
    bytes[10] === 0x42 && // B
    bytes[11] === 0x50 // P
  ) {
    return {
      mimeType: 'image/webp',
      extension: 'webp',
    };
  }

  return null;
}

/**
 * Convert a browser File to REAL binary bytes before passing it to Firebase.
 *
 * This is important for this project because product files are selected from an
 * imported iframe-based UI. Passing a cross-window File object directly to the
 * Firebase SDK can result in corrupted tiny objects (for example 9-byte files).
 *
 * We always convert File -> ArrayBuffer -> Uint8Array first.
 */
async function prepareImageFile(file: File): Promise<PreparedImageUpload> {
  if (!file) {
    throw new Error('ไม่พบไฟล์รูปภาพที่เลือก');
  }

  if (typeof file.size !== 'number' || file.size <= 0) {
    throw new Error('ไฟล์รูปภาพไม่ถูกต้องหรือมีขนาด 0 ไบต์');
  }

  if (file.size > MAX_PRODUCT_IMAGE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(`รูปภาพมีขนาด ${sizeMB} MB ซึ่งเกินขนาดสูงสุด 5 MB`);
  }

  if (typeof file.arrayBuffer !== 'function') {
    throw new Error(
      'เบราว์เซอร์ไม่สามารถอ่านข้อมูลไบนารีของไฟล์นี้ได้ กรุณาเลือกไฟล์รูปภาพใหม่'
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  if (bytes.byteLength === 0) {
    throw new Error('ไฟล์รูปภาพว่างเปล่า กรุณาเลือกไฟล์ใหม่');
  }

  if (bytes.byteLength > MAX_PRODUCT_IMAGE_SIZE) {
    const sizeMB = (bytes.byteLength / (1024 * 1024)).toFixed(1);
    throw new Error(`รูปภาพมีขนาด ${sizeMB} MB ซึ่งเกินขนาดสูงสุด 5 MB`);
  }

  // A real image selected by the user should preserve its actual byte count.
  if (bytes.byteLength !== file.size) {
    console.warn('[SOULMATE Product Image] File size mismatch:', {
      name: file.name,
      declaredSize: file.size,
      actualBytes: bytes.byteLength,
    });
  }

  const detected = detectImageType(bytes);

  if (!detected) {
    console.error(
      '[SOULMATE Product Image] Unsupported/invalid binary signature:',
      bytes.slice(0, 20)
    );
    throw new Error(
      'ไฟล์ที่เลือกไม่ใช่รูป JPG, PNG หรือ WEBP ที่สมบูรณ์ กรุณาเลือกรูปใหม่'
    );
  }

  return {
    bytes,
    mimeType: detected.mimeType,
    extension: detected.extension,
  };
}

/**
 * Upload verified bytes and make sure Firebase Storage reports the exact same
 * byte size. If the upload is corrupted, remove the bad object immediately.
 */
async function uploadVerifiedImageBytes(
  path: string,
  prepared: PreparedImageUpload
) {
  if (!storage) {
    throw new Error('ระบบจัดเก็บไฟล์ (Firebase Storage) ยังไม่ได้เปิดใช้งาน');
  }

  const fileRef = storageRef(storage, path);

  const snapshot = await uploadBytes(fileRef, prepared.bytes, {
    contentType: prepared.mimeType,
    cacheControl: 'public,max-age=31536000',
  });

  const uploadedSize =
    typeof snapshot.metadata.size === 'number'
      ? snapshot.metadata.size
      : Number(snapshot.metadata.size);

  console.log('[SOULMATE Product Image] Upload completed:', {
    fullPath: snapshot.ref.fullPath,
    sourceBytes: prepared.bytes.byteLength,
    uploadedBytes: uploadedSize,
    contentType: snapshot.metadata.contentType,
  });

  if (
    !Number.isFinite(uploadedSize) ||
    uploadedSize <= 0 ||
    uploadedSize !== prepared.bytes.byteLength
  ) {
    console.error('[SOULMATE Product Image] Corrupted upload detected:', {
      expected: prepared.bytes.byteLength,
      actual: uploadedSize,
      fullPath: snapshot.ref.fullPath,
    });

    // Do not leave another broken object in Storage.
    try {
      await deleteObject(snapshot.ref);
    } catch (cleanupError) {
      console.warn(
        '[SOULMATE Product Image] Could not remove corrupted upload:',
        cleanupError
      );
    }

    throw new Error(
      `อัปโหลดรูปไม่สมบูรณ์ (ต้นฉบับ ${prepared.bytes.byteLength} bytes / Storage ${uploadedSize} bytes) กรุณาลองใหม่`
    );
  }

  return snapshot;
}

/**
 * Validates selected product image files.
 * - Accept JPG / JPEG / PNG / WEBP only
 * - Maximum 5 MB per image
 * - Maximum 8 images total
 * - Friendly Thai error messages for rejected files
 *
 * NOTE:
 * This is the fast UI validation. uploadProductImageFile() performs a second,
 * stricter binary-signature validation before the real upload.
 */
export function validateProductImages(
  files: FileList | File[],
  currentCount: number
): FileValidationResult {
  const fileArray = Array.from(files);
  const validFiles: File[] = [];
  const errors: string[] = [];

  const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

  let runningCount = currentCount;

  for (const file of fileArray) {
    if (runningCount >= MAX_PRODUCT_IMAGES) {
      errors.push(
        `สามารถอัปโหลดรูปสินค้าได้สูงสุดไม่เกิน ${MAX_PRODUCT_IMAGES} รูป (ปัจจุบันมี ${runningCount} รูป)`
      );
      break;
    }

    if (!file || file.size === 0) {
      errors.push(
        `ไฟล์ "${file?.name || 'ไม่ทราบชื่อ'}" มีขนาด 0 ไบต์ กรุณาเลือกไฟล์รูปภาพที่สมบูรณ์`
      );
      continue;
    }

    const nameParts = file.name.split('.');
    const ext =
      nameParts.length > 1 ? nameParts.pop()!.toLowerCase() : '';
    const isExtValid = allowedExtensions.includes(ext);
    const isMimeValid =
      !file.type || allowedMimeTypes.includes(file.type.toLowerCase());

    if (!isExtValid || (!isMimeValid && file.type)) {
      errors.push(
        `ไฟล์ "${file.name}" ไม่ใช่ประเภทที่รองรับ (รองรับเฉพาะไฟล์ JPG, JPEG, PNG หรือ WEBP เท่านั้น)`
      );
      continue;
    }

    if (file.size > MAX_PRODUCT_IMAGE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      errors.push(
        `ไฟล์ "${file.name}" มีขนาด ${sizeMB} MB ซึ่งเกินขนาดสูงสุด 5 MB`
      );
      continue;
    }

    validFiles.push(file);
    runningCount++;
  }

  return { validFiles, errors };
}

/**
 * Uploads a REAL image binary to Firebase Storage at:
 * products/{productId}/images/{imageId}
 *
 * IMPORTANT:
 * Do NOT pass the iframe File object directly to uploadBytes().
 * The file is converted into Uint8Array first.
 *
 * Returns canonical ProductImage object:
 * { id, url, storagePath, isPrimary }
 */
export async function uploadProductImageFile(
  productId: string,
  file: File,
  isPrimary: boolean = false
): Promise<ProductImage> {
  if (!storage) {
    throw new Error(
      'ระบบจัดเก็บไฟล์ (Firebase Storage) ยังไม่ได้เปิดใช้งาน'
    );
  }

  const cleanProductId = productId?.trim();

  if (!cleanProductId) {
    throw new Error(
      'ไม่พบรหัสสินค้า (Product ID) สำหรับอัปโหลดรูปภาพ'
    );
  }

  console.log('[SOULMATE Product Image] Selected product image:', {
    productId: cleanProductId,
    name: file?.name,
    declaredType: file?.type,
    declaredSize: file?.size,
  });

  // Convert File -> ArrayBuffer -> Uint8Array and validate REAL image bytes.
  const prepared = await prepareImageFile(file);

  // Use the detected real binary type for extension/contentType.
  const imageId = `${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 9)}.${prepared.extension}`;

  const path = `products/${cleanProductId}/images/${imageId}`;

  const snapshot = await uploadVerifiedImageBytes(path, prepared);
  const downloadUrl = await getDownloadURL(snapshot.ref);

  if (!downloadUrl || !downloadUrl.startsWith('https://')) {
    throw new Error(
      'อัปโหลดรูปสำเร็จ แต่ไม่สามารถสร้าง Download URL ของรูปได้'
    );
  }

  return {
    id: imageId,
    url: downloadUrl,
    storagePath: snapshot.ref.fullPath || path,
    isPrimary,
  };
}

/**
 * Asynchronously resolves an image entry to a canonical ProductImage.
 * Supports legacy formats: url, downloadURL, imageURL, storagePath, path, src, etc.
 * If storagePath exists without a valid HTTPS URL, calls
 * getDownloadURL(ref(storage, storagePath)).
 *
 * Never creates fake images or silently removes metadata.
 */
export async function resolveProductImage(
  item: any,
  productId: string,
  index: number = 0,
  isFirst: boolean = false
): Promise<ProductImage> {
  if (!item) {
    const id = `img_${index}_${Date.now()}`;
    return {
      id,
      url: '',
      storagePath: `products/${productId}/images/${id}`,
      isPrimary: isFirst,
    };
  }

  let id = `img_${index}_${Date.now()}`;
  let rawUrl = '';
  let path = '';
  let isPrimary = isFirst;

  if (typeof item === 'string') {
    const trimmed = item.trim();

    if (trimmed.startsWith('https://')) {
      rawUrl = trimmed;
      path = `products/${productId}/images/${id}`;
    } else if (
      trimmed.startsWith('gs://') ||
      trimmed.startsWith('products/')
    ) {
      path = trimmed
        .replace(/^gs:\/\/[^/]+\//, '')
        .replace(/^\/+/, '');
    }
  } else if (typeof item === 'object') {
    id = item.id || item.imageId || id;
    isPrimary = !!item.isPrimary;

    const rawPath = String(
      item.storagePath || item.path || item.filePath || ''
    ).trim();

    path = rawPath
      .replace(/^gs:\/\/[^/]+\//, '')
      .replace(/^\/+/, '');

    const candidates = [
      item.url,
      item.downloadURL,
      item.imageURL,
      item.src,
    ];

    for (const candidate of candidates) {
      if (typeof candidate !== 'string' || !candidate.trim()) {
        continue;
      }

      const value = candidate.trim();

      if (value.startsWith('https://')) {
        rawUrl = value;
        break;
      }

      if (
        !path &&
        (value.startsWith('gs://') || value.startsWith('products/'))
      ) {
        path = value
          .replace(/^gs:\/\/[^/]+\//, '')
          .replace(/^\/+/, '');
      }
    }
  }

  // Never use temporary browser URLs after a reload.
  if (
    rawUrl.startsWith('blob:') ||
    rawUrl.startsWith('data:')
  ) {
    rawUrl = '';
  }

  if (path.startsWith('gs://')) {
    path = path
      .replace(/^gs:\/\/[^/]+\//, '')
      .replace(/^\/+/, '');
  }

  // Prefer resolving the URL from the stable Storage path when needed.
  if (
    (!rawUrl || !rawUrl.startsWith('https://')) &&
    path &&
    storage
  ) {
    try {
      const fileRef = storageRef(storage, path);
      rawUrl = await getDownloadURL(fileRef);
    } catch (err) {
      console.warn(
        `[SOULMATE Product Image] Could not resolve download URL for "${path}":`,
        err
      );
    }
  }

  if (!path) {
    path = `products/${productId}/images/${id}`;
  }

  return {
    id,
    url:
      rawUrl && rawUrl.startsWith('https://')
        ? rawUrl
        : '',
    storagePath: path,
    isPrimary,
  };
}

/**
 * Resolves an entire raw image array for a product and guarantees exactly ONE
 * cover image.
 */
export async function resolveAllProductImages(
  rawImages: any[],
  productId: string,
  primaryImageId?: string | null,
  primaryImageURL?: string | null
): Promise<{
  images: ProductImage[];
  primaryImageURL: string | null;
  primaryImageId: string | null;
}> {
  if (
    !Array.isArray(rawImages) ||
    rawImages.length === 0
  ) {
    return {
      images: [],
      primaryImageURL: null,
      primaryImageId: null,
    };
  }

  const resolved = await Promise.all(
    rawImages.map((img, idx) =>
      resolveProductImage(
        img,
        productId,
        idx,
        idx === 0
      )
    )
  );

  // Preserve legacy metadata entries while resolving their URLs.
  const valid = resolved.filter(
    (img) => img.url || img.storagePath
  );

  if (valid.length > 0) {
    let primaryMatchIdx = -1;

    if (primaryImageId) {
      primaryMatchIdx = valid.findIndex(
        (img) => img.id === primaryImageId
      );
    }

    if (
      primaryMatchIdx === -1 &&
      primaryImageURL
    ) {
      primaryMatchIdx = valid.findIndex(
        (img) => img.url === primaryImageURL
      );
    }

    if (primaryMatchIdx === -1) {
      const currentPrimaryIdx = valid.findIndex(
        (img) => img.isPrimary
      );

      primaryMatchIdx =
        currentPrimaryIdx >= 0
          ? currentPrimaryIdx
          : 0;
    }

    valid.forEach((img, idx) => {
      img.isPrimary = idx === primaryMatchIdx;
    });

    const chosen = valid[primaryMatchIdx];

    return {
      images: valid,
      primaryImageURL: chosen.url || null,
      primaryImageId: chosen.id || null,
    };
  }

  return {
    images: [],
    primaryImageURL: null,
    primaryImageId: null,
  };
}


/**
 * Delete a product gallery image from Firebase Storage.
 *
 * Preferred source of truth:
 *   image.storagePath
 *
 * Fallbacks:
 *   - decode the object path from a Firebase download URL
 *   - products/{productId}/images/{image.id}
 *
 * Missing objects are treated as already deleted.
 */
export async function deleteProductImageFile(
  productId: string,
  image: ProductImage
): Promise<void> {
  if (!storage) {
    throw new Error(
      'ระบบจัดเก็บไฟล์ (Firebase Storage) ยังไม่ได้เปิดใช้งาน'
    );
  }

  const cleanProductId = String(productId || '').trim();
  if (!cleanProductId) {
    throw new Error('ไม่พบรหัสสินค้า (Product ID) สำหรับลบรูปภาพ');
  }

  const normalizeStoragePath = (value: string): string => {
    const trimmed = value.trim();

    if (!trimmed) return '';

    if (trimmed.startsWith('gs://')) {
      return trimmed
        .replace(/^gs:\/\/[^/]+\//, '')
        .replace(/^\/+/, '');
    }

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      try {
        const parsed = new URL(trimmed);
        const match = parsed.pathname.match(/\/o\/(.+)$/);
        if (match?.[1]) {
          return decodeURIComponent(match[1]);
        }
      } catch {
        // Fall through to other strategies.
      }
    }

    return trimmed.replace(/^\/+/, '');
  };

  let path = normalizeStoragePath(image.storagePath || '');

  if (!path && image.url) {
    path = normalizeStoragePath(image.url);
  }

  if (!path && image.id) {
    path = `products/${cleanProductId}/images/${image.id}`;
  }

  if (!path) {
    console.warn(
      '[SOULMATE Product Image] Skip delete: no Storage path found',
      { productId: cleanProductId, image }
    );
    return;
  }

  try {
    const fileRef = storageRef(storage, path);
    await deleteObject(fileRef);

    console.log('[SOULMATE Product Image] Deleted from Storage:', {
      productId: cleanProductId,
      imageId: image.id,
      storagePath: path,
    });
  } catch (err: any) {
    const code = String(err?.code || '');

    if (
      code === 'storage/object-not-found' ||
      code.endsWith('/object-not-found')
    ) {
      console.info(
        '[SOULMATE Product Image] Storage object already absent:',
        path
      );
      return;
    }

    console.error(
      '[SOULMATE Product Image] Failed to delete Storage object:',
      { path, error: err }
    );

    throw err;
  }
}

/**
 * Delete several removed gallery images after the Firestore product save has
 * already succeeded.
 */
export async function deleteProductImageFiles(
  productId: string,
  images: ProductImage[]
): Promise<void> {
  if (!Array.isArray(images) || images.length === 0) return;

  const unique = new Map<string, ProductImage>();

  images.forEach((image) => {
    const key =
      image.storagePath ||
      image.url ||
      image.id ||
      JSON.stringify(image);

    if (!unique.has(key)) {
      unique.set(key, image);
    }
  });

  const results = await Promise.allSettled(
    Array.from(unique.values()).map((image) =>
      deleteProductImageFile(productId, image)
    )
  );

  const failures = results.filter(
    (result): result is PromiseRejectedResult =>
      result.status === 'rejected'
  );

  if (failures.length > 0) {
    throw new Error(
      `ลบไฟล์รูปสินค้าออกจาก Storage ไม่สำเร็จ ${failures.length} ไฟล์`
    );
  }
}

/**
 * Backward-compatible helper used elsewhere in the app.
 */
export async function uploadProductImage(
  productId: string,
  file: File
): Promise<string> {
  const uploaded = await uploadProductImageFile(
    productId,
    file,
    false
  );

  return uploaded.url;
}

/**
 * Validates a single variant image.
 * Accepts JPG, PNG, WEBP up to 5 MB.
 *
 * uploadVariantImage() performs an additional binary-signature check.
 */
export function validateVariantImage(
  file: File
): { valid: boolean; error?: string } {
  if (!file || file.size === 0) {
    return {
      valid: false,
      error: 'กรุณาเลือกไฟล์รูปภาพที่สมบูรณ์',
    };
  }

  const allowedExtensions = [
    'jpg',
    'jpeg',
    'png',
    'webp',
  ];
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
  ];

  const nameParts = file.name.split('.');
  const ext =
    nameParts.length > 1
      ? nameParts.pop()!.toLowerCase()
      : '';

  const isExtValid =
    allowedExtensions.includes(ext);

  const isMimeValid =
    !file.type ||
    allowedMimeTypes.includes(
      file.type.toLowerCase()
    );

  if (
    !isExtValid ||
    (!isMimeValid && file.type)
  ) {
    return {
      valid: false,
      error: `ไฟล์ "${file.name}" ไม่ใช่ประเภทที่รองรับ (รองรับเฉพาะไฟล์ JPG, JPEG, PNG หรือ WEBP เท่านั้น)`,
    };
  }

  if (
    file.size >
    MAX_PRODUCT_IMAGE_SIZE
  ) {
    const sizeMB = (
      file.size /
      (1024 * 1024)
    ).toFixed(1);

    return {
      valid: false,
      error: `ไฟล์ "${file.name}" มีขนาด ${sizeMB} MB ซึ่งเกินขนาดสูงสุด 5 MB`,
    };
  }

  return { valid: true };
}

/**
 * Uploads a REAL variant image binary to Firebase Storage at:
 * products/{productId}/variants/{variantId}/{imageId}
 *
 * Like product gallery uploads, this converts File -> Uint8Array first so
 * iframe/cross-window File objects cannot become corrupted tiny Storage files.
 */
export async function uploadVariantImage(
  productId: string,
  variantId: string,
  file: File
): Promise<string> {
  if (!storage) {
    throw new Error(
      'ระบบจัดเก็บไฟล์ (Firebase Storage) ยังไม่ได้เปิดใช้งาน'
    );
  }

  const cleanProductId =
    productId?.trim();

  const cleanVariantId =
    variantId?.trim();

  if (!cleanProductId) {
    throw new Error(
      'ไม่พบรหัสสินค้า (Product ID) สำหรับอัปโหลดรูปภาพตัวเลือก'
    );
  }

  if (!cleanVariantId) {
    throw new Error(
      'ไม่พบรหัสตัวเลือกสินค้า (Variant ID) สำหรับอัปโหลดรูปภาพ'
    );
  }

  console.log('[SOULMATE Variant Image] Selected image:', {
    productId: cleanProductId,
    variantId: cleanVariantId,
    name: file?.name,
    declaredType: file?.type,
    declaredSize: file?.size,
  });

  const prepared =
    await prepareImageFile(file);

  const imageId = `${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 9)}.${prepared.extension}`;

  const path =
    `products/${cleanProductId}/variants/${cleanVariantId}/${imageId}`;

  const snapshot =
    await uploadVerifiedImageBytes(
      path,
      prepared
    );

  const downloadUrl =
    await getDownloadURL(snapshot.ref);

  if (
    !downloadUrl ||
    !downloadUrl.startsWith('https://')
  ) {
    throw new Error(
      'อัปโหลดรูปตัวเลือกสำเร็จ แต่ไม่สามารถสร้าง Download URL ได้'
    );
  }

  return downloadUrl;
}
