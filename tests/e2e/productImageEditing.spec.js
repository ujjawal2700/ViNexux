import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';
const id = '507f1f77bcf86cd799439011';
const oldImage = { url: 'https://example.com/old.webp', publicId: 'vinexus/products/old', altText: 'Old image', sortOrder: 0 };
const nextImage = { url: 'https://example.com/new.webp', publicId: 'vinexus/products/new', altText: 'New image', sortOrder: 1 };
const svg = { name: 'replacement.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10"><rect width="20" height="10"/></svg>') };
async function setup(page, overrides = {}, failFirstUpload = false) {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  const product = { _id: id, name: 'Legacy camera', sku: 'LEGACY-1', modelNumber: '', brandId: null,
    isActive: true, stockQuantity: 18, images: [oldImage], ...overrides };
  const updates = [], uploads = []; let attempts = 0;
  await page.route(`**/api/admin/products/${id}**`, async route => {
    const request = route.request();
    if (request.method() === 'POST') {
      uploads.push({ type: request.headers()['content-type'], body: request.postDataBuffer().toString() }); attempts++;
      if (failFirstUpload && attempts === 1) return route.fulfill({ status: 400, json: { success: false, message: 'This image could not be processed.', details: [{ path: 'images', message: 'Choose a valid image.' }] } });
      product.images.push(nextImage);
      return route.fulfill({ json: { success: true, data: { ...product, uploadedImage: nextImage } } });
    }
    if (request.method() === 'PUT') { const body = request.postDataJSON(); updates.push(body); Object.assign(product, body); }
    return route.fulfill({ json: { success: true, data: product } });
  });
  await page.goto(`/admin/products/${id}`);
  await expect(page.getByRole('heading', { name: /Edit Product/ })).toBeVisible();
  return { product, updates, uploads };
}
async function stageReplacement(page) {
  await page.getByRole('button', { name: /^Pricing & Media/ }).click();
  await page.getByTitle('Remove Image', { exact: true }).click({ force: true });
  await page.getByRole('dialog').getByRole('button', { name: /Remove/ }).click();
  await page.locator('#variant-file-input').setInputFiles(svg);
}
test('SVG image replacement on a legacy product sends multipart and preserves all unrelated fields', async ({ page }) => {
  const { product, updates, uploads } = await setup(page);
  await stageReplacement(page);
  await page.getByRole('button', { name: 'Save & Publish', exact: true }).click();
  await expect.poll(() => updates.length).toBe(1);
  expect(uploads[0].type).toMatch(/^multipart\/form-data; boundary=/);
  expect(uploads[0].body).toContain('filename="replacement.svg"');
  expect(updates[0]).toEqual({ images: [{ ...nextImage, sortOrder: 0 }], expectedImages: [oldImage.publicId, nextImage.publicId] });
  expect(product.isActive).toBe(true); expect(product.stockQuantity).toBe(18);
  await page.reload();
  await page.getByRole('button', { name: /^Pricing & Media/ }).click();
  await expect(page.getByRole('img', { name: 'New image', exact: true })).toBeVisible();
});
test('failed upload keeps the replacement staged and saving again retries it', async ({ page }) => {
  const { product, updates, uploads } = await setup(page, {}, true);
  await stageReplacement(page);
  await page.getByRole('button', { name: 'Save & Publish', exact: true }).click();
  await expect(page.locator('#field-images').getByText('Choose a valid image.', { exact: true })).toBeVisible();
  expect(updates).toHaveLength(0); expect(product.images).toEqual([oldImage]);
  await page.getByRole('button', { name: 'Save & Publish', exact: true }).click();
  await expect.poll(() => updates.length).toBe(1); expect(uploads).toHaveLength(2);
});
test('editing an invalid mandatory field focuses it and prevents the update', async ({ page }) => {
  const { updates } = await setup(page, { modelNumber: 'CAM-1' });
  const title = page.locator('#field-name input');
  await title.fill('');
  await page.getByRole('button', { name: 'Save & Publish', exact: true }).click();
  await expect(page.locator('#field-name')).toContainText('Product Title is required.');
  await expect(title).toBeFocused(); expect(updates).toHaveLength(0);
});
test('server image URL errors focus the gallery rather than the product URL field', async ({ page }) => {
  await setup(page);
  await page.route(`**/api/admin/products/${id}`, route => route.request().method() === 'PUT'
    ? route.fulfill({ status: 400, json: { message: 'Invalid image URL', details: [{ path: 'images.0.url', message: 'Image URL is invalid.' }] } }) : route.fallback());
  await page.getByRole('button', { name: 'Save & Publish', exact: true }).click();
  await expect(page.locator('#field-images')).toContainText('Image URL is invalid.');
  await expect(page.locator('#field-images')).toBeVisible();
});
