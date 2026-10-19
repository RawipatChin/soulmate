import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { initializeApp, deleteApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, connectAuthEmulator } from 'firebase/auth';
import { connectFirestoreEmulator, doc, getFirestore, setDoc } from 'firebase/firestore';
import { chromium } from 'playwright';

const projectId = process.env.GCLOUD_PROJECT || 'demo-soulmate';
const requireFunctions = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp: initializeAdminApp, deleteApp: deleteAdminApp } = requireFunctions('firebase-admin/app');
const { getFirestore: getAdminFirestore } = requireFunctions('firebase-admin/firestore');
const adminApp = initializeAdminApp({ projectId }, 'browser-smoke-admin');
const productId = `browser-smoke-${randomUUID()}`;
const staleProductId = `browser-stale-${randomUUID()}`;
const port = 3100;
const origin = `http://127.0.0.1:${port}`;
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8081';
const firestorePort = Number(firestoreHost.slice(firestoreHost.lastIndexOf(':') + 1));
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const cartItem = {
  id: `${productId}::base`, productId, productName: 'Browser smoke product',
  variantId: null, variantName: null, unitPrice: 129.5, quantity: 1, productImage: null,
};
const contact = {
  custFirstName: 'Test', custLastName: 'Buyer', custPhone: '0800000000',
  custEmail: 'buyer@example.test', shipAddress: '1 Test Road',
  shipSubdistrict: 'Test', shipDistrict: 'Test', shipProvince: 'กรุงเทพมหานคร', shipZip: '10000',
};

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt++) {
    try { if ((await fetch(origin)).ok) return; } catch { /* Wait for Vite. */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Vite did not start');
}

async function checkout(page) {
  await page.goto(`${origin}/cart`);
  await page.evaluate((item) => localStorage.setItem('soulmate_storefront_cart_v1', JSON.stringify([item])), cartItem);
  await page.reload();
  const frame = page.frameLocator('iframe');
  await frame.locator('#btn-checkout').click();
  await page.waitForURL('**/checkout');
  await page.reload();
  await frame.locator('#checkoutForm').waitFor();
  assert.equal(await page.evaluate(async () => {
    const { configureCheckoutPaymentMethods } = await import('/src/components/ScreenRenderer.tsx');
    const checkoutDoc = document.querySelector('iframe').contentDocument;
    configureCheckoutPaymentMethods(checkoutDoc);
    configureCheckoutPaymentMethods(checkoutDoc);
    return Boolean(checkoutDoc.querySelector('#checkoutForm'));
  }), true);
  await frame.locator('#checkoutPaymentUnavailable').waitFor();
  for (const [id, value] of Object.entries(contact)) {
    if (id === 'shipProvince') await frame.locator(`#${id}`).selectOption(value);
    else await frame.locator(`#${id}`).fill(value);
  }
  await frame.locator('#btnSubmitOrder').click();
  await page.waitForURL('**/order-success?orderId=*', { timeout: 20000 });
  await page.getByText('บันทึกคำสั่งซื้อแล้ว', { exact: true }).waitFor();
  await page.getByText('รอชำระเงิน', { exact: true }).first().waitFor();
  await page.getByAltText(/QR พร้อมเพย์ยอด/).waitFor();
  assert.equal(await page.locator('input[type="file"]').count(), 1);
  const dismiss = page.getByRole('button', { name: 'รับทราบ' });
  if (await dismiss.count()) await dismiss.click();
  const orderId = new URL(page.url()).searchParams.get('orderId');
  assert.ok(orderId);
  const snapshot = await getAdminFirestore(adminApp).doc(`orders/${orderId}`).get();
  assert.equal(snapshot.data()?.status, 'pending_payment');
  assert.equal(snapshot.data()?.payment?.method, 'manual_promptpay');
  assert.equal(snapshot.data()?.payment?.promptPayPhone, '0812345678');
  return orderId;
}

async function checkoutStaleVariant(page) {
  await page.goto(`${origin}/cart`);
  await page.evaluate((item) => localStorage.setItem('soulmate_storefront_cart_v1', JSON.stringify([item])), {
    ...cartItem, id: `${staleProductId}::base`, productId: staleProductId,
    productName: 'Variant smoke product', variantId: null, variantName: null,
  });
  await page.reload();
  await page.frameLocator('iframe').locator('#btn-checkout').click();
  await page.waitForURL('**/checkout');
  await page.reload();
  const frame = page.frameLocator('iframe');
  await frame.locator('#checkoutForm').waitFor();
  await frame.locator('#checkoutSubmissionError').getByText('กรุณาเลือกตัวเลือกสินค้า Variant smoke product ใหม่').waitFor();
  assert.equal((await getAdminFirestore(adminApp).collection('orders').get()).size, 0);
  await frame.getByRole('button', { name: 'เลือกตัวเลือกสินค้าอีกครั้ง' }).click();
  await page.waitForURL(`**/products/${staleProductId}`);
  assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem('soulmate_storefront_cart_v1'))).length, 0);
}

