import { signInAnonymously } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../lib/firebase';

export type GuidanceTurn = { role: 'user' | 'assistant'; text: string };
export type GuidanceCard = {
  productId: string; variantId: string | null; name: string; variantName: string;
  price: number; available: boolean; href: string; imageUrl: string | null;
  evidence: { field: string; quote: string }[];
};
export type GuidanceResponse = { kind: string; message: string; products: GuidanceCard[]; unavailable: GuidanceCard[] };

export async function askProductGuidance(message: string, history: GuidanceTurn[]): Promise<GuidanceResponse> {
  if (!auth || !functions) throw new Error('พื้นที่ถามตอบยังไม่ได้ตั้งค่าการเชื่อมต่อ กรุณาลองใหม่ภายหลัง');
  try {
    await auth.authStateReady();
    if (!auth.currentUser) await signInAnonymously(auth);
    const call = httpsCallable<{ message: string; history: GuidanceTurn[] }, GuidanceResponse>(functions, 'productGuidanceChat', { timeout: 55000 });
    return (await call({ message, history: history.slice(-10).map(t => ({ role: t.role, text: t.text.slice(0, 2000) })) })).data;
  } catch (error: any) {
    const messages: Record<string, string> = {
      'functions/resource-exhausted': 'ถึงขีดจำกัดการใช้งานช่วงนี้แล้ว กรุณาลองใหม่ภายหลัง',
      'functions/failed-precondition': 'พื้นที่ถามตอบยังไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง',
      'functions/not-found': 'พื้นที่ถามตอบยังไม่เปิดใช้งาน กรุณาลองใหม่ภายหลัง',
      'functions/invalid-argument': 'กรุณาพิมพ์คำถามไม่เกิน 2,000 ตัวอักษร',
      'functions/deadline-exceeded': 'ใช้เวลาตอบนานกว่าปกติ กรุณาลองส่งคำถามอีกครั้ง',
      'auth/operation-not-allowed': 'พื้นที่ถามตอบยังไม่ได้เปิดการเชื่อมต่อสำหรับผู้เยี่ยมชม',
    };
    throw new Error(messages[error?.code] ?? 'เชื่อมต่อบริการถามตอบไม่ได้ กรุณาลองใหม่อีกครั้ง');
  }
}
