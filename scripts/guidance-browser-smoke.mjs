import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import assert from 'node:assert/strict';

const origin = process.env.GUIDANCE_TEST_URL || 'http://127.0.0.1:3111';
await mkdir('.scratch/product-guidance/screenshots', { recursive: true });
const server = process.env.GUIDANCE_TEST_URL ? null : spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '3111', '--strictPort'], { stdio: 'ignore' });
async function waitForServer() {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server?.exitCode !== null && server?.exitCode !== undefined) throw new Error(`Vite exited before becoming ready (${server.exitCode})`);
    try { await fetch(origin); return; } catch { await delay(100); }
  }
  throw new Error('Vite did not start at the guidance test URL');
}
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
try {
  await waitForServer();
  for (const [name, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(origin);
    const frame = page.frameLocator('iframe');
    const panel = frame.locator('#soulmate-guidance-panel');
    await panel.waitFor();
    await page.evaluate(async () => {
      const { mountGuidancePanel } = await import('/src/components/storefront/guidancePanel.ts');
      const panel = document.querySelector('iframe').contentDocument.querySelector('#soulmate-guidance-panel');
      window.guidanceCalls = [];
      mountGuidancePanel(panel, async (question, history) => {
        window.guidanceCalls.push({ question, history });
        await new Promise(resolve => setTimeout(resolve, 100));
        if (question === 'ลองผิดพลาด' && window.guidanceCalls.filter(c => c.question === question).length === 1) throw new Error('เชื่อมต่อไม่ได้ กรุณาลองใหม่');
        return { kind: 'recommend', message: 'ลองเปรียบเทียบสินค้าต่อไปนี้จากข้อมูลที่ร้านระบุไว้ครับ', products: [
          { productId: 'sample', variantId: 'choc', name: 'สินค้าตัวอย่างสำหรับตรวจหน้าจอ', variantName: 'ช็อกโกแลต', price: 450, available: true,
            href: '/products/sample', imageUrl: null, evidence: [{ field: 'description', quote: 'โปรตีน 20 กรัมต่อหน่วยบริโภค' }] },
        ], unavailable: [{ productId: 'other', variantId: null, name: 'ตัวอย่างสินค้าหมด', variantName: '', price: 300, available: false,
          href: '/products/other', imageUrl: null, evidence: [{ field: 'ingredients', quote: 'ถั่วเหลือง' }] }] };
      });
      panel.querySelector('.guidance-reset').click();
    });
    await panel.locator('textarea').fill('อยากเพิ่มโปรตีน งบ 800 บาท');
    await panel.getByRole('button', { name: 'ส่งคำถาม', exact: true }).click();
    await panel.locator('.guidance-product').first().waitFor();
    assert.equal(await panel.locator('.guidance-product').count(), 2);
    assert.match(await panel.textContent(), /฿450/);
    assert.match(await panel.locator('.guidance-unavailable-heading').textContent(), /ตัวเลือกที่ใกล้เคียงแต่หมดสต็อก/);
    assert.equal(await panel.locator('a').first().getAttribute('href'), '/products/sample');
    await panel.locator('textarea').fill('สองตัวนี้ต่างกันอย่างไร');
    await panel.getByRole('button', { name: 'ส่งคำถาม', exact: true }).click();
    await page.waitForFunction(() => window.guidanceCalls.length === 2);
    await panel.locator('textarea:not([disabled])').waitFor();
    assert.equal(await page.evaluate(() => window.guidanceCalls[1].history.length), 2);
    await panel.scrollIntoViewIfNeeded();
    await panel.screenshot({ path: `.scratch/product-guidance/screenshots/${name}.png` });
    assert.ok(await panel.evaluate(el => el.scrollWidth <= el.clientWidth + 2));
    await panel.getByRole('button', { name: 'เริ่มใหม่' }).click();
    assert.equal(await panel.locator('.guidance-message').count(), 0);
    await panel.locator('textarea').fill('ลองผิดพลาด');
    await panel.getByRole('button', { name: 'ส่งคำถาม', exact: true }).click();
    await panel.getByRole('button', { name: 'ลองส่งอีกครั้ง' }).waitFor();
    await panel.getByRole('button', { name: 'ลองส่งอีกครั้ง' }).click();
    await panel.locator('.guidance-product').first().waitFor();
    assert.equal(await panel.locator('.guidance-message').count(), 2);
    await panel.getByRole('button', { name: 'เริ่มใหม่' }).click();
    await page.close();
    console.log(`${name}: passed inline cards, follow-up, reset, retry, overflow checks (mock AI)`);
  }
} finally { await browser.close(); server?.kill(); }
