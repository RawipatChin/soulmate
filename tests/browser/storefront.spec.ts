import { expect, test } from '@playwright/test';

const products = [{
  id: 'tea', slug: 'tea', name: 'ชาใบหอม', shortDescription: 'ชาสมุนไพร',
  description: 'ชาสำหรับดื่มประจำวัน', price: 120, compareAtPrice: null,
  stock: 5, status: 'active', images: [], hasVariants: true,
  optionGroups: [{ id: 'size', name: 'ขนาด', values: [
    { id: 'small', name: 'เล็ก' }, { id: 'large', name: 'ใหญ่' },
  ] }],
  variants: [
    { id: 'small', displayName: 'เล็ก', options: [{ groupId: 'size', groupName: 'ขนาด', valueId: 'small', valueName: 'เล็ก' }], price: 120, stock: 4, sku: 'S', imageURL: null, active: true },
    { id: 'large', displayName: 'ใหญ่', options: [{ groupId: 'size', groupName: 'ขนาด', valueId: 'large', valueName: 'ใหญ่' }], price: 160, stock: 2, sku: 'L', imageURL: null, active: true },
  ],
  createdAt: null, updatedAt: null,
}, {
  id: 'draft', slug: 'draft', name: 'สินค้าร่าง', shortDescription: '',
  description: '', price: 99, compareAtPrice: null, stock: 5,
  status: 'draft', images: [], hasVariants: false, createdAt: null, updatedAt: null,
}];

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate((fixture) => {
    localStorage.clear();
    localStorage.setItem('soulmate_browser_test_products', JSON.stringify(fixture));
  }, products);
});

test('signed-out visitor browses, chooses an option, edits and retains the cart', async ({ page }) => {
  await page.goto('/');
  await expect(page.frameLocator('iframe').getByText('ชาใบหอม').first()).toBeVisible();
  await page.goto('/products');
  const store = page.frameLocator('iframe');
  await expect(store.getByText('ชาใบหอม').first()).toBeVisible();
  await expect(store.getByText('สินค้าร่าง')).toHaveCount(0);
  await store.getByRole('link', { name: 'ดูรายละเอียด ชาใบหอม' }).first().click();
  await expect(page).toHaveURL(/\/products\/tea$/);
  await expect(store.locator('#real-add-to-cart')).toBeEnabled();
  await expect(store.getByRole('button', { name: 'เล็ก' })).toHaveAttribute('aria-pressed', 'true');
  await store.getByRole('button', { name: 'ใหญ่' }).click();
  await store.locator('#real-add-to-cart').click();
  await page.goto('/cart');
  await expect(store.getByText('ชาใบหอม').first()).toBeVisible();
  await expect(store.getByText('ใหญ่').first()).toBeVisible();
  await expect(store.getByText('฿160').first()).toBeVisible();
  await store.getByRole('button', { name: 'เพิ่มจำนวน ชาใบหอม' }).click();
  await expect(store.getByText('ยอดสุทธิ: ฿320')).toBeVisible();
  await page.reload();
  await expect(store.getByText('ยอดสุทธิ: ฿320')).toBeVisible();
  await store.getByRole('button', { name: 'ลบ ชาใบหอม' }).click();
  await expect(store.getByText('ชาใบหอม')).toHaveCount(0);
});

test('mobile visitor keeps separate options and repeated adds share a line', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/products/tea');
  const store = page.frameLocator('iframe');
  await store.getByRole('button', { name: 'เล็ก' }).click();
  await store.locator('#real-add-to-cart').click();
  await store.locator('#real-add-to-cart').click();
  await store.getByRole('button', { name: 'ใหญ่' }).click();
  await store.locator('#real-add-to-cart').click();
  await page.goto('/cart');
  await expect(store.locator('[data-cart-item-id]')).toHaveCount(2);
  await expect(store.locator('[data-cart-item-id="tea::small"]')).toContainText('ยอดสุทธิ: ฿240');
  await expect(store.locator('[data-cart-item-id="tea::large"]')).toContainText('ยอดสุทธิ: ฿160');
  await expect(store.locator('#header-count-badge')).toContainText('3 ชิ้น');
});

