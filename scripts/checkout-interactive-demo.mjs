import { spawn, execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { chromium } from 'playwright';

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, '..');
const projectId = 'demo-soulmate';
const origin = 'http://127.0.0.1:3100';
const emulatorUi = 'http://127.0.0.1:4000';
const email = 'demo.customer@example.test';
const password = 'DemoCheckout123!';
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const requireFunctions = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp, deleteApp } = requireFunctions('firebase-admin/app');
const { getAuth } = requireFunctions('firebase-admin/auth');
const { getFirestore, Timestamp } = requireFunctions('firebase-admin/firestore');

let emulator;
let vite;
let browser;
let adminApp;
let stopRequested = false;
let signalStop;
const stopped = new Promise((resolveStop) => { signalStop = resolveStop; });

function requestStop() {
  stopRequested = true;
  signalStop();
}
process.once('SIGINT', requestStop);
process.once('SIGTERM', requestStop);

function firebaseCli() {
  if (process.env.FIREBASE_CLI_PATH) {
    const explicit = resolve(process.env.FIREBASE_CLI_PATH);
    if (!existsSync(explicit)) throw new Error(`Firebase CLI not found: ${explicit}`);
    return [process.execPath, [explicit]];
  }
  const local = join(root, 'node_modules', 'firebase-tools', 'lib', 'bin', 'firebase.js');
  if (existsSync(local)) return [process.execPath, [local]];
  const cacheRoot = join(process.env.LOCALAPPDATA || '', 'npm-cache', '_npx');
  if (existsSync(cacheRoot)) {
    for (const entry of readdirSync(cacheRoot)) {
      const cached = join(cacheRoot, entry, 'node_modules', 'firebase-tools', 'lib', 'bin', 'firebase.js');
      if (existsSync(cached)) return [process.execPath, [cached]];
    }
  }
  throw new Error('Firebase CLI not found. Run this from the same terminal where Firebase CLI works, or set FIREBASE_CLI_PATH to its firebase.js file.');
}

function javaEnvironment() {
  const env = { ...process.env };
  const androidJava = 'C:\\Program Files\\Android\\Android Studio\\jbr\\bin';
  if (process.platform === 'win32' && existsSync(join(androidJava, 'java.exe'))) {
    const pathKey = Object.keys(env).find((key) => key.toLowerCase() === 'path') || 'Path';
    env[pathKey] = `${androidJava};${env[pathKey] || ''}`;
  }
  return env;
}

async function waitFor(url, label, timeoutMs = 120000, ready = () => true, method = 'GET') {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end && !stopRequested) {
    if (emulator?.exitCode !== null && emulator?.exitCode !== undefined) {
      throw new Error(`Firebase Emulator exited before ${label} was ready (code ${emulator.exitCode}).`);
    }
    try {
      const response = await fetch(url, { method, signal: AbortSignal.timeout(1500) });
      if (ready(response)) return;
    } catch { /* Keep waiting for the local service. */ }
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  throw new Error(stopRequested ? 'Stopped by user.' : `Timed out waiting for ${label}.`);
}

