import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { CustomerProfile } from '../types/customer';
import type { StoreOrder } from './orderService';

function database() {
  if (!db) throw new Error('ไม่สามารถเชื่อมต่อฐานข้อมูลได้');
  return db;
}

export async function listCustomers(): Promise<CustomerProfile[]> {
  // Older customer profiles use `user`; order authorization still accepts it.
  const snapshot = await getDocs(query(collection(database(), 'users'), where('role', 'in', ['customer', 'user'])));
  return snapshot.docs.map(item => ({ ...item.data(), uid: item.id } as CustomerProfile));
}

export async function getCustomer(uid: string): Promise<CustomerProfile | null> {
  const snapshot = await getDoc(doc(database(), 'users', uid));
  if (!snapshot.exists() || !['customer', 'user'].includes(snapshot.data().role)) return null;
  return { ...snapshot.data(), uid: snapshot.id } as CustomerProfile;
}

export async function listCustomerOrders(uid: string): Promise<StoreOrder[]> {
  const snapshot = await getDocs(query(collection(database(), 'orders'), where('ownerUid', '==', uid)));
  return snapshot.docs.map(item => ({ ...item.data(), id: item.id } as StoreOrder))
    .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
}