test('cart flags a changed option instead of silently dropping it', async ({ page }) => {
  await page.evaluate((fixture) => {
    localStorage.setItem('soulmate_storefront_cart_v1', JSON.stringify([{
      id: 'tea::large', productId: 'tea', productName: 'ชาใบหอม',
      variantId: 'large', variantName: 'ใหญ่', unitPrice: 160,
      quantity: 1, productImage: null,
    }]));
    fixture[0]!.variants![1]!.active = false;
    localStorage.setItem('soulmate_browser_test_products', JSON.stringify(fixture));
  }, products);
  await page.goto('/cart');
  const store = page.frameLocator('iframe');
  await expect(store.getByText('ตัวเลือกนี้ไม่วางจำหน่ายแล้ว กรุณาเลือกใหม่')).toBeVisible();
  await expect(store.getByRole('button', { name: 'ลบ ชาใบหอม' })).toBeVisible();
});

test('visitor can accept a changed price without adding another unit', async ({ page }) => {
  await page.evaluate((fixture) => {
    localStorage.setItem('soulmate_storefront_cart_v1', JSON.stringify([{
      id: 'tea::large', productId: 'tea', productName: 'ชาใบหอม',
      variantId: 'large', variantName: 'ใหญ่', unitPrice: 160,
      quantity: 1, productImage: null,
    }]));
    fixture[0]!.variants![1]!.price = 180;
    localStorage.setItem('soulmate_browser_test_products', JSON.stringify(fixture));
  }, products);
  await page.goto('/cart');
  const store = page.frameLocator('iframe');
  await expect(store.getByText('ราคาเปลี่ยนเป็น ฿180 กรุณาตรวจสอบสินค้าอีกครั้ง')).toBeVisible();
  await store.getByRole('button', { name: 'อัปเดตราคา' }).click();
  await expect(store.getByText('ยอดสุทธิ: ฿180')).toBeVisible();
  await expect(store.locator('#header-count-badge')).toContainText('1 ชิ้น');
});

test('catalog distinguishes empty from failed reads', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('soulmate_browser_test_products', '[]'));
  await page.goto('/products');
  const store = page.frameLocator('iframe');
  await expect(store.locator('#state-empty')).toBeVisible();
  await page.evaluate(() => localStorage.setItem('soulmate_browser_test_catalog_error', 'true'));
  await page.reload();
  await expect(store.getByText('ไม่สามารถโหลดสินค้าได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง')).toBeVisible();
});

test('unavailable product is identified before an add attempt', async ({ page }) => {
  await page.evaluate((fixture) => {
    fixture[0]!.hasVariants = false;
    fixture[0]!.stock = 0;
    localStorage.setItem('soulmate_browser_test_products', JSON.stringify(fixture));
  }, products);
  await page.goto('/');
  const store = page.frameLocator('iframe');
  await expect(store.getByText('สินค้าหมด').first()).toBeVisible();
  await expect(store.getByRole('button', { name: 'สินค้าหมด ชาใบหอม' })).toBeDisabled();
  await page.goto('/products');
  await expect(store.getByRole('button', { name: 'สินค้าหมด ชาใบหอม' }).first()).toBeDisabled();
});

test('detail defaults to an available package and can add without an option click', async ({ page }) => {
  await page.goto('/products/tea');
  const store = page.frameLocator('iframe');
  await expect(store.locator('#real-add-to-cart')).toBeEnabled();
  await expect(store.getByRole('button', { name: 'เล็ก' })).toHaveAttribute('aria-pressed', 'true');
  await store.locator('#real-qty-plus').click();
  await expect(store.locator('#real-qty-display')).toHaveText('2');
  await store.locator('#real-add-to-cart').click();
  await expect(store.locator('#real-add-to-cart')).toContainText('เพิ่ม เล็ก 2 ชิ้นลงตะกร้าแล้ว');
  await page.goto('/cart');
  await expect(store.locator('[data-cart-item-id="tea::small"]')).toContainText('ยอดสุทธิ: ฿240');
});

