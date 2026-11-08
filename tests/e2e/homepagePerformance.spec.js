import { test, expect } from '@playwright/test';
import { mockApi } from './mockApi.js';
import { presetConfig } from '../../shared/seasonalThemes.js';
const image = 'https://res.cloudinary.com/fixture/image/upload/v123/banner.webp';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jY9kAAAAASUVORK5CYII=', 'base64');

test('mobile uses responsive banner images, shares public requests and keeps inactive slides unloaded', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: Object.assign(new EventTarget(), { saveData: true, effectiveType: '3g', downlink: .5 }) }));
  await mockApi(page);
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  await page.route('https://res.cloudinary.com/**', route => route.fulfill({ contentType: 'image/png', body: png }));
  await page.route('**/api/content/banner-grid', route => route.fulfill({ json: { success: true, data: { grid: { configured: true, sections: [{ images: [{ url: image }, { url: image.replace('banner', 'second') }] }, { images: [] }] } } } }));
  await page.goto('/');
  const first = page.locator('.bento-banner-tile-1 img').first();
  await expect(first).toBeVisible();
  await expect(first).toHaveAttribute('fetchpriority', 'high');
  await expect(first).toHaveAttribute('srcset', /w_320/);
  await expect(page.locator('.bento-banner-tile-1 img').nth(1)).not.toHaveAttribute('srcset');
  await expect(page.getByRole('heading', { name: 'All Products', exact: true })).toBeVisible();
  await page.waitForTimeout(5500);
  expect(requests.filter(url => url.includes('/api/products/brands'))).toHaveLength(1);
  expect(requests.filter(url => url.includes('/api/content/banner-grid'))).toHaveLength(1);
  expect(requests.some(url => url.includes('/second.webp'))).toBe(false);
  expect(requests.some(url => /firebase.*\.js|\/ProductsPage-.*\.js|\/ProductDetailPage-.*\.js/.test(url))).toBe(false);
  await page.getByRole('button', { name: 'Next image in section 1' }).click();
  await expect.poll(() => requests.some(url => url.includes('/second.webp'))).toBe(true);
});

test('saved festive themes request optimized decorations and preserve banner mounting while products load', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockApi(page);
  await page.route('**/api/content/theme', route => route.fulfill({ json: { success: true, data: { theme: { name: 'Diwali', config: presetConfig('diwali') } } } }));
  await page.route('**/api/products?**', async route => { await new Promise(resolve => setTimeout(resolve, 700)); await route.fallback(); });
  const requests = []; page.on('request', request => requests.push(request.url()));
  await page.goto('/');
  const banner = await page.locator('.hero-bento-grid').elementHandle();
  await expect(page.getByRole('heading', { name: 'All Products', exact: true })).toBeVisible();
  expect(await banner.evaluate(element => element.isConnected)).toBe(true);
  expect(requests.some(url => url.includes('/theme-assets/diwali/') && url.endsWith('.png'))).toBe(false);
  expect(requests.some(url => url.endsWith('header-marigold-v1.webp'))).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('optimized-home-mobile.png') });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: testInfo.outputPath('optimized-home-desktop.png') });
});
