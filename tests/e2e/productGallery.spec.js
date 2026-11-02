import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';
const id = '507f1f77bcf86cd799439011';

async function setup(page, imageCount = 4) {
  await mockApi(page); await seedBrowserSession(page, 'storefront');
  const product = { _id: id, name: 'HONEYLINK 3MP Wi-Fi Robot Pan Tilt Camera', sku: 'CAM-1', modelNumber: 'W127', isActive: true,
    stockQuantity: 10, standardPrice: 1500, warranty: '1 YEAR', specifications: [{ key: 'Resolution', value: '3MP' }],
    images: Array.from({ length: imageCount }, (_, i) => ({ url: `/gallery-test/photo-${i}.svg` })) };
  await page.route(`**/api/products/${id}`, route => route.fulfill({ json: { success: true, data: product } }));
  await page.route('**/gallery-test/*.svg', route => route.fulfill({ contentType: 'image/svg+xml', body:
    '<svg xmlns="http://www.w3.org/2000/svg" width="500" height="650"><rect width="500" height="650" fill="#f5f1e9"/><rect x="120" y="360" width="260" height="210" rx="60" fill="#fff"/><circle cx="250" cy="230" r="150" fill="#fff"/><circle cx="250" cy="230" r="105" fill="#182330"/><circle cx="250" cy="230" r="50" fill="#365c6d"/></svg>' }));
  await page.goto(`/products/${id}`);
  await expect(page.getByRole('heading', { name: product.name, exact: true })).toBeVisible();
  return page.getByRole('group', { name: 'Product gallery', exact: true });
}
const imageScale = image => image.evaluate(el => parseFloat(getComputedStyle(el).scale) || 1);

test('image zoom excludes navigation arrows and thumbnail controls', async ({ page }) => {
  const gallery = await setup(page);
  const opener = gallery.getByRole('button', { name: 'Open full size product image' });
  const image = opener.locator('img');
  await opener.hover();
  await expect.poll(() => imageScale(image)).toBe(2);
  for (const name of ['Next image', 'Previous image']) {
    const arrow = gallery.getByRole('button', { name, exact: true });
    await arrow.hover();
    await expect.poll(() => imageScale(image)).toBe(1);
    await arrow.click();
    await expect(page.getByRole('dialog', { name: 'Product image viewer' })).toHaveCount(0);
  }
  await gallery.getByRole('button', { name: 'Select photo 3', exact: true }).click();
  await expect(image).toHaveAttribute('src', '/gallery-test/photo-2.svg');
  await expect(gallery.getByRole('button', { name: 'Select photo 3', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => imageScale(image)).toBe(1);
  await opener.click();
  const dialog = page.getByRole('dialog', { name: 'Product image viewer' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Next image', exact: true }).click();
  await expect(dialog.locator('img').first()).toHaveAttribute('src', '/gallery-test/photo-3.svg');
  await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0);
});

test('side thumbnails scroll without stretching the compact responsive gallery', async ({ page }, testInfo) => {
  const gallery = await setup(page, 12);
  const opener = gallery.getByRole('button', { name: 'Open full size product image' });
  const rail = gallery.getByRole('group', { name: 'Product image thumbnails', exact: true });
  for (const width of [1920, 1440, 1280, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    const mainBox = await opener.boundingBox();
    const railBox = await rail.boundingBox();
    expect(railBox.x + railBox.width).toBeLessThan(mainBox.x);
    expect(Math.abs(railBox.y - mainBox.y)).toBeLessThan(2);
    expect(Math.abs(railBox.height - mainBox.height)).toBeLessThanOrEqual(2);
    expect((await gallery.boundingBox()).height).toBeLessThanOrEqual(480);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await gallery.getByRole('button', { name: 'Select photo 12', exact: true }).click();
    await expect(opener.locator('img')).toHaveAttribute('src', '/gallery-test/photo-11.svg');
    expect(await rail.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
    if (width === 1440 || width === 390) await page.screenshot({ path: testInfo.outputPath(`gallery-${width}.png`), fullPage: true });
  }
});

test('single image uses the full gallery width without a thumbnail rail', async ({ page }) => {
  const gallery = await setup(page, 1);
  await expect(gallery.getByRole('group', { name: 'Product image thumbnails' })).toHaveCount(0);
  await expect(gallery.getByRole('button', { name: 'Next image' })).toHaveCount(0);
  expect((await gallery.boundingBox()).height).toBeLessThanOrEqual(480);
});
