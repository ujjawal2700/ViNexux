import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';

test('admin catalogue separates category levels and sends multiple selections together', async ({ page }) => {
  await mockApi(page);
  await seedBrowserSession(page, 'admin');
  const ids = ['11', '12', '13', '14'].map(suffix => `507f1f77bcf86cd7994390${suffix}`);
  const categories = [
    { _id: ids[0], name: 'Hardware', parentId: null },
    { _id: ids[1], name: 'Security', parentId: null },
    { _id: ids[2], name: 'Cameras', parentId: ids[1] },
    { _id: ids[3], name: 'IP Cameras', parentId: { _id: ids[2] } },
  ];
  await page.route('**/api/admin/categories**', route => route.fulfill({ json: { success: true, data: { categories } } }));
  let query;
  await page.route('**/api/admin/products?**', route => {
    query = new URL(route.request().url()).searchParams;
    return route.fulfill({ json: { success: true, data: { products: [], pagination: { total: 0 } } } });
  });
  await page.goto('/admin/products');
  await page.getByLabel('Header categories', { exact: true }).first().click();
  const headers = page.getByRole('group', { name: 'Header categories', exact: true });
  await expect(headers.getByRole('checkbox')).toHaveCount(2);
  await headers.getByLabel('Hardware').check();
  await headers.getByLabel('Security').check();
  await expect.poll(() => query?.get('headerCategoryIds')).toBe(ids.slice(0, 2).join(','));
  await page.getByLabel('Header categories', { exact: true }).first().click();
  await page.getByLabel('Main categories', { exact: true }).first().click();
  const mains = page.getByRole('group', { name: 'Main categories', exact: true });
  await expect(mains.getByRole('checkbox')).toHaveCount(1);
  await mains.getByLabel('Cameras', { exact: true }).check();
  await expect.poll(() => query?.get('mainCategoryIds')).toBe(ids[2]);
  expect(query.get('headerCategoryIds')).toBe(ids.slice(0, 2).join(','));
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect.poll(() => query?.has('headerCategoryIds') || query?.has('mainCategoryIds')).toBe(false);
});
