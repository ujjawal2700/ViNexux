import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';
const id = '507f1f77bcf86cd799439011';
const otherId = '507f1f77bcf86cd799439012';
const product = (fields = {}) => ({ _id: id, name: '12V Adapter', sku: 'ADAPTER', modelNumber: 'AD-12V', isActive: true, stockQuantity: 6, standardPrice: 100, specifications: [], images: [{ url: 'https://cdn.example.test/adapter.webp' }], ...fields });

test('admin can toggle low stock beside trending and the saved flag survives reload', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  const row = product(); let payload;
  await page.route('**/api/admin/products**', route => {
    if (route.request().method() === 'PUT') {
      payload = route.request().postDataJSON(); Object.assign(row, payload);
      return route.fulfill({ json: { success: true, data: row } });
    }
    return route.fulfill({ json: { success: true, data: { products: [row], pagination: { page: 1, total: 1, totalPages: 1 } } } });
  });
  await page.goto('/admin/products');
  const lowStock = page.getByRole('checkbox', { name: 'Low stock: 12V Adapter', exact: true });
  await lowStock.check();
  await expect.poll(() => payload).toEqual({ isLowStock: true });
  await expect(page.getByRole('checkbox', { name: 'Trending: 12V Adapter', exact: true })).not.toBeChecked();
  expect(row.stockQuantity).toBe(6);
  await page.reload(); await expect(lowStock).toBeChecked();
  await lowStock.uncheck(); await expect.poll(() => row.isLowStock).toBe(false);
});

for (const stockQuantity of [3, 6]) test(`flagged product with stock ${stockQuantity} caps the quantity at ${Math.min(stockQuantity, 5)}`, async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'storefront');
  await page.route(`**/api/products/${id}`, route => route.fulfill({ json: { success: true, data: product({ isLowStock: true, stockQuantity }) } }));
  await page.goto(`/products/${id}`);
  await expect(page.getByText('LOW STOCK', { exact: true })).toBeVisible();
  const increment = page.getByRole('button', { name: 'Increase quantity', exact: true }).first();
  for (let quantity = 1; quantity < Math.min(stockQuantity, 5); quantity++) await increment.click();
  await expect(increment).toBeDisabled();
});

test('a small inventory is in stock without a manual low-stock flag', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'storefront');
  await page.route(`**/api/products/${id}`, route => route.fulfill({ json: { success: true, data: product({ stockQuantity: 3 }) } }));
  await page.goto(`/products/${id}`);
  await expect(page.getByText('IN STOCK', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('LOW STOCK', { exact: true })).toHaveCount(0);
});

test('current session is clearly marked and only other active sessions can be revoked', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  const session = { userType: 'admin', userId: { name: 'Admin', email: 'admin@example.test' }, isActive: true, expiresAt: new Date(Date.now() + 600000).toISOString(), createdAt: new Date().toISOString() };
  await page.route('**/api/admin/sessions**', route => route.fulfill({ json: { success: true, data: { sessions: [{ ...session, _id: id, sessionId: 'this-browser', isCurrent: true }, { ...session, _id: otherId, sessionId: 'other-desktop', isCurrent: false }], pagination: { total: 2, page: 1, totalPages: 1 } } } }));
  await page.goto('/admin/sessions');
  const own = page.getByRole('row').filter({ hasText: 'this-browser' });
  const other = page.getByRole('row').filter({ hasText: 'other-desktop' });
  await expect(own.getByText('Current session · This browser', { exact: true })).toBeVisible();
  await expect(own.getByRole('button', { name: 'Force Revoke' })).toHaveCount(0);
  await expect(other.getByRole('button', { name: 'Force Revoke' })).toBeVisible();
});

test('cart explains the dispatch cutoff', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'account');
  await page.route('**/api/cart', route => route.fulfill({ json: { success: true, data: { cart: { items: [{ productId: product(), quantity: 1, priceSnapshot: 100 }] } } } }));
  await page.goto('/cart');
  await expect(page.getByRole('note').filter({ hasText: 'before 5:00 pm IST' })).toBeVisible();
  await expect(page.getByRole('note').filter({ hasText: 'before 5:00 pm IST' })).toContainText('at or after 5:00 pm IST');
});

test('a delayed or empty cart does not repeatedly render recommendations', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'account');
  const errors = [];
  page.on('console', message => {
    if (/Maximum update depth|Too many re-renders/.test(message.text())) errors.push(message.text());
  });
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/cart', async route => {
    // Keep the cart unresolved long enough to exercise its loading state.
    await new Promise(resolve => setTimeout(resolve, 1000));
    await route.fulfill({ json: { success: true, data: { cart: { items: [] } } } });
  });
  await page.goto('/account/cart');
  await expect(page.getByText('Your cart is empty', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('late website settings cannot replace a product photo and non-product pages regain the generic photo', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'storefront');
  let releaseSettings;
  const waiting = new Promise(resolve => { releaseSettings = resolve; });
  await page.route('**/api/content/website-settings', async route => {
    await waiting;
    return route.fulfill({ json: { success: true, data: { settings: { ogImage: { url: 'https://cdn.example.test/generic.png' }, metaTitle: 'Store default' } } } });
  });
  await page.route(`**/api/products/${id}`, route => route.fulfill({ json: { success: true, data: product() } }));
  await page.goto(`/products/${id}`, { waitUntil: 'domcontentloaded' });
  const image = page.locator('meta[property="og:image"]');
  await expect(image).toHaveAttribute('content', 'https://cdn.example.test/adapter.webp');
  const settingsFinished = page.waitForResponse('**/api/content/website-settings'); releaseSettings(); await settingsFinished;
  await expect(image).toHaveAttribute('content', 'https://cdn.example.test/adapter.webp');
  await page.locator('input[aria-label="Search products"]:visible').first().fill('CCTV');
  await page.locator('input[aria-label="Search products"]:visible').first().press('Enter');
  await expect(page).toHaveURL(/search=CCTV/);
  await expect(image).toHaveAttribute('content', 'https://cdn.example.test/generic.png');
});
