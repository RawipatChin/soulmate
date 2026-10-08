import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';

const projectId = process.env.GCLOUD_PROJECT || 'demo-soulmate';
const requireFunctions = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp: initializeAdminApp, deleteApp: deleteAdminApp } = requireFunctions('firebase-admin/app');
const { getFirestore: getAdminFirestore } = requireFunctions('firebase-admin/firestore');
const { Timestamp } = requireFunctions('firebase-admin/firestore');
const adminApp = initializeAdminApp({ projectId }, 'smoke-admin');
const host = '127.0.0.1';
const productId = `smoke-${randomUUID()}`;
const unitPriceSatang = 12950;
const contact = {
  firstName: 'Test', lastName: 'Buyer', phone: '0800000000',
  email: 'buyer@example.test', addressLine1: '1 Test Road',
  subdistrict: 'Test', district: 'Test', province: 'กรุงเทพมหานคร', postalCode: '10000',
};
const line = { productId, variantId: null, quantity: 1, expectedPriceSatang: unitPriceSatang };
const apps = [];

function client(name) {
  const app = initializeApp({ apiKey: 'fake-api-key', authDomain: `${projectId}.firebaseapp.com`, projectId, appId: '1:123:web:smoke' }, name);
  apps.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, host, 8080);
  const functions = getFunctions(app);
  connectFunctionsEmulator(functions, host, 5001);
  return {
    auth, db,
    createOrder: httpsCallable(functions, 'createPendingOrder'),
    reconcile: httpsCallable(functions, 'reconcileOrderExpirations'),
  };
}

async function seedProduct() {
  await getAdminFirestore(adminApp).doc(`products/${productId}`).set({
    name: 'Smoke test product', status: 'active', price: 129.5, stock: 4,
  });
}

async function main() {
  await seedProduct();
  const guest = client('guest');
  const guestUser = (await signInAnonymously(guest.auth)).user;
  const key = randomUUID().replaceAll('-', '');
  const payload = { idempotencyKey: key, contact, items: [line] };
  const first = (await guest.createOrder(payload)).data;
  assert.equal(first.ownerType, 'guest');
  assert.equal(first.replay, false);
  assert.ok(first.orderNumber);
  const repeat = (await guest.createOrder(payload)).data;
  assert.equal(repeat.orderId, first.orderId);
  assert.equal(repeat.replay, true);
  const guestOrder = await getDoc(doc(guest.db, 'orders', first.orderId));
  assert.equal(guestOrder.data().ownerUid, guestUser.uid);
  assert.equal(guestOrder.data().status, 'pending_payment');
  assert.equal(guestOrder.data().payment.method, null);
  assert.equal(guestOrder.data().payment.chargeId, null);
  assert.equal(guestOrder.data().totalSatang, unitPriceSatang + 3000);
  assert.equal((await getDoc(doc(guest.db, 'products', productId))).data().stock, 3);

  await assert.rejects(
    guest.createOrder({ ...payload, idempotencyKey: randomUUID().replaceAll('-', ''), items: [{ ...line, expectedPriceSatang: 1 }] }),
    (error) => error.code === 'functions/failed-precondition',
  );
  assert.equal((await getDoc(doc(guest.db, 'products', productId))).data().stock, 3);

  const customer = client('customer');
  const customerUser = (await createUserWithEmailAndPassword(customer.auth, `buyer-${randomUUID()}@example.test`, 'test-password-123')).user;
  await setDoc(doc(customer.db, 'users', customerUser.uid), {
    email: customerUser.email, role: 'customer', status: 'active',
    completedOrderCount: 0, lifetimeSpend: 0,
  });
  const customerOrder = (await customer.createOrder({ ...payload, idempotencyKey: randomUUID().replaceAll('-', '') })).data;
  assert.equal(customerOrder.ownerType, 'customer');
  assert.equal((await getDoc(doc(customer.db, 'orders', customerOrder.orderId))).data().ownerUid, customerUser.uid);
  assert.equal((await getDoc(doc(customer.db, 'products', productId))).data().stock, 2);

  await assert.rejects(getDoc(doc(guest.db, 'orders', customerOrder.orderId)), (error) => error.code === 'permission-denied');
  await assert.rejects(setDoc(doc(guest.db, 'orders', first.orderId), { totalSatang: 1 }), (error) => error.code === 'permission-denied');

  await getAdminFirestore(adminApp).doc(`orders/${first.orderId}`).update({ expiresAt: Timestamp.fromMillis(Date.now() - 1) });
  await guest.reconcile({ orderIds: [first.orderId] });
  assert.equal((await getDoc(doc(guest.db, 'orders', first.orderId))).data().status, 'expired');
  assert.equal((await getDoc(doc(guest.db, 'products', productId))).data().stock, 3);
  await guest.reconcile({ orderIds: [first.orderId] });
  assert.equal((await getDoc(doc(guest.db, 'products', productId))).data().stock, 3);
  console.log('PASS guest/customer orders persisted; replay reserved once; price, access, and expiry checks passed');
}

try {
  await main();
} finally {
  await Promise.all(apps.map((app) => deleteApp(app)));
  await deleteAdminApp(adminApp);
}
