import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, updateDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, ref, uploadBytes, getBytes } from 'firebase/storage';

const projectId = process.env.GCLOUD_PROJECT || 'demo-soulmate';
const requireFunctions = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp: adminInitialize, deleteApp: adminDelete } = requireFunctions('firebase-admin/app');
const { getFirestore: adminFirestore, Timestamp } = requireFunctions('firebase-admin/firestore');
const adminApp = adminInitialize({ projectId }, 'rules-smoke-admin');
const adminDb = adminFirestore(adminApp);
const productId = `rules-smoke-${randomUUID()}`;
const stockPath = `inventory/${productId}/options/base`;
const apps = [];
const contact = { firstName: 'Test', lastName: 'Buyer', phone: '0800000000', email: 'buyer@example.test', addressLine1: '1 Test Road', subdistrict: 'Test', district: 'Test', province: 'กรุงเทพมหานคร', postalCode: '10000' };
const currentOrderYear = Number(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Bangkok', year: 'numeric' }).format(new Date()));

async function nextOrderNumber(tx, db, orderId) {
  const settingsRef = doc(db, 'settings', 'public');
  const snapshot = await tx.get(settingsRef);
  const settings = snapshot.data() ?? {};
  const sequence = Number(settings.orderSequenceYear) === currentOrderYear ? Number(settings.orderSequence ?? 0) + 1 : 1;
  const orderNumber = `SM-${currentOrderYear}${String(sequence).padStart(4, '0')}`;
  tx.set(settingsRef, { orderSequenceYear: currentOrderYear, orderSequence: sequence, orderSequenceText: orderNumber, orderSequenceOrderId: orderId }, { merge: true });
  return orderNumber;
}

function client(name) {
  const app = initializeApp({ apiKey: 'fake-api-key', authDomain: `${projectId}.firebaseapp.com`, projectId, appId: '1:123:web:smoke', storageBucket: `${projectId}.firebasestorage.app` }, name);
  apps.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8081);
  const storage = getStorage(app);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
  return { auth, db, storage };
}

