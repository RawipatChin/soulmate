import {
  collection,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
  doc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { CustomerProfile } from '../types/customer';

export type StaffRole = 'customer' | 'admin' | 'super_admin';

function database() {
  if (!db) throw new Error('ไม่สามารถเชื่อมต่อฐานข้อมูลได้');
  return db;
}

export async function listRoleManagedUsers(): Promise<CustomerProfile[]> {
  const snapshot = await getDocs(collection(database(), 'users'));
  return snapshot.docs.map((item) => ({ ...item.data(), uid: item.id } as CustomerProfile))
    .filter((profile) => ['customer', 'user', 'admin', 'super_admin'].includes(profile.role))
    .sort((first, second) => (first.displayName || first.email).localeCompare(second.displayName || second.email, 'th'));
}

export async function changeUserRole(uid: string, role: StaffRole): Promise<void> {
  const firestore = database();
  const targetRef = doc(firestore, 'users', uid);

  try {
    const activeSuperAdmins = await getDocs(query(
      collection(firestore, 'users'),
      where('role', '==', 'super_admin'),
      where('status', '==', 'active'),
    ));

    await runTransaction(firestore, async (transaction) => {
      const target = await transaction.get(targetRef);
      if (!target.exists()) throw new Error('ไม่พบบัญชีนี้');
      if (target.get('status') !== 'active') throw new Error('เปลี่ยน role ได้เฉพาะบัญชีที่ใช้งานอยู่');

      const previousRole = target.get('role');
      if (!['customer', 'user', 'admin', 'super_admin'].includes(previousRole)) {
        throw new Error('role ปัจจุบันไม่รองรับ');
      }
      if (previousRole === role) return;

      if (previousRole === 'super_admin' && role !== 'super_admin') {
        if (activeSuperAdmins.size <= 1) {
          throw new Error('ต้องมี Super Admin ที่ใช้งานได้อย่างน้อยหนึ่งบัญชี');
        }
      }

      transaction.update(targetRef, { role, updatedAt: serverTimestamp() });
    });
  } catch (error) {
    if (error instanceof Error && error.message !== 'Missing or insufficient permissions.') throw error;
    throw new Error('ไม่มีสิทธิ์เปลี่ยน role หรือข้อมูลเปลี่ยนไปแล้ว กรุณารีเฟรชแล้วลองอีกครั้ง');
  }
}
