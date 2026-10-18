import { getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore, Timestamp, type QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';

const app = getApps()[0] ?? initializeApp();
const db = getFirestore(app);
const PAYMENT_HOLD_MILLISECONDS = 24 * 60 * 60 * 1000;
const EXPIRATION_PAGE_SIZE = 100;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Expire unpaid manual PromptPay orders and release their reserved stock.
 * Each order is processed atomically and guarded by its current status so a
 * retry or overlapping invocation cannot restore the same reservation twice.
 */
export const expireUnpaidPromptPayOrders = onSchedule({
  schedule: 'every 10 minutes',
  timeZone: 'Asia/Bangkok',
  maxInstances: 1,
  timeoutSeconds: 540,
}, async () => {
  const cutoff = Timestamp.fromMillis(Date.now() - PAYMENT_HOLD_MILLISECONDS);
  let cursor: QueryDocumentSnapshot | undefined;
  let expiredCount = 0;

  // Page through the complete due set so invalid old orders do not hide newer
  // orders.
  while (true) {
    let dueQuery = db.collection('orders')
      .where('schemaVersion', '==', 2)
      .where('payment.method', '==', 'manual_promptpay')
      .where('status', '==', 'pending_payment')
      .where('createdAt', '<=', cutoff)
      .orderBy('createdAt', 'asc')
      .limit(EXPIRATION_PAGE_SIZE);
    if (cursor) dueQuery = dueQuery.startAfter(cursor);

    const dueOrders = await dueQuery.get();
    if (dueOrders.empty) break;

    for (const candidate of dueOrders.docs) {
      try {
        const expired = await db.runTransaction(async (transaction) => {
          const orderSnapshot = await transaction.get(candidate.ref);
          if (!orderSnapshot.exists) return false;

          const order = orderSnapshot.data();
          const payment = order.payment;
          const createdAt = order.createdAt;
          if (
            order.schemaVersion !== 2 ||
            order.status !== 'pending_payment' ||
            !isRecord(payment) || payment.method !== 'manual_promptpay' ||
            !(createdAt instanceof Timestamp) || createdAt.toMillis() > cutoff.toMillis() ||
            order.inventoryRestored === true
          ) return false;

          if (!Array.isArray(order.items) || order.items.length < 1 || order.items.length > 5) {
            throw new Error('Order has invalid item lines; leaving its reservation unchanged.');
          }

          const lines = order.items.map((rawLine, index) => {
            if (!isRecord(rawLine)) throw new Error(`Order line ${index} is invalid.`);
            const productId = rawLine.productId;
            const variantId = rawLine.variantId;
            const quantity = rawLine.quantity;
            if (
              typeof productId !== 'string' || !productId || productId.includes('/') ||
              !(variantId === null || (typeof variantId === 'string' && variantId && !variantId.includes('/'))) ||
              typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > 99
            ) throw new Error(`Order line ${index} has invalid inventory identifiers or quantity.`);
            const optionId = variantId === null ? 'base' : `v_${variantId}`;
            return {
              ref: db.doc(`inventory/${productId}/options/${optionId}`),
              quantity: quantity as number,
            };
          });
          if (new Set(lines.map((line) => line.ref.path)).size !== lines.length) {
            throw new Error('Order contains duplicate inventory options; leaving its reservation unchanged.');
          }

          // Firestore requires all transaction reads before any writes.
          const inventorySnapshots = await Promise.all(lines.map((line) => transaction.get(line.ref)));
          for (let index = 0; index < inventorySnapshots.length; index += 1) {
            const inventory = inventorySnapshots[index].data();
            const available = inventory?.available;
            if (!inventorySnapshots[index].exists || typeof available !== 'number' || !Number.isSafeInteger(available) || available < 0) {
              throw new Error(`Inventory option ${lines[index].ref.path} is missing or invalid.`);
            }
          }

          for (let index = 0; index < lines.length; index += 1) {
            const currentAvailable = inventorySnapshots[index].data()!.available as number;
            transaction.update(lines[index].ref, { available: currentAvailable + lines[index].quantity });
          }
          transaction.update(candidate.ref, {
            status: 'expired',
            'payment.status': 'expired',
            inventoryRestored: true,
            updatedAt: FieldValue.serverTimestamp(),
          });
          return true;
        });
        if (expired) expiredCount += 1;
      } catch (error) {
        logger.error('Unable to expire PromptPay order and restore inventory', {
          orderId: candidate.id,
          error,
        });
      }
    }

    cursor = dueOrders.docs[dueOrders.docs.length - 1];
    if (dueOrders.size < EXPIRATION_PAGE_SIZE) break;
  }

  if (expiredCount > 0) logger.info('Expired unpaid PromptPay orders', { count: expiredCount });
});
