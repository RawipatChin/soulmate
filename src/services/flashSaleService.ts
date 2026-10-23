import {
  collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp,
  Timestamp, updateDoc, where, setDoc,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../lib/firebase';

export const MAX_FLASH_SALE_IMAGE_SIZE = 5 * 1024 * 1024;

export interface FlashSale {
  id: string;
  title: string;
  message: string;
  imageUrl: string;
  imagePath: string;
  linkUrl: string;
  startsAt: Timestamp;
  endsAt: Timestamp;
  active: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type FlashSaleInput = Omit<FlashSale, 'id' | 'createdAt' | 'updatedAt'>;

const firestore = () => {
  if (!db) throw new Error('Firestore ยังไม่ได้เชื่อมต่อ');
  return db;
};

export function normalizeFlashSaleLink(value: string): string {
  const link = value.trim();
  if (!/^\/(?:[A-Za-z0-9_-][A-Za-z0-9/_?=&.%#-]*)?$/.test(link)) {
    throw new Error('ลิงก์ต้องเป็นเส้นทางภายในร้าน เช่น /products');
  }
  return link;
}

export async function listFlashSales(): Promise<FlashSale[]> {
  const snapshot = await getDocs(query(collection(firestore(), 'flashSales'), orderBy('startsAt', 'desc')));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as FlashSale);
}

export async function getFlashSale(id: string): Promise<FlashSale | null> {
  const snapshot = await getDoc(doc(firestore(), 'flashSales', id));
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as FlashSale) : null;
}

export async function getCurrentFlashSale(now = new Date()): Promise<FlashSale | null> {
  if (!db) return null;
  const snapshot = await getDocs(query(collection(db, 'flashSales'), where('active', '==', true)));
  const current = snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as FlashSale)
    .filter((sale) => sale.startsAt?.toDate?.() <= now && sale.endsAt?.toDate?.() > now && sale.imageUrl)
    .sort((a, b) => b.startsAt.toMillis() - a.startsAt.toMillis());
  return current[0] ?? null;
}

export async function uploadFlashSaleImage(id: string, file: File): Promise<{ url: string; path: string }> {
  if (!storage) throw new Error('Firebase Storage ยังไม่ได้เชื่อมต่อ');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('รองรับไฟล์ JPG, PNG หรือ WEBP');
  if (file.size < 1 || file.size > MAX_FLASH_SALE_IMAGE_SIZE) throw new Error('รูปต้องมีขนาดไม่เกิน 5 MB');
  const extension = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp';
  const path = `flash-sales/${id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const uploaded = await uploadBytes(ref(storage, path), file, { contentType: file.type, cacheControl: 'public,max-age=31536000,immutable' });
  return { url: await getDownloadURL(uploaded.ref), path };
}

export async function deleteFlashSaleImage(path: string): Promise<void> {
  if (!storage || !path) return;
  try { await deleteObject(ref(storage, path)); }
  catch (error: any) { if (error?.code !== 'storage/object-not-found') throw error; }
}

export async function saveFlashSale(id: string | null, input: FlashSaleInput): Promise<string> {
  const clean = {
    imageUrl: input.imageUrl,
    imagePath: input.imagePath,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    active: input.active,
    title: input.title.trim(),
    message: input.message.trim(),
    linkUrl: normalizeFlashSaleLink(input.linkUrl),
    updatedAt: serverTimestamp(),
  };
  if (id) {
    await updateDoc(doc(firestore(), 'flashSales', id), clean);
    return id;
  }
  const target = doc(collection(firestore(), 'flashSales'));
  await setDoc(target, { ...clean, createdAt: serverTimestamp() });
  return target.id;
}

export async function setFlashSaleActive(id: string, active: boolean): Promise<void> {
  await updateDoc(doc(firestore(), 'flashSales', id), { active, updatedAt: serverTimestamp() });
}

export async function removeFlashSale(sale: FlashSale): Promise<void> {
  await deleteDoc(doc(firestore(), 'flashSales', sale.id));
  await deleteFlashSaleImage(sale.imagePath).catch((error) => console.warn('[Flash Sale] Image cleanup failed', error));
}
