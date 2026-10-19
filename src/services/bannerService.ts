import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { db, storage } from '../lib/firebase';

export const MAX_BANNER_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_BANNER_WIDTH = 1600;

export type BannerImage = { url: string; path: string };

export interface StoreBanner {
  id: string;
  name: string;
  displayOrder: number;
  active: boolean;
  mobileImageUrl: string;
  mobileImagePath: string;
  desktopImageUrl: string;
  desktopImagePath: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type BannerInput = Omit<StoreBanner, 'id' | 'createdAt' | 'updatedAt'>;

const compareBanners = (a: StoreBanner, b: StoreBanner) =>
  a.displayOrder - b.displayOrder || a.name.localeCompare(b.name, 'th');

const normalizeDisplayOrder = (value: number) =>
  Math.max(1, Math.min(99, Math.trunc(Number.isFinite(value) ? value : 1)));

function mapBanner(id: string, data: Record<string, any>): StoreBanner {
  const mobileImageUrl = typeof data.mobileImageUrl === 'string' ? data.mobileImageUrl : '';
  const desktopImageUrl = typeof data.desktopImageUrl === 'string' ? data.desktopImageUrl : '';
  const mobileImagePath = typeof data.mobileImagePath === 'string' ? data.mobileImagePath : '';
  const desktopImagePath = typeof data.desktopImagePath === 'string' ? data.desktopImagePath : '';
  return {
    id,
    name: typeof data.name === 'string' ? data.name : '',
    displayOrder: normalizeDisplayOrder(Number(data.displayOrder)),
    active: data.active === true,
    mobileImageUrl: mobileImageUrl || desktopImageUrl,
    mobileImagePath: mobileImagePath || desktopImagePath,
    desktopImageUrl: desktopImageUrl || mobileImageUrl,
    desktopImagePath: desktopImagePath || mobileImagePath,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export async function getAdminBanners(): Promise<StoreBanner[]> {
  if (!db) throw new Error('Firestore ยังไม่ได้เชื่อมต่อ');
  const snapshot = await getDocs(query(collection(db, 'banners'), orderBy('displayOrder', 'asc')));
  return snapshot.docs.map((item) => mapBanner(item.id, item.data())).sort(compareBanners);
}

export async function getActiveBanners(): Promise<StoreBanner[]> {
  if (!db) return [];
  const snapshot = await getDocs(query(collection(db, 'banners'), where('active', '==', true)));
  return snapshot.docs
    .map((item) => mapBanner(item.id, item.data()))
    .filter((banner) => banner.mobileImageUrl || banner.desktopImageUrl)
    .sort(compareBanners);
}

export async function getBannerById(bannerId: string): Promise<StoreBanner | null> {
  if (!db || !bannerId) return null;
  const snapshot = await getDoc(doc(db, 'banners', bannerId));
  return snapshot.exists() ? mapBanner(snapshot.id, snapshot.data()) : null;
}

export async function uploadBannerImage(
  bannerId: string,
  slot: 'mobile' | 'desktop' | 'shared',
  file: File,
): Promise<BannerImage> {
  if (!storage) throw new Error('Firebase Storage ยังไม่ได้เชื่อมต่อ');
  if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('รองรับเฉพาะไฟล์ JPG, PNG หรือ WEBP');
  }
  if (file.size <= 0 || file.size > MAX_BANNER_IMAGE_SIZE) {
    throw new Error('ขนาดไฟล์แบนเนอร์ต้องไม่เกิน 5 MB');
  }

  let uploadFile = file;
  try {
    const image = await createImageBitmap(file);
    const scale = Math.min(1, MAX_BANNER_WIDTH / image.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const webp = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.82));
      if (webp && webp.size > 0 && webp.size < file.size) {
        uploadFile = new File([webp], `${file.name.replace(/\.[^.]+$/, '')}.webp`, { type: 'image/webp' });
      }
    }
    image.close();
  } catch (error) {
    console.warn('[SOULMATE Banner] Could not optimize selected image:', error);
  }

  const extension = uploadFile.type === 'image/jpeg' ? 'jpg' : uploadFile.type === 'image/png' ? 'png' : 'webp';
  const path = `banners/${bannerId}/${slot}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const imageRef = storageRef(storage, path);
  const snapshot = await uploadBytes(imageRef, uploadFile, {
    contentType: uploadFile.type,
    cacheControl: 'public,max-age=31536000,immutable',
  });
  return { url: await getDownloadURL(snapshot.ref), path };
}

export async function deleteBannerImage(path: string): Promise<void> {
  if (!storage || !path) return;
  try {
    await deleteObject(storageRef(storage, path));
  } catch (error: any) {
    if (error?.code !== 'storage/object-not-found') throw error;
  }
}

export async function createBanner(input: BannerInput): Promise<string> {
  if (!db) throw new Error('Firestore ยังไม่ได้เชื่อมต่อ');
  const bannerRef = doc(collection(db, 'banners'));
  await setDoc(bannerRef, {
    ...input,
    name: input.name.trim(),
    displayOrder: normalizeDisplayOrder(input.displayOrder),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return bannerRef.id;
}

export async function updateBanner(bannerId: string, input: Partial<BannerInput>): Promise<void> {
  if (!db) throw new Error('Firestore ยังไม่ได้เชื่อมต่อ');
  await updateDoc(doc(db, 'banners', bannerId), {
    ...input,
    ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    ...(input.displayOrder !== undefined ? { displayOrder: normalizeDisplayOrder(input.displayOrder) } : {}),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteBanner(banner: StoreBanner): Promise<void> {
  if (!db) throw new Error('Firestore ยังไม่ได้เชื่อมต่อ');
  await deleteDoc(doc(db, 'banners', banner.id));
  await Promise.all([
    deleteBannerImage(banner.mobileImagePath),
    deleteBannerImage(banner.desktopImagePath),
  ]);
}
