import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { createUserWithEmailAndPassword, getAuth, connectAuthEmulator, signInWithEmailAndPassword } from 'firebase/auth';
import { connectFirestoreEmulator, doc, getFirestore, updateDoc } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { chromium } from 'playwright';

const projectId = process.env.GCLOUD_PROJECT || 'demo-soulmate';
const port = 3198;
const origin = `http://127.0.0.1:${port}`;
const password = 'emulator-test-password';
const requireFunctions = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp: initializeAdminApp, deleteApp: deleteAdminApp } = requireFunctions('firebase-admin/app');
const { getAuth: getAdminAuth } = requireFunctions('firebase-admin/auth');
const { getFirestore: getAdminFirestore } = requireFunctions('firebase-admin/firestore');
const adminApp = initializeAdminApp({ projectId }, 'admin-role-browser-smoke');
const adminAuth = getAdminAuth(adminApp);
const adminDb = getAdminFirestore(adminApp);
const suffix = randomUUID();
const accounts = [
  { key: 'owner', email: `owner-${suffix}@example.test`, role: 'super_admin', status: 'active' },
  { key: 'staff', email: `staff-${suffix}@example.test`, role: 'admin', status: 'active' },
  { key: 'customer', email: `customer-${suffix}@example.test`, role: 'customer', status: 'active' },
  { key: 'suspended', email: `suspended-${suffix}@example.test`, role: 'customer', status: 'suspended' },
];
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  cwd: process.cwd(), stdio: 'ignore', env: {
    ...process.env,
    VITE_FIREBASE_API_KEY: 'fake-api-key', VITE_FIREBASE_AUTH_DOMAIN: `${projectId}.firebaseapp.com`,
    VITE_FIREBASE_PROJECT_ID: projectId, VITE_FIREBASE_APP_ID: '1:123:web:admin-role-smoke',
    VITE_USE_FIREBASE_EMULATORS: 'true', VITE_OMISE_TEST_MODE_ENABLED: 'false',
  },
});
let browser;
let clientApp;

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt++) {
    try { if ((await fetch(origin)).ok) return; } catch { /* Wait for Vite. */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Vite did not start');
}

async function signIn(page, email) {
  await page.goto(`${origin}/admin/login`);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await page.waitForURL('**/admin/dashboard');
}

async function main() {
  const ids = {};
  try {
    for (const account of accounts) {
      const user = await adminAuth.createUser({ email: account.email, password });
      ids[account.key] = user.uid;
      await adminDb.doc(`users/${user.uid}`).set({
        uid: user.uid, email: account.email, displayName: `${account.key} smoke`, role: account.role,
        status: account.status, completedOrderCount: 0, lifetimeSpend: 0,
      });
    }
    await adminDb.doc('config/payment').set({
      phone: '0812345678', payeeName: 'SOULMATE Test', enabled: true,
      updatedAt: new Date(), updatedBy: ids.owner,
    });

    await waitForServer();
    browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
    clientApp = initializeApp({ apiKey: 'fake-api-key', authDomain: `${projectId}.firebaseapp.com`, projectId, appId: '1:123:web:admin-role-smoke' }, 'admin-role-smoke-client');
    const clientAuth = getAuth(clientApp);
    connectAuthEmulator(clientAuth, 'http://127.0.0.1:9099', { disableWarnings: true });
    const clientDb = getFirestore(clientApp);
    connectFirestoreEmulator(clientDb, '127.0.0.1', 8081);

    const adminContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const adminPage = await adminContext.newPage();
    await signIn(adminPage, accounts[1].email);
    await adminPage.goto(`${origin}/admin/settings`);
    const adminSettings = adminPage.frameLocator('iframe');
    await adminSettings.getByText('การจัดส่ง', { exact: false }).first().waitFor();
    assert.equal(await adminPage.getByRole('link', { name: 'ผู้ดูแลและสิทธิ์' }).count(), 0);
    assert.equal(await adminSettings.locator('#storeSettingsSection1').count(), 0);
    assert.equal(await adminSettings.locator('#storeSettingsSection3').count(), 1);
    assert.equal(await adminSettings.locator('#defaultOrderStatus').isDisabled(), true);
    assert.equal(await adminSettings.locator('#storeSettingsSection4').count(), 1);
    assert.equal(await adminSettings.getByRole('button', { name: 'ตั้งค่า PromptPay' }).count(), 0);
    assert.equal(await adminSettings.locator('input[name="promptpayPhone"]').count(), 0);
    assert.equal(await adminSettings.locator('#settings-save-bar').isVisible(), false);
    await adminSettings.locator('input[name="shippingFee-0"]').fill('41');
    await adminSettings.getByRole('switch', { name: 'เปิดใช้ PromptPay / QR Payment' }).click();
    assert.equal(await adminSettings.locator('#settings-save-bar').isVisible(), true);
    await adminSettings.getByRole('button', { name: 'บันทึกการตั้งค่า' }).click();
    for (let attempt = 0; attempt < 30; attempt++) {
      if ((await adminDb.doc('settings/store').get()).data()?.shippingMethods?.[0]?.fee === 41) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.equal((await adminDb.doc('settings/store').get()).data()?.shippingMethods?.[0]?.fee, 41);
    const adminPaymentSettings = (await adminDb.doc('config/payment').get()).data();
    assert.equal(adminPaymentSettings?.enabled, false);
    assert.equal(adminPaymentSettings?.phone, '0812345678');
    assert.equal(adminPaymentSettings?.payeeName, 'SOULMATE Test');
    assert.equal((await adminDb.doc('settings/public').get()).data()?.paymentMethods?.find((method) => method.id === 'promptpay')?.enabled, false);
    await signInWithEmailAndPassword(clientAuth, accounts[1].email, password);
    await assert.rejects(updateDoc(doc(clientDb, 'settings/store'), { storeName: 'Unauthorized' }));
    await assert.rejects(updateDoc(doc(clientDb, 'config/payment'), { phone: '0899999999' }));
    await assert.rejects(updateDoc(doc(clientDb, 'users', ids.customer), { role: 'admin' }));
    await adminPage.goto(`${origin}/admin/admins`);
    await adminPage.getByText('ไม่มีสิทธิ์เข้าหลังบ้าน').waitFor();
    await adminContext.close();

    const ownerContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const ownerPage = await ownerContext.newPage();
    await signIn(ownerPage, accounts[0].email);
    await ownerPage.goto(`${origin}/admin/settings`);
    const ownerSettings = ownerPage.frameLocator('iframe');
    await ownerSettings.getByText('วิธีชำระเงิน', { exact: false }).first().waitFor();
    assert.equal(await ownerSettings.locator('#settings-save-bar').isVisible(), false);
    await ownerPage.goto(`${origin}/admin/admins`);
    await ownerPage.getByRole('heading', { name: 'ผู้ดูแลและสิทธิ์' }).waitFor();
    const staffRow = ownerPage.getByRole('row').filter({ hasText: accounts[1].email });
    await staffRow.getByRole('combobox').selectOption('customer');
    await ownerPage.getByRole('row').filter({ hasText: accounts[1].email }).getByText('ลูกค้า', { exact: true }).waitFor();
    const customerRow = ownerPage.getByRole('row').filter({ hasText: accounts[2].email });
    await customerRow.getByRole('combobox').selectOption('super_admin');
    const confirmation = ownerPage.getByRole('alertdialog');
    await confirmation.getByRole('button', { name: 'ยกเลิก' }).click();
    assert.equal((await adminDb.doc(`users/${ids.customer}`).get()).data()?.role, 'customer');
    await customerRow.getByRole('combobox').selectOption('super_admin');
    await confirmation.getByRole('button', { name: 'ยืนยันการเปลี่ยนสิทธิ์' }).click();
    await confirmation.waitFor({ state: 'detached' });
    assert.equal((await adminDb.doc(`users/${ids.customer}`).get()).data()?.role, 'super_admin');
    await ownerPage.getByRole('row').filter({ hasText: accounts[2].email }).getByRole('combobox').selectOption('admin');
    await ownerPage.getByRole('alertdialog').getByRole('button', { name: 'ยืนยันการเปลี่ยนสิทธิ์' }).click();
    await ownerPage.getByRole('alertdialog').waitFor({ state: 'detached' });
    assert.equal((await adminDb.doc(`users/${ids.customer}`).get()).data()?.role, 'admin');
    const suspendedRow = ownerPage.getByRole('row').filter({ hasText: accounts[3].email });
    assert.equal(await suspendedRow.getByRole('combobox').isEnabled(), false);
    const ownerRow = ownerPage.getByRole('row').filter({ hasText: accounts[0].email });
    await ownerRow.getByRole('combobox').selectOption('admin');
    await ownerPage.getByRole('alertdialog').getByRole('button', { name: 'ยืนยันการเปลี่ยนสิทธิ์' }).click();
    await ownerPage.getByRole('alert').getByText('ต้องมี Super Admin ที่ใช้งานได้อย่างน้อยหนึ่งบัญชี').waitFor();
    assert.equal((await adminDb.doc(`users/${ids.owner}`).get()).data()?.role, 'super_admin');
    await ownerContext.close();
    console.log('PASS role navigation, role-scoped settings, operational save, denied writes, role confirmations, suspended-account and last-Super-Admin protection');
  } finally {
    await browser?.close();
    vite.kill();
    if (clientApp) await deleteApp(clientApp);
    for (const uid of Object.values(ids)) {
      await adminDb.doc(`users/${uid}`).delete().catch(() => undefined);
      await adminAuth.deleteUser(uid).catch(() => undefined);
    }
    await adminDb.doc('settings/store').delete().catch(() => undefined);
    await adminDb.doc('settings/public').delete().catch(() => undefined);
    await adminDb.doc('config/payment').delete().catch(() => undefined);
    await adminDb.doc('system/adminRoleState').delete().catch(() => undefined);
  }
}

try { await main(); }
finally { await deleteAdminApp(adminApp); }
