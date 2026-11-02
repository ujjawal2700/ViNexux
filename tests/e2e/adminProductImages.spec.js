import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';
const id = '507f1f77bcf86cd799439011';
async function setup(page) {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  const products = [
    { _id: id, name: 'Catalogue Camera', sku: 'CAM-1', isActive: true, images: [{ url: '/admin-image-test/first.svg' }, { url: '/admin-image-test/second.svg' }] },
    { _id: '507f1f77bcf86cd799439012', name: 'Single Image Camera', sku: 'CAM-2', isActive: true, images: [{ url: '/admin-image-test/single.svg' }] },
    { _id: '507f1f77bcf86cd799439013', name: 'No Image Camera', sku: 'CAM-3', isActive: false, images: [] },
  ];
  await page.route('**/api/admin/products?*', route => route.fulfill({ json: { success: true, data: { products, pagination: { page: 2, total: 23, totalPages: 2, limit: 20 } } } }));
  await page.route('**/admin-image-test/*.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#aaa"/></svg>' }));
  await page.goto('/admin/products?page=2');
}

test('catalogue thumbnail opens a full-screen gallery without leaving the current page', async ({ page }) => {
  await setup(page);
  const opener = page.getByRole('button', { name: 'View images for Catalogue Camera', exact: true });
  await opener.click();
  const dialog = page.getByRole('dialog', { name: 'Product images: Catalogue Camera', exact: true });
  await expect(dialog).toBeVisible();
  const bounds = await dialog.boundingBox();
  expect(bounds).toMatchObject({ x: 0, y: 0, ...page.viewportSize() });
  const image = dialog.locator('img').first();
  await expect(image).toHaveAttribute('src', '/admin-image-test/first.svg');
  await dialog.getByRole('button', { name: 'Next image', exact: true }).click();
  await expect(image).toHaveAttribute('src', '/admin-image-test/second.svg');
  await expect(dialog.getByText('2 / 2', { exact: true })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(image).toHaveAttribute('src', '/admin-image-test/first.svg');
  await page.keyboard.press('ArrowLeft');
  await expect(image).toHaveAttribute('src', '/admin-image-test/second.svg');
  await dialog.getByRole('button', { name: 'Show image 1', exact: true }).click();
  await expect(image).toHaveAttribute('src', '/admin-image-test/first.svg');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
  await expect(page).toHaveURL(/\/admin\/products\?page=2$/);
  await opener.click();
  await dialog.getByRole('button', { name: 'Close image viewer', exact: true }).click();
  await expect(dialog).toHaveCount(0);
});

test('single-image previews fit mobile screens and missing images have no viewer', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await expect(page.getByRole('button', { name: 'View images for No Image Camera', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'View images for Single Image Camera', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Product images: Single Image Camera', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Next image', exact: true })).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: 'Show image 1', exact: true })).toHaveCount(0);
  const bounds = await dialog.locator('img').boundingBox();
  expect(bounds.width).toBeLessThanOrEqual(390);
  expect(bounds.height).toBeLessThan(844);
  await dialog.click({ position: { x: 2, y: 100 } });
  await expect(dialog).toHaveCount(0);
});

async function setupEditor(page, create = false) {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  const writes = [];
  await page.route(`**/api/admin/products/${id}**`, route => {
    if (route.request().method() !== 'GET') writes.push(route.request().method());
    return route.fulfill({ json: { success: true, data: { _id: id, name: 'Editor Camera', sku: 'CAM-1', isActive: true,
      images: [{ url: '/editor-front.svg', altText: 'Front' }, { url: '/editor-back.svg', altText: 'Back' }] } } });
  });
  await page.goto(create ? '/admin/products/new' : `/admin/products/${id}`);
  await page.getByRole('button', { name: /^Pricing & Media/ }).click();
  return writes;
}
const newPhoto = { name: 'new-photo.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="30"><rect width="40" height="30" fill="blue"/></svg>') };

test('editor previews the clicked saved or staged image and preserves editing controls', async ({ page }) => {
  const writes = await setupEditor(page);
  await page.getByRole('button', { name: 'Preview product image 2', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Product images: Editor Camera', exact: true });
  await expect(dialog.locator('img').first()).toHaveAttribute('src', '/editor-back.svg');
  await expect(dialog.getByText('2 / 2', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('#variant-file-input').setInputFiles(newPhoto);
  await page.getByRole('button', { name: 'Preview product image 3', exact: true }).click();
  await expect(dialog.locator('img').first()).toHaveAttribute('src', /^blob:/);
  await expect(dialog.getByText('3 / 3', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Previous image', exact: true }).click();
  await expect(dialog.locator('img').first()).toHaveAttribute('src', '/editor-back.svg');
  await dialog.getByRole('button', { name: 'Close image viewer', exact: true }).click();
  await page.getByTitle('Move Left', { exact: true }).last().click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: 'Preview product image 2', exact: true }).click();
  await expect(dialog.locator('img').first()).toHaveAttribute('src', /^blob:/);
  await page.keyboard.press('Escape');
  await page.getByTitle('Remove Image', { exact: true }).last().click({ force: true });
  await expect(page.getByRole('dialog', { name: 'Remove Image', exact: true })).toBeVisible();
  await expect(dialog).toHaveCount(0);
  expect(writes).toEqual([]);
});

test('unsaved new-product gallery images open full screen without uploading', async ({ page }) => {
  const writes = await setupEditor(page, true);
  await page.locator('#variant-file-input').setInputFiles(newPhoto);
  await page.getByRole('button', { name: 'Preview product image 1', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Product images: Untitled product', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('img').first()).toHaveAttribute('src', /^blob:/);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Preview product image 1', exact: true })).toBeFocused();
  expect(writes).toEqual([]);
});