async function seedFulfillmentOrder(orderId, orderNumber, { method = 'manual_promptpay', fulfillmentStatus = 'ready_to_prepare', addressLine1 = '99/1 ถนนสุขุมวิท' } = {}) {
  await getAdminFirestore(adminApp).doc(`orders/${orderId}`).set({
    schemaVersion: 2, orderNumber, ownerUid: 'browser-smoke-owner', ownerType: 'customer',
    contact: {
      firstName: 'สมชาย', lastName: 'ทดสอบ', phone: '0800000000', email: 'buyer@example.test',
      addressLine1, subdistrict: 'คลองตัน', district: 'คลองเตย', province: 'กรุงเทพมหานคร', postalCode: '10110',
    },
    items: [{ productId, optionId: 'base', productName: 'Browser smoke product', variantId: null, variantName: null, unitPriceSatang: 12950, quantity: 1, productImage: null, lineTotalSatang: 12950 }],
    subtotalSatang: 12950, shippingFeeSatang: 3000, totalSatang: 15950, currency: 'THB',
    status: method === 'cod' ? 'pending_payment' : 'paid',
    payment: { method, status: method === 'cod' ? 'pending' : 'successful' },
    fulfillmentStatus, codAcceptance: null, shippingRevision: 0,
    slipPath: null, submittedAt: null, review: null, inventoryRestored: false,
    createdAt: new Date(), updatedAt: new Date(),
  });
}

async function waitForOrder(orderId, predicate) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const snapshot = await getAdminFirestore(adminApp).doc(`orders/${orderId}`).get();
    if (snapshot.exists && predicate(snapshot.data())) return snapshot.data();
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Order ${orderId} did not reach the expected state`);
}

async function waitForLabelGeneration(orderId) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const snapshot = await getAdminFirestore(adminApp).collection('orders').doc(orderId).collection('labelGenerations').get();
    if (snapshot.size) return snapshot;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Label generation for ${orderId} was not recorded`);
}