test('inactive package cannot be selected or added', async ({ page }) => {
  await page.evaluate((fixture) => {
    fixture[0]!.variants![1]!.active = false;
    localStorage.setItem('soulmate_browser_test_products', JSON.stringify(fixture));
  }, products);
  await page.goto('/products/tea');
  const store = page.frameLocator('iframe');
  await expect(store.getByRole('button', { name: 'ใหญ่ (หมด)' })).toBeDisabled();
  await expect(store.getByRole('button', { name: 'เล็ก' })).toHaveAttribute('aria-pressed', 'true');
  await expect(store.locator('#real-add-to-cart')).toBeEnabled();
});

test('detail keeps Add to cart disabled when every package is unavailable', async ({ page }) => {
  await page.evaluate((fixture) => {
    fixture[0]!.variants![0]!.stock = 0;
    fixture[0]!.variants![1]!.active = false;
    localStorage.setItem('soulmate_browser_test_products', JSON.stringify(fixture));
  }, products);
  await page.goto('/products/tea');
  const store = page.frameLocator('iframe');
  await expect(store.locator('#real-add-to-cart')).toBeDisabled();
  await expect(store.locator('#real-selected-variant')).toContainText('กรุณาเลือก');
});

test('cart controls work while catalog verification is pending', async ({ page }) => {
  await page.evaluate((fixture) => {
    fixture[0]!.variants![0]!.stock = 2;
    localStorage.setItem('soulmate_browser_test_products', JSON.stringify(fixture));
    localStorage.setItem('soulmate_browser_test_catalog_delay_ms', '1800');
    localStorage.setItem('soulmate_storefront_cart_v1', JSON.stringify([{
      id: 'tea::small', productId: 'tea', productName: 'ชาใบหอม',
      variantId: 'small', variantName: 'เล็ก', unitPrice: 120,
      quantity: 1, productImage: null,
    }]));
  }, products);
  await page.goto('/cart');
  const store = page.frameLocator('iframe');
  await expect(store.locator('#cart-validation-message')).toContainText('กำลังตรวจสอบ');
  await store.getByRole('button', { name: 'เพิ่มจำนวน ชาใบหอม' }).click();
  await expect(store.locator('[data-cart-item-id="tea::small"]')).toContainText('ยอดสุทธิ: ฿240');
  await store.getByRole('button', { name: 'ลดจำนวน ชาใบหอม' }).click();
  await expect(store.locator('[data-cart-item-id="tea::small"]')).toContainText('ยอดสุทธิ: ฿120');
  await store.getByRole('button', { name: 'เพิ่มจำนวน ชาใบหอม' }).click();
  await store.getByRole('button', { name: 'เพิ่มจำนวน ชาใบหอม' }).click();
  await expect(store.locator('[data-cart-item-id="tea::small"]')).toContainText('ยอดสุทธิ: ฿360');
  await expect(store.getByText('เหลือสินค้า 2 ชิ้น กรุณาปรับจำนวน')).toBeVisible();
  await store.getByRole('button', { name: 'ปรับจำนวน' }).click();
  await expect(store.locator('[data-cart-item-id="tea::small"]')).toContainText('ยอดสุทธิ: ฿240');
  await expect(store.locator('#cart-validation-message')).toHaveText('');
});

test('storefront does not enter shipping or checkout', async ({ page }) => {
  await page.goto('/products/tea');
  const store = page.frameLocator('iframe');
  await store.locator('#real-product-detail').waitFor();
  await expect(store.locator('#real-buy-now')).toHaveCount(0);
  await page.goto('/cart');
  await store.locator('#cart-validation-message').waitFor({ state: 'attached' });
  await expect(store.locator('#btn-checkout')).toHaveCount(0);
  await page.goto('/checkout');
  await expect(page).toHaveURL(/\/cart$/);
});
