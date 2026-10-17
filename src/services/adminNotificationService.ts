import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { StoreOrder } from './orderService';

export type AdminNotificationKind = 'new_order' | 'slip_review' | 'cod_confirmation';

export interface AdminNotification {
  id: string;
  orderId: string;
  orderNumber: string;
  kind: AdminNotificationKind;
  statusLabel: string;
  detail: string;
  createdAtMillis: number;
}

const buyerName = (order: StoreOrder) =>
  [order.contact?.firstName, order.contact?.lastName].filter(Boolean).join(' ') || 'ไม่ระบุชื่อผู้รับ';

const money = (satang: number) => `฿${(Number(satang || 0) / 100).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;

function toNotification(order: StoreOrder): AdminNotification | null {
  if (['failed', 'expired', 'cancelled'].includes(order.payment?.status ?? '')) return null;

  let kind: AdminNotificationKind;
  let statusLabel: string;

  if (order.status === 'awaiting_review') {
    kind = 'slip_review';
    statusLabel = 'รอตรวจสลิป';
  } else if (order.status === 'pending_payment' && order.payment?.method === 'cod' && !order.codAcceptance) {
    kind = 'cod_confirmation';
    statusLabel = 'รอยืนยัน COD';
  } else if (order.status === 'pending_payment' && order.payment?.method !== 'cod') {
    kind = 'new_order';
    statusLabel = order.payment?.method === 'manual_promptpay' ? 'รอชำระเงิน' : 'รอแจ้งวิธีชำระเงิน';
  } else {
    return null;
  }

  return {
    id: `${kind}:${order.id}`,
    orderId: order.id,
    orderNumber: order.orderNumber || order.id,
    kind,
    statusLabel,
    detail: `${buyerName(order)} · ${money(order.totalSatang)}`,
    createdAtMillis: order.createdAt?.toMillis?.() ?? 0,
  };
}

export function buildAdminNotifications(orders: StoreOrder[]): AdminNotification[] {
  return orders
    .map(toNotification)
    .filter((item): item is AdminNotification => item !== null)
    .sort((a, b) => b.createdAtMillis - a.createdAtMillis);
}

export function subscribeToAdminNotifications(
  onOrders: (orders: StoreOrder[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!db) {
    onError(new Error('ยังไม่ได้เชื่อมต่อ Firestore'));
    return () => undefined;
  }

  const recentOrders = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(100));
  return onSnapshot(recentOrders, (snapshot) => {
    onOrders(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as StoreOrder)));
  }, (error) => onError(error));
}