async function seed() {
  process.env.GCLOUD_PROJECT = projectId;
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  adminApp = initializeApp({ projectId }, 'checkout-interactive-demo');
  const db = getFirestore(adminApp);
  const products = [
    { id: 'demo-apple-cider', name: 'Apple Cider สินค้าทดสอบ', price: 129.5, stock: 20, categoryId: 'demo', categoryName: 'สินค้าทดสอบ' },
    { id: 'demo-berry-drink', name: 'Berry Drink สินค้าทดสอบ', price: 249, stock: 12, categoryId: 'demo', categoryName: 'สินค้าทดสอบ' },
  ];
  for (const product of products) {
    await db.doc(`products/${product.id}`).set({
      name: product.name,
      slug: product.id,
      description: 'สินค้าสำหรับทดลองขั้นตอนสั่งซื้อบนเครื่องเท่านั้น',
      price: product.price,
      stock: product.stock,
      status: 'active',
      categoryId: product.categoryId,
      categoryName: product.categoryName,
      hasVariants: false,
      images: [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  }
  const auth = getAuth(adminApp);
  const user = await auth.createUser({ email, password, displayName: 'Demo Customer' });
  await db.doc(`users/${user.uid}`).set({
    email, displayName: 'Demo Customer', role: 'customer', status: 'active',
    completedOrderCount: 0, lifetimeSpend: 0, createdAt: Timestamp.now(),
  });
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === 'win32') {
    try { await execFileAsync('taskkill', ['/PID', String(child.pid), '/T', '/F']); }
    catch { child.kill(); }
  } else {
    child.kill('SIGTERM');
  }
}

async function main() {
  const tsc = requireFunctions.resolve('typescript/bin/tsc');
  console.log('Building Functions for the local demo...');
  await new Promise((resolveBuild, rejectBuild) => {
    const build = spawn(process.execPath, [tsc, '-p', join(root, 'functions', 'tsconfig.json')], { cwd: root, stdio: 'inherit' });
    build.once('error', rejectBuild);
    build.once('exit', (code) => code === 0 ? resolveBuild() : rejectBuild(new Error(`Functions build failed (${code}).`)));
  });
  if (stopRequested) return;

  const [cli, cliArgs] = firebaseCli();
  emulator = spawn(cli, [...cliArgs, 'emulators:start', '--project', projectId, '--only', 'auth,firestore,functions,storage'], {
    cwd: root, env: javaEnvironment(), stdio: 'inherit',
  });
  emulator.once('error', (error) => { console.error(error); requestStop(); });
  emulator.once('exit', (code) => {
    if (!stopRequested) {
      console.error(`Firebase Emulator stopped unexpectedly (code ${code}).`);
      process.exitCode = 1;
      requestStop();
    }
  });
  await waitFor('http://127.0.0.1:9099/', 'Auth Emulator');
  await waitFor('http://127.0.0.1:8080/', 'Firestore Emulator');
  await waitFor('http://127.0.0.1:9199/', 'Storage Emulator');
  await waitFor(`http://127.0.0.1:5001/${projectId}/us-central1/createPendingOrder`, 'createPendingOrder', 120000, (response) => response.status !== 404, 'OPTIONS');
  await waitFor(emulatorUi, 'Emulator UI');
  if (stopRequested) return;

  await seed();
  vite = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--host', '127.0.0.1', '--port', '3100', '--strictPort'], {
    cwd: root, stdio: 'inherit',
    env: {
      ...process.env,
      VITE_FIREBASE_API_KEY: 'demo-api-key',
      VITE_FIREBASE_AUTH_DOMAIN: `${projectId}.firebaseapp.com`,
      VITE_FIREBASE_PROJECT_ID: projectId,
      VITE_FIREBASE_STORAGE_BUCKET: `${projectId}.firebasestorage.app`,
      VITE_FIREBASE_APP_ID: '1:123:web:checkout-demo',
      VITE_FIREBASE_MESSAGING_SENDER_ID: '123',
      VITE_USE_FIREBASE_EMULATORS: 'true',
      VITE_CHECKOUT_TEST_MODE_ENABLED: 'true',
      VITE_OMISE_TEST_MODE_ENABLED: 'false',
      DISABLE_HMR: 'true',
    },
  });
  vite.once('error', (error) => { console.error(error); requestStop(); });
  vite.once('exit', (code) => {
    if (!stopRequested) {
      console.error(`Demo website stopped unexpectedly (code ${code}).`);
      process.exitCode = 1;
      requestStop();
    }
  });
  await waitFor(origin, 'demo website', 30000);
  if (stopRequested) return;

  console.log(`\nDemo website: ${origin}/products`);
  console.log(`Emulator UI: ${emulatorUi}/firestore (open orders and products)`);
  console.log(`Demo member: ${email} / ${password}`);
  console.log('Start as a guest in the opened browser. To test a member, sign in with the demo account.');
  console.log('All data is local to the Emulator and disappears after Ctrl+C. No payment is collected.\n');
  if (process.env.CHECKOUT_DEMO_NO_BROWSER !== '1') {
    try {
      browser = await chromium.launch({ executablePath: chromePath, headless: false });
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      await page.goto(`${origin}/products`);
    } catch (error) {
      console.warn(`Could not open Chrome automatically: ${error.message}`);
      console.log(`Open ${origin}/products manually in your browser.`);
    }
  }
  await stopped;
}

try {
  await main();
} catch (error) {
  if (!stopRequested) {
    console.error(error);
    process.exitCode = 1;
  }
} finally {
  await browser?.close().catch(() => {});
  await stopProcess(vite);
  await stopProcess(emulator);
  if (adminApp) await deleteApp(adminApp);
}
