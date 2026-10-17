import { doc, getDoc, getDocFromServer, serverTimestamp, writeBatch } from 'firebase/firestore';
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
  orderPrefix?: string;
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

export async function getPublicStoreSettings(): Promise<Pick<StoreSettings, 'logoUrl' | 'announcements' | 'orderPrefix' | 'shippingMethods' | 'paymentMethods'>> {
  if (!db) throw new Error('ระบบตั้งค่าร้านยังไม่ได้เชื่อมต่อ Firebase');
  const snapshot = await getDocFromServer(doc(db, 'settings', 'public'));
  return snapshot.exists() ? snapshot.data() as Pick<StoreSettings, 'logoUrl' | 'announcements' | 'orderPrefix' | 'shippingMethods' | 'paymentMethods'> : {};
}

export async function saveStoreSettings(settings: StoreSettings): Promise<void> {
  if (!db || !auth?.currentUser) throw new Error('กรุณาเข้าสู่ระบบผู้ดูแลก่อนบันทึก');
  const updatedBy = auth.currentUser.uid;
  const batch = writeBatch(db);
  try {
    batch.set(doc(db, 'settings', 'store'), {
      ...settings,
      updatedAt: serverTimestamp(),
      updatedBy,
    }, { merge: true });
    batch.set(doc(db, 'settings', 'public'), {
      logoUrl: settings.logoUrl ?? '',
      announcements: settings.announcements ?? [],
      orderPrefix: settings.orderPrefix ?? 'SM-',
      shippingMethods: settings.shippingMethods ?? [],
      paymentMethods: settings.paymentMethods ?? [],
      updatedAt: serverTimestamp(),
      updatedBy,
    }, { merge: true });
    await batch.commit();
  } catch (error) {
    console.error('[SOULMATE Settings] Failed writing settings batch', error);
    throw new Error(`บันทึกการตั้งค่าร้านและหน้าร้านไม่สำเร็จ: ${error instanceof Error ? error.message : String(error)}`);
  }
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
