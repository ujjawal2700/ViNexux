import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';

test('homepage shows scrolling trending cards and compact unboxed brand logos', async ({ page }, testInfo) => {
  await page.clock.install();
  await mockApi(page);
  await seedBrowserSession(page, 'storefront');
  const products = ['Security Camera', 'Network Router', 'Wireless Access Point', 'Video Recorder', 'Network Switch'].map((name, i) => ({
    _id: String(i + 1).padStart(24, '0'), name, modelNumber: `VNX-${i}`, standardPrice: 2500 + i * 1000,
    stockQuantity: 20, isTrending: true, brandId: { name: 'ViNexus' }, images: [{ url: `/home-test/product-${i}.svg` }],
  }));
  let trendingRequested = false;
  let homepageOrderingRequested = false;
  await page.route('**/api/products?*', route => {
    const url = new URL(route.request().url());
    if (url.searchParams.get('isTrending') === 'true') trendingRequested = true;
    if (url.searchParams.get('sortBy') === 'categoryPriority') homepageOrderingRequested = true;
    return route.fulfill({ json: { success: true, data: { products, pagination: { total: 5, totalPages: 1 } } } });
  });
  await page.route('**/api/products/brands', route => route.fulfill({ json: { success: true, data: { brands:
    ['D-Link', 'CP PLUS', 'SEAGATE', 'LENOVO', 'HP', 'ASUS'].map((name, i) => ({ _id: String(i), name, slug: name.toLowerCase() })),
  } } }));
  await page.route('**/home-test/*.svg', route => route.fulfill({ contentType: 'image/svg+xml', body:
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect x="80" y="65" width="240" height="170" rx="28" fill="#303c48"/><circle cx="200" cy="150" r="54" fill="#172331"/><circle cx="200" cy="150" r="30" fill="#48789b"/></svg>',
  }));
  await page.goto('/');
  const section = page.getByRole('region', { name: 'Trending products', exact: true });
  await expect(section.getByRole('heading', { name: 'Trending Products', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Updated Products' })).toHaveCount(0);
  expect(trendingRequested).toBe(true);
  expect(homepageOrderingRequested).toBe(true);
  expect((await section.locator('.trending-card').first().boundingBox()).height).toBeLessThan(230);
  await expect(section.getByRole('link', { name: /View all/ })).toHaveAttribute('href', '/trending');
  const track = section.locator('.trending-track');
  await page.mouse.move(0, 0);
  const brandsTrack = page.locator('.brand-carousel-track');
  await page.clock.runFor(100);
  const brandsStart = await brandsTrack.evaluate(el => el.scrollLeft);
  const start = await track.evaluate(el => el.scrollLeft);
  await page.clock.runFor(700);
  expect(await track.evaluate(el => el.scrollLeft)).toBeGreaterThan(start);
  expect(await brandsTrack.evaluate(el => el.scrollLeft)).toBeLessThan(brandsStart);
  await track.focus();
  const paused = await track.evaluate(el => el.scrollLeft);
  await page.clock.runFor(300);
  expect(await track.evaluate(el => el.scrollLeft)).toBe(paused);
  await section.getByRole('button', { name: 'Next trending products' }).click();
  await page.clock.runFor(700);
  expect(await track.evaluate(el => el.scrollLeft)).toBeGreaterThan(paused);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.runFor(50);
  await page.mouse.move(0, 0);
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  const stopped = await track.evaluate(el => el.scrollLeft);
  await page.clock.runFor(300);
  expect(await track.evaluate(el => el.scrollLeft)).toBe(stopped);
  const brand = page.locator('.brand-carousel-item a').first();
  await expect(brand).toHaveCSS('border-top-width', '0px');
  expect((await brand.boundingBox()).height).toBeLessThanOrEqual(64);
  await section.screenshot({ path: testInfo.outputPath('trending-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(brand).toHaveCSS('height', '56px');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await section.screenshot({ path: testInfo.outputPath('trending-mobile.png') });
});