async function place(buyer, quantity, { id = randomUUID().replaceAll('-', ''), price = 12950, total, method = 'manual_promptpay', orderNumberOverride, stockProductId = productId, shippingMethodId = 'standard', shippingFeeSatang = 3000 } = {}) {
  const orderStockPath = `inventory/${stockProductId}/options/base`;
  await runTransaction(buyer.db, async (tx) => {
    const orderRef = doc(buyer.db, 'orders', id);
    if ((await tx.get(orderRef)).exists()) return;
    const stockRef = doc(buyer.db, orderStockPath);
    const settingsRef = doc(buyer.db, 'settings', 'public');
    const settingsSnapshot = await tx.get(settingsRef);
    const stock = (await tx.get(stockRef)).data();
    if (stock.available < quantity) throw new Error('insufficient stock');
    const settings = settingsSnapshot.data() ?? {};
    const sequence = Number(settings.orderSequenceYear) === currentOrderYear ? Number(settings.orderSequence ?? 0) + 1 : 1;
    const orderNumber = orderNumberOverride ?? `SM-${currentOrderYear}${String(sequence).padStart(4, '0')}`;
    tx.set(settingsRef, { orderSequenceYear: currentOrderYear, orderSequence: sequence, orderSequenceText: orderNumber, orderSequenceOrderId: id }, { merge: true });
    tx.update(stockRef, { available: stock.available - quantity, lastOrderId: id, lastOrderLine: 0 });
    tx.set(orderRef, {
      schemaVersion: 2, orderNumber,
      ownerUid: buyer.auth.currentUser.uid, ownerType: buyer.auth.currentUser.isAnonymous ? 'guest' : 'customer',
      contact, items: [{ productId: stockProductId, optionId: 'base', productName: 'Rules smoke product', variantId: null, variantName: null, unitPriceSatang: price, quantity, productImage: null, lineTotalSatang: price * quantity }],
      subtotalSatang: price * quantity, shippingMethodId, shippingFeeSatang, totalSatang: total ?? price * quantity + shippingFeeSatang,
      currency: 'THB', status: 'pending_payment',
      payment: { method, status: 'pending', promptPayPhone: method === 'cod' ? null : '0812345678' },
      fulfillmentStatus: method === 'cod' ? 'awaiting_cod_acceptance' : 'awaiting_payment', codAcceptance: null, shippingRevision: 0,
      slipPath: null, submittedAt: null, review: null, inventoryRestored: false,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
  });
  return id;
}

async function review(admin, id, action) {
  await runTransaction(admin.db, async (tx) => {
    const orderRef = doc(admin.db, 'orders', id);
    const order = (await tx.get(orderRef)).data();
    if (['paid', 'cancelled'].includes(order.status)) return;
    if (action === 'cancelled') {
      const stockRef = doc(admin.db, stockPath);
      const stock = (await tx.get(stockRef)).data();
      tx.update(stockRef, { available: stock.available + order.items[0].quantity, lastOrderId: id });
    }
    tx.update(orderRef, {
      status: action === 'approved' ? 'paid' : 'cancelled',
      'payment.status': action === 'approved' ? 'successful' : 'cancelled',
      ...(action === 'approved' ? { fulfillmentStatus: order.payment.method === 'cod' ? 'shipped' : 'ready_to_prepare' } : {}),
      ...(action === 'cancelled' ? { inventoryRestored: true } : {}),
      review: { by: admin.auth.currentUser.uid, at: serverTimestamp(), result: action, reason: action === 'cancelled' ? 'สลิปไม่ผ่าน' : '' },
      updatedAt: serverTimestamp(),
    });
  });
}

async function main() {
  await adminDb.doc('config/payment').set({ phone: '0812345678', payeeName: 'SOULMATE', enabled: true });
  await adminDb.doc('settings/public').set({
    shippingMethods: [
      { id: 'standard', name: 'Standard', fee: 30, freeShippingThreshold: null, enabled: true },
      { id: 'express-province', name: 'Express province', fee: 45, freeShippingThreshold: 2000, enabled: true },
    ],
    paymentMethods: [{ id: 'promptpay', enabled: true }, { id: 'cod', enabled: true }], orderPrefix: 'SM-',
  });
  await adminDb.doc('settings/store').set({ storeName: 'SOULMATE', storeAddress: '1 Test Road, Bangkok 10000', contactPhone: '0812345678' });
  await adminDb.doc(stockPath).set({ productId, variantId: null, productName: 'Rules smoke product', variantName: null, unitPriceSatang: 12950, stock: 7, available: 7, active: true, productImage: null, lastOrderId: null, lastOrderLine: null });
  const shippingMatrixProductId = `rules-shipping-matrix-${randomUUID()}`;
  await adminDb.doc(`inventory/${shippingMatrixProductId}/options/base`).set({
    productId: shippingMatrixProductId, variantId: null, productName: 'Shipping matrix product', variantName: null,
    unitPriceSatang: 250000, stock: 20, available: 20, active: true, productImage: null, lastOrderId: null, lastOrderLine: null,
  });
  const buyer = client('rules-buyer'), outsider = client('rules-outsider'), admin = client('rules-admin');
  await signInAnonymously(buyer.auth);
  await signInAnonymously(outsider.auth);
  const email = `admin-${randomUUID()}@example.test`;
  const adminUser = (await createUserWithEmailAndPassword(admin.auth, email, 'test-password-123')).user;
  await adminDb.doc(`users/${adminUser.uid}`).set({ email, role: 'admin', status: 'active' });
  await assert.rejects(setDoc(doc(admin.db, 'config', 'payment'), { phone: '0899999999', payeeName: 'Wrong', enabled: true, updatedAt: serverTimestamp(), updatedBy: adminUser.uid }));
  await adminDb.doc(`users/${adminUser.uid}`).update({ role: 'super_admin' });
  await setDoc(doc(admin.db, 'config', 'payment'), { phone: '0812345678', payeeName: 'SOULMATE', enabled: true, updatedAt: serverTimestamp(), updatedBy: adminUser.uid });
  await adminDb.doc(`users/${adminUser.uid}`).update({ role: 'admin' });

  // Checkout combinations: each payment method with each shipping option,
  // both below and above the express free-shipping threshold.
  for (const shipping of [
    { id: 'standard', fee: 3000, threshold: null },
    { id: 'express-province', fee: 4500, threshold: 2000 },
  ]) {
    for (const method of ['manual_promptpay', 'cod']) {
      for (const price of [12950, 250000]) {
        const free = shipping.threshold != null && price >= shipping.threshold * 100;
        const shippingFeeSatang = free ? 0 : shipping.fee;
        await adminDb.doc(`inventory/${shippingMatrixProductId}/options/base`).update({ unitPriceSatang: price });
        await place(buyer, 1, {
          method, price, stockProductId: shippingMatrixProductId,
          shippingMethodId: shipping.id, shippingFeeSatang,
        });
      }
    }
  }

  const adminOrderId = await place(admin, 1);
  assert.equal((await adminDb.doc(`orders/${adminOrderId}`).get()).data()?.ownerUid, adminUser.uid);
  await review(admin, adminOrderId, 'cancelled');
  assert.equal((await adminDb.doc(stockPath).get()).data().available, 7);

  await assert.rejects(updateDoc(doc(buyer.db, stockPath), { available: 6, lastOrderId: 'no-order' }));
  for (const changes of [{ price: 1 }, { total: 1 }, { orderNumberOverride: `SM-${currentOrderYear}99999999` }]) {
    const id = randomUUID().replaceAll('-', '');
    await assert.rejects(place(buyer, 1, { id, ...changes }));
    assert.equal((await adminDb.doc(stockPath).get()).data().available, 7);
    assert.equal((await adminDb.doc(`orders/${id}`).get()).exists, false);
  }
  const firstId = await place(buyer, 1);
  await place(buyer, 1, { id: firstId });
  assert.equal((await adminDb.doc(stockPath).get()).data().available, 6);
  await assert.rejects(getDoc(doc(outsider.db, 'orders', firstId)));
  await assert.rejects(getBytes(ref(outsider.storage, `orders/${firstId}/slip`)));

  const slip = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const secondId = await place(buyer, 1);
  await assert.rejects(uploadBytes(ref(outsider.storage, `orders/${secondId}/slip`), slip, { contentType: 'image/png' }));
  await uploadBytes(ref(buyer.storage, `orders/${secondId}/slip`), slip, { contentType: 'image/png' });
  await updateDoc(doc(buyer.db, 'orders', secondId), { status: 'awaiting_review', slipPath: `orders/${secondId}/slip`, submittedAt: serverTimestamp(), updatedAt: serverTimestamp() });
  await assert.rejects(getBytes(ref(outsider.storage, `orders/${secondId}/slip`)));
  assert.ok((await getBytes(ref(admin.storage, `orders/${secondId}/slip`))).byteLength > 0);
  await adminDb.doc(`orders/${secondId}`).update({ createdAt: Timestamp.fromMillis(Date.now() - 25 * 3600_000) });
  await review(admin, secondId, 'approved');
  await review(admin, secondId, 'approved');
  assert.equal((await adminDb.doc(`orders/${secondId}`).get()).data().status, 'paid');
  assert.equal((await adminDb.doc(stockPath).get()).data().available, 5);

  const rejectedId = await place(buyer, 1);
  await uploadBytes(ref(buyer.storage, `orders/${rejectedId}/slip`), slip, { contentType: 'image/png' });
  await updateDoc(doc(buyer.db, 'orders', rejectedId), { status: 'awaiting_review', slipPath: `orders/${rejectedId}/slip`, submittedAt: serverTimestamp(), updatedAt: serverTimestamp() });
  await review(admin, rejectedId, 'cancelled');
  await review(admin, rejectedId, 'cancelled');
  assert.equal((await adminDb.doc(stockPath).get()).data().available, 5);

  const expiredId = await place(buyer, 1);
  await adminDb.doc(`orders/${expiredId}`).update({ createdAt: Timestamp.fromMillis(Date.now() - 25 * 3600_000) });
  await assert.rejects(uploadBytes(ref(buyer.storage, `orders/${expiredId}/slip`), slip, { contentType: 'image/png' }));
  await assert.rejects(updateDoc(doc(buyer.db, 'orders', expiredId), { status: 'awaiting_review', slipPath: `orders/${expiredId}/slip`, submittedAt: serverTimestamp(), updatedAt: serverTimestamp() }));
  await review(admin, expiredId, 'cancelled');
  await review(admin, expiredId, 'cancelled');
  assert.equal((await adminDb.doc(stockPath).get()).data().available, 5);

  const concurrent = await Promise.allSettled([place(buyer, 3), place(outsider, 3)]);
  assert.equal(concurrent.filter((item) => item.status === 'fulfilled').length, 1);
  assert.equal((await adminDb.doc(stockPath).get()).data().available, 2);

  const concurrentProductId = `rules-concurrent-${randomUUID()}`;
  await adminDb.doc(`inventory/${concurrentProductId}/options/base`).set({
    productId: concurrentProductId, variantId: null, productName: 'Concurrent number product', variantName: null,
    unitPriceSatang: 12950, stock: 2, available: 2, active: true, productImage: null, lastOrderId: null, lastOrderLine: null,
  });
  const concurrentNumberOrders = await Promise.all([
    place(buyer, 1, { stockProductId: concurrentProductId }),
    place(outsider, 1, { stockProductId: concurrentProductId }),
  ]);
  const concurrentNumbers = await Promise.all(concurrentNumberOrders.map(async (id) => (await adminDb.doc(`orders/${id}`).get()).data()?.orderNumber));
  assert.equal(new Set(concurrentNumbers).size, 2);
  assert.ok(concurrentNumbers.every((number) => typeof number === 'string' && number.startsWith(`SM-${currentOrderYear}`)));

  const fiveIds = [productId, ...Array.from({ length: 4 }, () => `rules-smoke-${randomUUID()}`)];
  for (const id of fiveIds.slice(1)) await adminDb.doc(`inventory/${id}/options/base`).set({ productId: id, variantId: null, productName: 'Rules smoke product', variantName: null, unitPriceSatang: 12950, stock: 1, available: 1, active: true, productImage: null, lastOrderId: null, lastOrderLine: null });
  const fiveOrderId = randomUUID().replaceAll('-', '');
  await runTransaction(buyer.db, async (tx) => {
    const orderRef = doc(buyer.db, 'orders', fiveOrderId);
    await tx.get(orderRef);
    const refs = fiveIds.map((id) => doc(buyer.db, 'inventory', id, 'options', 'base'));
    const stocks = await Promise.all(refs.map((item) => tx.get(item)));
    const orderNumber = await nextOrderNumber(tx, buyer.db, fiveOrderId);
    refs.forEach((item, index) => tx.update(item, { available: stocks[index].data().available - 1, lastOrderId: fiveOrderId, lastOrderLine: index }));
    tx.set(orderRef, {
      schemaVersion: 2, orderNumber,
      ownerUid: buyer.auth.currentUser.uid, ownerType: 'guest', contact,
      items: fiveIds.map((id) => ({ productId: id, optionId: 'base', productName: 'Rules smoke product', variantId: null, variantName: null, unitPriceSatang: 12950, quantity: 1, productImage: null, lineTotalSatang: 12950 })),
      subtotalSatang: 64750, shippingFeeSatang: 3000, totalSatang: 67750, currency: 'THB',
      status: 'pending_payment', payment: { method: 'manual_promptpay', status: 'pending', promptPayPhone: '0812345678' },
      fulfillmentStatus: 'awaiting_payment', codAcceptance: null, shippingRevision: 0,
      slipPath: null, submittedAt: null, review: null, inventoryRestored: false,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
  });
  assert.equal((await adminDb.doc(stockPath).get()).data().available, 1);
  await runTransaction(admin.db, async (tx) => {
    const orderRef = doc(admin.db, 'orders', fiveOrderId);
    const refs = fiveIds.map((id) => doc(admin.db, 'inventory', id, 'options', 'base'));
    const order = await tx.get(orderRef);
    const stocks = await Promise.all(refs.map((item) => tx.get(item)));
    refs.forEach((item, index) => tx.update(item, { available: stocks[index].data().available + 1, lastOrderId: fiveOrderId }));
    tx.update(orderRef, { status: 'cancelled', 'payment.status': 'cancelled', inventoryRestored: true, review: { by: adminUser.uid, at: serverTimestamp(), result: 'cancelled', reason: 'test' }, updatedAt: serverTimestamp() });
    assert.equal(order.data().status, 'pending_payment');
  });
  assert.equal((await adminDb.doc(stockPath).get()).data().available, 2);
  const adminMultiIds = [0, 1].map(() => `rules-admin-${randomUUID()}`);
  for (const id of adminMultiIds) await adminDb.doc(`inventory/${id}/options/base`).set({
    productId: id, variantId: null, productName: 'Admin checkout product', variantName: null,
    unitPriceSatang: 12950, stock: 1, available: 1, active: true,
    productImage: null, lastOrderId: null, lastOrderLine: null,
  });
  const adminMultiOrderId = randomUUID().replaceAll('-', '');
  await runTransaction(admin.db, async (tx) => {
    const orderRef = doc(admin.db, 'orders', adminMultiOrderId);
    await tx.get(orderRef);
    const refs = adminMultiIds.map((id) => doc(admin.db, 'inventory', id, 'options', 'base'));
    const stocks = await Promise.all(refs.map((item) => tx.get(item)));
    const orderNumber = await nextOrderNumber(tx, admin.db, adminMultiOrderId);
    refs.forEach((item, index) => tx.update(item, { available: stocks[index].data().available - 1, lastOrderId: adminMultiOrderId, lastOrderLine: index }));
    tx.set(orderRef, {
      schemaVersion: 2, orderNumber,
      ownerUid: adminUser.uid, ownerType: 'customer', contact,
      items: adminMultiIds.map((id) => ({ productId: id, optionId: 'base', productName: 'Admin checkout product', variantId: null, variantName: null, unitPriceSatang: 12950, quantity: 1, productImage: null, lineTotalSatang: 12950 })),
      subtotalSatang: 25900, shippingFeeSatang: 3000, totalSatang: 28900, currency: 'THB',
      status: 'pending_payment', payment: { method: 'manual_promptpay', status: 'pending', promptPayPhone: '0812345678' },
      fulfillmentStatus: 'awaiting_payment', codAcceptance: null, shippingRevision: 0,
      slipPath: null, submittedAt: null, review: null, inventoryRestored: false,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
  });
  assert.equal((await adminDb.doc(`orders/${adminMultiOrderId}`).get()).data()?.totalSatang, 28900);
  for (const id of adminMultiIds) assert.equal((await adminDb.doc(`inventory/${id}/options/base`).get()).data().available, 0);

  // Reproduce checkout's three variant reservation with a signed-in customer and no payment selection.
  const customer = client('rules-three-variant-customer');
  const customerEmail = `customer-${randomUUID()}@example.test`;
  const customerUser = (await createUserWithEmailAndPassword(customer.auth, customerEmail, 'test-password-123')).user;
  await adminDb.doc(`users/${customerUser.uid}`).set({ email: customerEmail, role: 'user', status: 'active' });
  const variantIds = [0, 1, 2].map(() => ({ productId: `rules-variant-${randomUUID()}`, variantId: `var_${randomUUID().replaceAll('-', '')}` }));
  for (const { productId: id, variantId } of variantIds) await adminDb.doc(`inventory/${id}/options/v_${variantId}`).set({
    productId: id, variantId, productName: 'Variant checkout product', variantName: '1 item',
    unitPriceSatang: 39900, stock: 100, available: 100, active: true,
    productImage: null, lastOrderId: null, lastOrderLine: null,
  });
  const variantOrderId = randomUUID().replaceAll('-', '');
  await runTransaction(customer.db, async (tx) => {
    const orderRef = doc(customer.db, 'orders', variantOrderId);
    await tx.get(orderRef);
    const refs = variantIds.map(({ productId: id, variantId }) => doc(customer.db, 'inventory', id, 'options', `v_${variantId}`));
    const stocks = await Promise.all(refs.map((item) => tx.get(item)));
    const orderNumber = await nextOrderNumber(tx, customer.db, variantOrderId);
    refs.forEach((item, index) => tx.update(item, { available: stocks[index].data().available - 1, lastOrderId: variantOrderId, lastOrderLine: index }));
    tx.set(orderRef, {
      schemaVersion: 2, orderNumber,
      ownerUid: customerUser.uid, ownerType: 'customer', contact,
      items: variantIds.map(({ productId: id, variantId }) => ({ productId: id, optionId: `v_${variantId}`, productName: 'Variant checkout product', variantId, variantName: '1 item', unitPriceSatang: 39900, quantity: 1, productImage: null, lineTotalSatang: 39900 })),
      subtotalSatang: 119700, shippingFeeSatang: 3000, totalSatang: 122700, currency: 'THB',
      status: 'pending_payment', payment: { method: 'manual_promptpay', status: 'pending', promptPayPhone: '0812345678' },
      fulfillmentStatus: 'awaiting_payment', codAcceptance: null, shippingRevision: 0,
      slipPath: null, submittedAt: null, review: null, inventoryRestored: false,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
  });
  assert.equal((await adminDb.doc(`orders/${variantOrderId}`).get()).data()?.totalSatang, 122700);
  for (const { productId: id, variantId } of variantIds) assert.equal((await adminDb.doc(`inventory/${id}/options/v_${variantId}`).get()).data().available, 99);

  const codId = await place(buyer, 1, { method: 'cod' });
  await assert.rejects(updateDoc(doc(buyer.db, 'orders', codId), { fulfillmentStatus: 'ready_to_prepare', updatedAt: serverTimestamp() }));
  await assert.rejects(setDoc(doc(buyer.db, 'orders', codId, 'labelGenerations', 'buyer-forged'), {
    orderId: codId, kind: 'label', createdBy: buyer.auth.currentUser.uid, createdAt: serverTimestamp(),
    shippingRevision: 0, paymentMethod: 'cod', totalSatang: 15950,
  }));
  await runTransaction(admin.db, async (tx) => {
    const orderRef = doc(admin.db, 'orders', codId);
    const order = await tx.get(orderRef);
    tx.update(orderRef, {
      codAcceptance: { by: admin.auth.currentUser.uid, at: serverTimestamp() },
      fulfillmentStatus: 'ready_to_prepare', updatedAt: serverTimestamp(),
    });
    assert.equal(order.data().payment.status, 'pending');
  });
  let codOrder = (await adminDb.doc(`orders/${codId}`).get()).data();
  assert.equal(codOrder?.status, 'pending_payment');
  assert.equal(codOrder?.payment.status, 'pending');
  assert.equal(codOrder?.fulfillmentStatus, 'ready_to_prepare');
  await setDoc(doc(admin.db, 'orders', codId, 'labelGenerations', 'cod-label-1'), {
    orderId: codId, kind: 'label', createdBy: admin.auth.currentUser.uid, createdAt: serverTimestamp(),
    shippingRevision: 0, paymentMethod: 'cod', totalSatang: 15950,
  });
  await assert.rejects(setDoc(doc(admin.db, 'orders', codId, 'labelGenerations', 'stale-label'), {
    orderId: codId, kind: 'label', createdBy: admin.auth.currentUser.uid, createdAt: serverTimestamp(),
    shippingRevision: 99, paymentMethod: 'cod', totalSatang: 15950,
  }));
  const codContact = (await getDoc(doc(admin.db, 'orders', codId))).data().contact;
  await updateDoc(doc(admin.db, 'orders', codId), {
    contact: { ...codContact, addressLine1: '2 Corrected Test Road' }, shippingRevision: 1,
    shippingContactUpdatedBy: admin.auth.currentUser.uid, shippingContactUpdatedAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  await assert.rejects(setDoc(doc(admin.db, 'orders', codId, 'labelGenerations', 'old-address-label'), {
    orderId: codId, kind: 'label', createdBy: admin.auth.currentUser.uid, createdAt: serverTimestamp(),
    shippingRevision: 0, paymentMethod: 'cod', totalSatang: 15950,
  }));
  await setDoc(doc(admin.db, 'orders', codId, 'labelGenerations', 'cod-label-2'), {
    orderId: codId, kind: 'label', createdBy: admin.auth.currentUser.uid, createdAt: serverTimestamp(),
    shippingRevision: 1, paymentMethod: 'cod', totalSatang: 15950,
  });
  await assert.rejects(updateDoc(doc(buyer.db, 'orders', codId), { trackingNumber: 'BUYER-FORGED' }));
  await updateDoc(doc(admin.db, 'orders', codId), {
    trackingNumber: 'TH123456789', trackingUpdatedBy: admin.auth.currentUser.uid,
    trackingUpdatedAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  assert.equal((await adminDb.doc(`orders/${codId}`).get()).data()?.trackingNumber, 'TH123456789');
  await updateDoc(doc(admin.db, 'orders', codId), { fulfillmentStatus: 'ready_to_ship', updatedAt: serverTimestamp() });
  await updateDoc(doc(admin.db, 'orders', codId), { fulfillmentStatus: 'shipped', updatedAt: serverTimestamp() });
  await review(admin, codId, 'approved');
  codOrder = (await adminDb.doc(`orders/${codId}`).get()).data();
  assert.equal(codOrder?.status, 'paid');
  assert.equal(codOrder?.payment.status, 'successful');
  assert.equal(codOrder?.fulfillmentStatus, 'shipped');
  assert.match(codOrder?.orderNumber, new RegExp(`^SM-${currentOrderYear}\\d{4,}$`));
  assert.equal((await adminDb.doc('settings/public').get()).data()?.orderSequenceYear, currentOrderYear);

  await adminDb.doc(`users/${adminUser.uid}`).update({ status: 'inactive' });
  await assert.rejects(place(admin, 1));
  await assert.rejects(getBytes(ref(admin.storage, `orders/${secondId}/slip`)));
  console.log('PASS rules: annual numbering, forged suffix rejection, unique concurrent numbering, atomic stock, replay, COD acceptance, tracking authorization, label history and address revisions, fulfillment transitions, slip access, review replay');
}

try { await main(); }
finally { await Promise.all(apps.map((app) => deleteApp(app))); await adminDelete(adminApp); }
