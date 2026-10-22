import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';
const id = '507f1f77bcf86cd799439011';

test('admin adds, edits and removes fields; saved fields appear in the storefront overview', async ({ page }) => {
  await mockApi(page);
  await seedBrowserSession(page, 'admin');
  const product = { _id: id, name: 'Outdoor Camera', sku: 'CAM-1', modelNumber: 'CAM-1', isActive: true,
    stockQuantity: 10, standardPrice: 100, images: [{ url: 'https://example.com/camera.webp' }], specifications: [] };
  const updates = [];
  await page.route(`**/api/admin/products/${id}`, route => {
    if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON(); updates.push(body); Object.assign(product, body);
    }
    return route.fulfill({ json: { success: true, data: product } });
  });
  await page.goto(`/admin/products/${id}`);
  await page.getByRole('button', { name: 'Add field', exact: true }).click();
  await page.getByRole('button', { name: 'Save & Publish', exact: true }).click();
  await expect(page.locator('#field-additionalDetails')).toContainText('Enter a label and value');
  expect(updates).toHaveLength(0);
  await page.getByLabel('Additional field 1 label', { exact: true }).fill(' Country of origin ');
  await page.getByLabel('Additional field 1 value', { exact: true }).fill(' India ');
  await page.getByRole('button', { name: 'Save & Publish', exact: true }).click();
  await expect.poll(() => updates.length).toBe(1);
  expect(updates[0]).toEqual({ additionalDetails: [{ key: 'Country of origin', value: 'India' }] });
  await page.reload();
  await expect(page.getByLabel('Additional field 1 value', { exact: true })).toHaveValue('India');
  await page.getByLabel('Additional field 1 value', { exact: true }).fill('Made in India');
  await page.getByRole('button', { name: 'Save & Publish', exact: true }).click();
  await expect.poll(() => updates.length).toBe(2);
  await page.route(`**/api/products/${id}`, route => route.fulfill({ json: { success: true, data: product } }));
  await page.goto(`/products/${id}`);
  const row = page.getByRole('row').filter({ hasText: 'Country of origin' });
  await expect(row).toContainText('Made in India');
  await page.goto(`/admin/products/${id}`);
  await page.getByRole('button', { name: 'Remove additional field 1', exact: true }).click();
  await page.getByRole('button', { name: 'Save & Publish', exact: true }).click();
  await expect.poll(() => updates.length).toBe(3);
  expect(updates[2]).toEqual({ additionalDetails: [] });
  await page.goto(`/products/${id}`);
  await expect(page.getByRole('row').filter({ hasText: 'Country of origin' })).toHaveCount(0);
});
