import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';
const errors = new WeakMap();
test.beforeEach(async ({ page }) => { errors.set(page, []); page.on('pageerror', error => errors.get(page).push(error.message)); });
test.afterEach(async ({ page }) => { expect(errors.get(page)).toEqual([]); });
const id = '507f1f77bcf86cd799439011';
async function setup(page) {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  const writes = []; let record; let fail = false;
  await page.route('**/api/admin/products**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (request.method() === 'POST') {
      writes.push(request.postDataJSON());
      if (fail) return route.fulfill({ status: 503, json: { success: false, message: 'Draft save unavailable. Try again.' } });
      record = { ...request.postDataJSON(), _id: id };
    }
    if (request.method() === 'PUT') { writes.push(request.postDataJSON()); record = { ...record, ...request.postDataJSON() }; }
    return route.fulfill({ json: { success: true, data: path.endsWith('/products') && request.method() === 'GET' ? { products: record ? [record] : [], pagination: { total: record ? 1 : 0, totalPages: 1 } } : record || {} } });
  });
  await page.goto('/admin/products');
  await page.getByRole('button', { name: /add product/i }).click();
  await expect(page).toHaveURL(/\/admin\/products\/new/);
  return { writes, record: () => record, fail: value => { fail = value; } };
}
for (const browserBack of [false, true]) test(`new product autosaves as a draft before ${browserBack ? 'browser Back' : 'Back to Products'}`, async ({ page }) => {
  const state = await setup(page);
  await page.locator('#field-name input').fill('Unfinished camera');
  await page.locator('#field-description textarea').fill('Keep these details');
  if (browserBack) await page.goBack(); else await page.getByRole('button', { name: 'Back to Products', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/products(?:\?.*)?$/);
  expect(state.record()).toMatchObject({ name: 'Unfinished camera', description: 'Keep these details', isActive: false });
  expect(state.writes).toHaveLength(2);
  await page.goto(`/admin/products/${id}`);
  await expect(page.locator('#field-name input')).toHaveValue('Unfinished camera');
});
test('failed automatic draft save keeps the editor and typed fields for retry', async ({ page }) => {
  const state = await setup(page); state.fail(true);
  await page.locator('#field-name input').fill('Keep this camera');
  await page.goBack();
  await expect(page).toHaveURL(/\/admin\/products\/new/);
  await expect(page.getByText('Draft save unavailable. Try again.').first()).toBeVisible();
  await expect(page.locator('#field-name input')).toHaveValue('Keep this camera');
  state.fail(false);
  await page.getByRole('button', { name: 'Save Draft', exact: true }).first().click();
  await expect(page).toHaveURL(/\/admin\/products(?:\?.*)?$/);
  expect(state.record().isActive).toBe(false); expect(state.writes).toHaveLength(3);
});

test('Back saves staged product images before leaving the editor', async ({ page }) => {
  const state = await setup(page);
  const image = { url: 'https://example.test/saved-camera.svg', publicId: 'draft-camera', altText: 'Camera draft' };
  let uploaded = 0;
  await page.route(`**/api/admin/products/${id}/images`, async route => {
    expect(route.request().headers()['content-type']).toContain('multipart/form-data');
    uploaded++;
    await route.fulfill({ json: { success: true, data: { uploadedImage: image } } });
  });
  await page.locator('#field-name input').fill('Camera draft');
  await page.getByRole('button', { name: /^Pricing & Media/ }).click();
  await page.locator('#variant-file-input').setInputFiles({ name: 'camera.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="30"><rect width="40" height="30" fill="blue"/></svg>') });
  await page.goBack();
  await expect(page).toHaveURL(/\/admin\/products(?:\?.*)?$/);
  expect(uploaded).toBe(1); expect(state.writes).toHaveLength(2);
  expect(state.record()).toMatchObject({ isActive: false, images: [{ ...image, sortOrder: 0 }] });
});
