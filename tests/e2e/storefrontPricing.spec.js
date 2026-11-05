import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';

const id = '507f1f77bcf86cd799439011';
const product = {
  _id: id, name: 'Private Price Camera', sku: 'PRIVATE-CAM', modelNumber: 'PRIVATE-01',
  description: 'Camera for checking price visibility.', standardPrice: 7891, dealerPrice: 6789,
  applicablePrice: 7891, stockQuantity: 10, isActive: true, images: [], specifications: [],
};

async function setup(page, role) {
  await mockApi(page);
  if (role) await seedBrowserSession(page, 'account');
  if (role === 'dealer') {
    await page.route('**/api/auth/refresh-token', route => route.fulfill({ json: {
      success: true, data: { accessToken: 'dealer-access', refreshToken: 'customer-refresh',
        user: { _id: id, name: 'Approved dealer', role: 'dealer', dealerStatus: 'approved' } },
    } }));
  }
  await page.route(`**/api/products/${id}`, route => route.fulfill({ json: {
    // Deliberately return prices to guests to verify the UI also guards them.
    success: true, data: { ...product, applicablePrice: role === 'dealer' ? 4567 : 7891 },
  } }));
}

test('guest detail hides prices and offer metadata, and the login button navigates correctly', async ({ page }) => {
  await setup(page);
  await page.goto(`/products/${id}`);
  await expect(page.getByRole('heading', { name: product.name, exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Login to view the prices', exact: true }).first()).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/₹\s?7,891|₹\s?6,789|₹\s?4,567/);
  const productSchemas = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(productSchemas.join('')).not.toContain('"price":7891');
  await page.getByRole('link', { name: 'Login to view the prices', exact: true }).first().click();
  await expect(page).toHaveURL(/\/login$/);
});

for (const role of ['customer', 'dealer']) {
  test(`logged-in ${role} sees the applicable price`, async ({ page }) => {
    await setup(page, role);
    await page.goto(`/products/${id}`);
    await expect(page.getByRole('heading', { name: product.name, exact: true })).toBeVisible();
    await expect(page.locator('body')).toContainText(role === 'dealer' ? /₹\s?4,567/ : /₹\s?7,891/);
    await expect(page.getByRole('link', { name: 'Login to view the prices', exact: true })).toHaveCount(0);
  });
}

test('prices disappear immediately when a customer session expires', async ({ page }) => {
  await setup(page, 'customer');
  await page.goto(`/products/${id}`);
  await expect(page.locator('body')).toContainText(/₹\s?7,891/);
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('session-expired', { detail: { portal: 'customer' } })));
  await expect(page.getByRole('link', { name: 'Login to view the prices', exact: true }).first()).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/₹\s?7,891/);
});

test('guest cart hides historical saved prices and totals', async ({ page }) => {
  await setup(page);
  await page.addInitScript(product => {
    localStorage.setItem('vinexus_guest_cart', JSON.stringify([{ productId: product, quantity: 2, priceSnapshot: 7891 }]));
  }, product);
  await page.goto('/cart');
  await expect(page.getByRole('link', { name: 'Login to view the prices', exact: true }).first()).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/₹\s?7,891|₹\s?15,782/);
});

test('guest product cards show a login button instead of the price', async ({ page }) => {
  await setup(page);
  await page.route('**/api/products?*', route => route.fulfill({ json: {
    success: true, data: { products: [product], pagination: { page: 1, total: 1, totalPages: 1 }, facets: { brands: [], specs: [], availability: [] } },
  } }));
  await page.goto('/products');
  await expect(page.getByRole('heading', { name: product.name, exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Login to view the prices', exact: true }).first()).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/₹\s?7,891/);
});

for (const authenticated of [false, true]) {
  test(`${authenticated ? 'customer' : 'guest'} wishlist uses current price visibility and removes saved prices`, async ({ page }) => {
    await setup(page, authenticated ? 'customer' : undefined);
    await page.addInitScript(product => {
      localStorage.setItem('vinexus_storage_choices_v1', JSON.stringify({ preferences: true }));
      localStorage.setItem('vinexus_wishlist', JSON.stringify([product]));
    }, product);
    await page.goto('/wishlist');
    await expect(page.locator(`a[title="${product.name}"]`)).toBeVisible();
    if (authenticated) {
      await expect(page.locator('body')).toContainText(/₹\s?7,891/);
    } else {
      await expect(page.getByRole('link', { name: 'Login to view the prices', exact: true }).first()).toBeVisible();
      await expect(page.locator('body')).not.toContainText(/₹\s?7,891/);
    }
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('vinexus_wishlist')));
    expect(saved[0]).not.toHaveProperty('standardPrice');
    expect(saved[0]).not.toHaveProperty('dealerPrice');
  });
}
