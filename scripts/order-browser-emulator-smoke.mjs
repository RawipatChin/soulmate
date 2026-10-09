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
  await frame.locator('#checkoutPaymentUnavailable').waitFor();
  for (const [id, value] of Object.entries(contact)) {
    if (id === 'shipProvince') await frame.locator(`#${id}`).selectOption(value);
    else await frame.locator(`#${id}`).fill(value);
  }
  await frame.locator('#btnSubmitOrder').click();
  await page.waitForURL('**/order-success?orderId=*', { timeout: 20000 });
  await page.getByText('บันทึกคำสั่งซื้อแล้ว', { exact: true }).waitFor();
  await page.getByText('รอชำระเงิน').first().waitFor();
  assert.equal(await page.getByRole('button', { name: 'ชำระผ่าน PromptPay' }).count(), 0);
  const orderId = new URL(page.url()).searchParams.get('orderId');
  assert.ok(orderId);
  const snapshot = await getAdminFirestore(adminApp).doc(`orders/${orderId}`).get();
  assert.equal(snapshot.data()?.status, 'pending_payment');
  return orderId;
}

async function main() {
  await getAdminFirestore(adminApp).doc(`products/${productId}`).set({
    name: 'Browser smoke product', status: 'active', price: 129.5, stock: 10,
  });
  const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: process.cwd(), stdio: 'ignore',
    env: {
      ...process.env,
      VITE_FIREBASE_API_KEY: 'fake-api-key', VITE_FIREBASE_AUTH_DOMAIN: `${projectId}.firebaseapp.com`,
      VITE_FIREBASE_PROJECT_ID: projectId, VITE_FIREBASE_APP_ID: '1:123:web:smoke',
      VITE_USE_FIREBASE_EMULATORS: 'true', VITE_CHECKOUT_TEST_MODE_ENABLED: 'true',
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
    console.log(`PASS browser guest and customer checkout; saved orders ${guestOrderId.slice(0, 8)}, ${customerOrderId.slice(0, 8)}; guest account redirects to login`);
  } finally {
    await browser?.close();
    vite.kill();
    if (customerApp) await deleteApp(customerApp);
  }
}

try { await main(); }
finally { await deleteAdminApp(adminApp); }
