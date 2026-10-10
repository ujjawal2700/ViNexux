import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';

test('catalog sort menu requests newest, updated stock and trending products from page one', async ({ page }) => {
  await mockApi(page);
  await seedBrowserSession(page, 'storefront');
  await page.goto('/products');
  const sort = page.getByRole('button', { name: 'Sort products', exact: true });
  await sort.click();
  await expect(page.getByRole('menuitem', { name: /Name \(/ })).toHaveCount(0);
  for (const [name, field, trending] of [['Newest First', 'createdAt', false], ['Stock Updated', 'stockUpdatedAt', false], ['Trending', 'createdAt', true], ['Default', 'createdAt', false]]) {
    if (name !== 'Newest First') await sort.click();
    const request = page.waitForRequest(req => {
      const url = new URL(req.url());
      return url.pathname === '/api/products' && url.searchParams.get('sortBy') === field && url.searchParams.get('isTrending') === (trending ? 'true' : null);
    });
    await page.getByRole('menuitem', { name, exact: true }).click();
    const url = new URL((await request).url());
    expect(url.searchParams.get('sortOrder')).toBe('desc');
    expect(url.searchParams.get('page')).toBe('1');
  }
});

test('admin catalog trending checkbox saves immediately and remains checked after reload', async ({ page }) => {
  await mockApi(page);
  await seedBrowserSession(page, 'admin');
  const product = { _id: '507f1f77bcf86cd799439011', name: 'Trending camera', sku: 'CAMERA', isTrending: false, images: [], isActive: true };
  await page.route('**/api/admin/products**', async route => {
    if (route.request().method() === 'PUT') {
      Object.assign(product, route.request().postDataJSON());
      return route.fulfill({ json: { success: true, data: product } });
    }
    return route.fulfill({ json: { success: true, data: { products: [product], pagination: { page: 1, total: 1, totalPages: 1 } } } });
  });
  await page.goto('/admin/products');
  const checkbox = page.getByRole('checkbox', { name: 'Trending: Trending camera' });
  await checkbox.check();
  await expect(checkbox).toBeChecked();
  expect(product.isTrending).toBe(true);
  await expect(page).toHaveURL(/\/admin\/products$/);
  await page.reload();
  await expect(checkbox).toBeChecked();
  await checkbox.uncheck();
  await expect(checkbox).not.toBeChecked();
  expect(product.isTrending).toBe(false);
});