async function assertPrintLayout(page, layout, expectedLabels = 1, expectedPages = 1) {
  await page.emulateMedia({ media: 'print' });
  const measurement = await page.evaluate(() => {
    const pages = Array.from(document.querySelectorAll('.fulfillment-print-page'));
    const labels = Array.from(document.querySelectorAll('.parcel-label'));
    const firstPageLabels = pages[0] ? Array.from(pages[0].querySelectorAll('.parcel-label')) : [];
    return {
      pageCount: pages.length,
      labelCount: labels.length,
      firstPageLabelCount: firstPageLabels.length,
      width: labels[0]?.getBoundingClientRect().width ?? 0,
      height: labels[0]?.getBoundingClientRect().height ?? 0,
      contentHeight: labels[0]?.scrollHeight ?? 0,
      addressFontSize: labels[0] ? Number.parseFloat(getComputedStyle(labels[0].querySelector('.parcel-recipient p')).fontSize) : 0,
      columns: new Set(firstPageLabels.map((label) => Math.round(label.getBoundingClientRect().x))).size,
      rows: new Set(firstPageLabels.map((label) => Math.round(label.getBoundingClientRect().y))).size,
      layout: pages[0]?.classList.contains('is-two') ? 'two' : pages[0]?.classList.contains('is-four') ? 'four' : null,
    };
  });
  assert.equal(measurement.pageCount, expectedPages);
  assert.equal(measurement.labelCount, expectedLabels);
  assert.equal(measurement.layout, layout);
  assert.ok(measurement.width > 300 && measurement.height > 400, `Unexpected A4 label size ${measurement.width}x${measurement.height}`);
  assert.ok(measurement.contentHeight <= measurement.height + 2, `Label content overflows (${measurement.contentHeight}px in ${measurement.height}px)`);
  if (layout === 'four') assert.equal(measurement.columns, 2);
  if (layout === 'four' && measurement.firstPageLabelCount === 4) assert.equal(measurement.rows, 2);
  if (layout === 'two') assert.ok(measurement.addressFontSize > 16, `Two-up address text is too small (${measurement.addressFontSize}px)`);
  await page.emulateMedia({ media: 'screen' });
}

