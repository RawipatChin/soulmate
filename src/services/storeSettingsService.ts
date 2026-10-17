import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from '../lib/firebase';

export interface ShippingMethodSetting {
  id: string;
  name: string;
  fee: number;
  freeShippingThreshold: number | null;
  enabled: boolean;
}

export interface StoreSettings {
  storeName?: string;
  contactEmail?: string;
  contactPhone?: string;
  lineOfficial?: string;
  storeAddress?: string;
  logoUrl?: string;
  shippingMethods?: ShippingMethodSetting[];
  paymentMethods?: Array<{ id: string; enabled: boolean }>;
  announcements?: string[];
  updatedAt?: unknown;
}

export async function getStoreSettings(): Promise<StoreSettings> {
  if (!db) throw new Error('ระบบตั้งค่าร้านยังไม่ได้เชื่อมต่อ Firebase');
  const snapshot = await getDoc(doc(db, 'settings', 'store'));
  return snapshot.exists() ? snapshot.data() as StoreSettings : {};
}

export async function getPublicStoreSettings(): Promise<Pick<StoreSettings, 'logoUrl' | 'announcements'>> {
  if (!db) throw new Error('ระบบตั้งค่าร้านยังไม่ได้เชื่อมต่อ Firebase');
  const snapshot = await getDoc(doc(db, 'settings', 'public'));
  return snapshot.exists() ? snapshot.data() as Pick<StoreSettings, 'logoUrl' | 'announcements'> : {};
}

export async function saveStoreSettings(settings: StoreSettings): Promise<void> {
  if (!db || !auth?.currentUser) throw new Error('กรุณาเข้าสู่ระบบผู้ดูแลก่อนบันทึก');
  const updatedAt = serverTimestamp();
  const updatedBy = auth.currentUser.uid;
  await setDoc(doc(db, 'settings', 'store'), {
    ...settings,
    updatedAt,
    updatedBy,
  }, { merge: true });
  await setDoc(doc(db, 'settings', 'public'), {
    logoUrl: settings.logoUrl ?? '',
    announcements: settings.announcements ?? [],
    updatedAt: serverTimestamp(),
    updatedBy,
  }, { merge: true });
}

export async function uploadStoreLogo(file: File): Promise<string> {
  if (!storage || !auth?.currentUser) throw new Error('กรุณาเข้าสู่ระบบผู้ดูแลก่อนอัปโหลด');
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 5 * 1024 * 1024) {
    throw new Error('เลือกรูป PNG, JPG หรือ WebP ขนาดไม่เกิน 5 MB');
  }
  const path = `store/logo/${auth.currentUser.uid}`;
  const image = new Blob([await file.arrayBuffer()], { type: file.type });
  const uploaded = await uploadBytes(ref(storage, path), image, { contentType: file.type });
  return getDownloadURL(uploaded.ref);
}