async function main() {
  await getAdminFirestore(adminApp).doc('config/payment').set({ phone: '0812345678', payeeName: 'SOULMATE', enabled: true });
  await getAdminFirestore(adminApp).doc('settings/public').set({
    shippingMethods: [{ id: 'standard', name: 'Standard', fee: 30, freeShippingThreshold: null, enabled: true }],
    paymentMethods: [{ id: 'promptpay', enabled: true }, { id: 'cod', enabled: true }],
    orderPrefix: 'SM-',
  });
  await getAdminFirestore(adminApp).doc(`products/${productId}`).set({
    name: 'Browser smoke product', status: 'active', price: 129.5, stock: 10,
  });
  await getAdminFirestore(adminApp).doc(`inventory/${productId}/options/base`).set({
    productId, variantId: null, productName: 'Browser smoke product', variantName: null,
    unitPriceSatang: 12950, stock: 10, available: 10, active: true, productImage: null, lastOrderId: null, lastOrderLine: null,
  });
  await getAdminFirestore(adminApp).doc(`inventory/${staleProductId}/options/base`).set({
    productId: staleProductId, variantId: null, productName: 'Variant smoke product', variantName: null,
    unitPriceSatang: 12950, stock: 10, available: 10, active: false, productImage: null, lastOrderId: null, lastOrderLine: null,
  });
  await getAdminFirestore(adminApp).doc(`products/${staleProductId}`).set({
    name: 'Variant smoke product', status: 'active', price: 129.5, stock: 10, hasVariants: true,
    variants: [{ id: 'small', displayName: '1 ชิ้น', price: 129.5, stock: 10, active: true }],
  });
  const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: process.cwd(), stdio: 'ignore',
    env: {
      ...process.env,
      VITE_FIREBASE_API_KEY: 'fake-api-key', VITE_FIREBASE_AUTH_DOMAIN: `${projectId}.firebaseapp.com`,
      VITE_FIREBASE_PROJECT_ID: projectId, VITE_FIREBASE_APP_ID: '1:123:web:smoke',
      VITE_USE_FIREBASE_EMULATORS: 'true',
      VITE_FIRESTORE_EMULATOR_PORT: String(firestorePort),
      VITE_OMISE_TEST_MODE_ENABLED: 'false',
    },
  });
  let browser;
  let customerApp;
  try {
    await waitForServer();
    browser = await chromium.launch({ executablePath: chromePath, headless: true });
    const guestContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const stalePage = await guestContext.newPage();
    await checkoutStaleVariant(stalePage);
    await stalePage.close();
    const guestPage = await guestContext.newPage();
    const guestOrderId = await checkout(guestPage);
    await guestPage.goto(`${origin}/account`);
    await guestPage.waitForURL('**/login');
    assert.equal(await guestPage.getByText('ไม่สามารถเปิดข้อมูลบัญชีได้').count(), 0);
    await guestContext.close();

    const customerEmail = `buyer-${randomUUID()}@example.test`;
    const password = 'test-password-123';
    customerApp = initializeApp({ apiKey: 'fake-api-key', authDomain: `${projectId}.firebaseapp.com`, projectId, appId: '1:123:web:smoke' }, 'browser-smoke-customer');
    const customerAuth = getAuth(customerApp);
    connectAuthEmulator(customerAuth, 'http://127.0.0.1:9099', { disableWarnings: true });
    const customerDb = getFirestore(customerApp);
    connectFirestoreEmulator(customerDb, '127.0.0.1', firestorePort);
    const customerUser = (await createUserWithEmailAndPassword(customerAuth, customerEmail, password)).user;
    await setDoc(doc(customerDb, 'users', customerUser.uid), {
      email: customerEmail, role: 'customer', status: 'active', completedOrderCount: 0, lifetimeSpend: 0,
    });
    const customerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const customerPage = await customerContext.newPage();
    await customerPage.goto(`${origin}/login`);
    await customerPage.locator('input[type="email"]').fill(customerEmail);
    await customerPage.locator('input[type="password"]').fill(password);
    await customerPage.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
    await customerPage.waitForURL('**/account');
    const customerOrderId = await checkout(customerPage);
    await customerPage.goto(`${origin}/account/profile`);
    await customerPage.waitForURL('**/account/profile');
    assert.equal(await customerPage.getByText('ไม่สามารถเปิดข้อมูลบัญชีได้').count(), 0);
    await customerContext.close();

    const adminEmail = `admin-${randomUUID()}@example.test`;
    const adminUser = (await createUserWithEmailAndPassword(customerAuth, adminEmail, password)).user;
    await getAdminFirestore(adminApp).doc(`users/${adminUser.uid}`).set({ email: adminEmail, role: 'admin', status: 'active' });
    const adminContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const adminPage = await adminContext.newPage();
    await adminPage.goto(`${origin}/admin/login`);
    await adminPage.locator('input[type="email"]').fill(adminEmail);
    await adminPage.locator('input[type="password"]').fill(password);
    await adminPage.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
    await adminPage.waitForURL('**/admin/dashboard');
    await adminPage.goto(`${origin}/admin/orders/${customerOrderId}`);
    adminPage.on('dialog', (dialog) => dialog.accept());
    assert.equal(await adminPage.getByRole('button', { name: 'อนุมัติว่าเงินเข้าแล้ว' }).isDisabled(), true);
    await adminPage.getByRole('button', { name: 'ยกเลิกและคืนสต็อก' }).click();
    await adminPage.getByText('ผลตรวจ: ยกเลิก').waitFor();
    assert.equal((await getAdminFirestore(adminApp).doc(`orders/${customerOrderId}`).get()).data()?.status, 'cancelled');
    assert.equal((await getAdminFirestore(adminApp).doc(`users/${customerUser.uid}`).get()).data()?.completedOrderCount, 0);

    await getAdminFirestore(adminApp).doc('settings/store').set({ storeName: 'SOULMATE', storeAddress: '1 Test Road, Bangkok 10000', contactPhone: '0812345678' });
    const orderYear = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Bangkok', year: 'numeric' }).format(new Date());
    const paidOrderIds = Array.from({ length: 5 }, () => `browser-label-${randomUUID()}`);
    const codOrderId = `browser-cod-${randomUUID()}`;
    const paidNumbers = paidOrderIds.map((_, index) => `SM-${orderYear}${String(900001 + index)}`);
    const codNumber = `SM-${orderYear}900006`;
    for (let index = 0; index < paidOrderIds.length; index++) await seedFulfillmentOrder(paidOrderIds[index], paidNumbers[index]);
    const longThaiAddress = 'บ้านเลขที่ ๙๙/๑ หมู่ ๑๒ ซอยทดสอบ ถนนสุขุมวิท แขวงคลองตันเหนือ เขตวัฒนา กรุงเทพมหานคร '.repeat(2);
    await seedFulfillmentOrder(codOrderId, codNumber, { method: 'cod', fulfillmentStatus: 'awaiting_cod_acceptance', addressLine1: longThaiAddress });
    await adminPage.goto(`${origin}/admin/fulfillment`);
    await adminPage.getByText(paidNumbers[0]).waitFor();
    await adminPage.evaluate(() => { window.print = () => undefined; });
    for (const orderNumber of paidNumbers) await adminPage.getByRole('checkbox', { name: `เลือก ${orderNumber}` }).check();
    await adminPage.getByRole('button', { name: 'ตัวอย่างใบปะหน้า' }).click();
    const paidPreview = adminPage.getByRole('dialog');
    await paidPreview.getByText('0800000000', { exact: false }).first().waitFor();
    await paidPreview.getByText('99/1 ถนนสุขุมวิท', { exact: false }).first().waitFor();
    await paidPreview.getByRole('button', { name: 'สร้างและพิมพ์' }).click();
    for (const orderId of paidOrderIds) assert.equal((await waitForLabelGeneration(orderId)).size, 1);
    await adminPage.waitForFunction(() => document.querySelector('.fulfillment-print-root')?.textContent?.includes('ไม่ต้องเก็บเงิน'));
    for (const orderId of paidOrderIds) assert.equal((await getAdminFirestore(adminApp).doc(`orders/${orderId}`).get()).data()?.fulfillmentStatus, 'ready_to_prepare');
    await assertPrintLayout(adminPage, 'four', 5, 2);
    for (const orderNumber of paidNumbers) await adminPage.getByRole('checkbox', { name: `เลือก ${orderNumber}` }).uncheck();

    await adminPage.getByLabel('สถานะจัดส่ง').selectOption('awaiting_cod_acceptance');
    await adminPage.getByText(codNumber).waitFor();
    await adminPage.getByRole('button', { name: 'รับ COD' }).click();
    await waitForOrder(codOrderId, (order) => order.fulfillmentStatus === 'ready_to_prepare' && order.payment.status === 'pending');
    await adminPage.getByLabel('สถานะจัดส่ง').selectOption('ready_to_prepare');
    await adminPage.getByRole('checkbox', { name: `เลือก ${codNumber}` }).check();
    await adminPage.getByRole('button', { name: 'ตัวอย่างใบปะหน้า' }).click();
    const codPreview = adminPage.getByRole('dialog');
    await codPreview.getByText('ยอด COD ที่ต้องลงในระบบขนส่ง').waitFor();
    await codPreview.getByLabel('รูปแบบ A4').selectOption('two');
    await codPreview.getByRole('button', { name: 'สร้างและพิมพ์' }).click();
    await waitForOrder(codOrderId, (order) => order.payment.status === 'pending');
    assert.equal((await waitForLabelGeneration(codOrderId)).size, 1);
    await adminPage.waitForFunction(() => document.querySelector('.fulfillment-print-root')?.textContent?.includes('เก็บเงินปลายทาง'));
    await assertPrintLayout(adminPage, 'two');
    await adminPage.goto(`${origin}/admin/orders/${codOrderId}`);
    await adminPage.getByRole('textbox', { name: 'เลข Tracking' }).fill('TH123456789');
    await adminPage.getByRole('button', { name: 'บันทึกเลข' }).click();
    const trackedOrder = await waitForOrder(codOrderId, (order) => order.trackingNumber === 'TH123456789');
    assert.equal(trackedOrder.fulfillmentStatus, 'ready_to_prepare');
    assert.equal(trackedOrder.payment.status, 'pending');
    await adminContext.close();
    console.log(`PASS browser checkout, admin cancellation, COD acceptance, prepaid/COD labels and optional tracking; saved orders ${guestOrderId.slice(0, 8)}, ${customerOrderId.slice(0, 8)}`);
  } finally {
    await browser?.close();
    vite.kill();
    if (customerApp) await deleteApp(customerApp);
  }
}

try { await main(); }
finally { await deleteAdminApp(adminApp); }
