import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';
import { bannerVideoFixture } from '../helpers/bannerVideoFixture.js';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jY9kAAAAASUVORK5CYII=', 'base64');
const media = section => ({ _id: String(section + 1).padStart(24, '0'), mediaType: 'video', url: `/banner-test/${section}.mp4`, posterUrl: `/banner-test/${section}.png`, title: `Promo ${section + 1}`, fit: 'cover' });
async function setup(page, connection = { effectiveType: '3g', downlink: .4, rtt: 500, saveData: false }) {
  await page.addInitScript(connection => {
    const network = Object.assign(new EventTarget(), connection); Object.defineProperty(navigator, 'connection', { value: network, configurable: true });
  }, connection);
  await mockApi(page); const requests = [];
  await page.route('**/api/content/banner-grid', route => route.fulfill({ json: { success: true, data: { grid: { configured: true, sections: [0, 1].map(i => ({ images: [media(i)] })) } } } }));
  await page.route('**/banner-test/*.png', route => route.fulfill({ contentType: 'image/png', body: png }));
  await page.route('**/banner-test/*.mp4', route => { requests.push(route.request().url()); return route.fulfill({ contentType: 'video/mp4', body: bannerVideoFixture() }); });
  return requests;
}
test('slow or data-saving connections load thumbnails only, even after initial page loading', async ({ page }) => {
  const requests = await setup(page);
  await page.goto('/'); const videos = page.locator('.hero-bento-grid video');
  await expect(videos).toHaveCount(2);
  await page.waitForTimeout(3300);
  for (const video of await videos.all()) { await expect(video).not.toHaveAttribute('src'); await expect(video).toHaveAttribute('preload', 'none'); }
  expect(requests).toHaveLength(0);
  await page.evaluate(() => { Object.assign(navigator.connection, { effectiveType: '4g', downlink: 10, rtt: 50, saveData: true }); navigator.connection.dispatchEvent(new Event('change')); });
  await page.waitForTimeout(3300); expect(requests).toHaveLength(0);
});
test('video starts after a stable connection and returns to its thumbnail when the network weakens', async ({ page }) => {
  const requests = await setup(page);
  await page.goto('/'); await expect(page.locator('.hero-bento-grid video')).toHaveCount(2); expect(requests).toHaveLength(0);
  await page.evaluate(() => { Object.assign(navigator.connection, { effectiveType: '4g', downlink: 10, rtt: 50 }); navigator.connection.dispatchEvent(new Event('change')); });
  await expect.poll(() => requests.length).toBeGreaterThan(0);
  await expect(page.locator('.hero-bento-grid video').first()).toHaveAttribute('src', '/banner-test/0.mp4');
  await page.evaluate(() => { Object.assign(navigator.connection, { effectiveType: '2g', downlink: .2, rtt: 1000 }); navigator.connection.dispatchEvent(new Event('change')); });
  await expect(page.locator('.hero-bento-grid video').first()).not.toHaveAttribute('src');
  await expect(page.getByRole('button', { name: 'Play banner video' }).first()).toBeVisible();
});
test('an admin can upload a promotional video in either banner section', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin'); let grid = { configured: false, revision: 0, sections: [{ images: [] }, { images: [] }] };
  const posts = [];
  await page.route('**/api/admin/cms/banner-grid**', route => {
    const request = route.request(); if (request.method() === 'POST') {
      const section = Number(new URL(request.url()).pathname.split('/')[5]); posts.push(section);
      grid.sections[section].images.push(media(section)); grid.revision++; grid.configured = true;
    }
    return route.fulfill({ json: { success: true, data: { grid } } });
  });
  await page.goto('/admin/cms/banners');
  for (const section of [0, 1]) {
    const file = page.getByLabel(`Upload images for section ${section + 1}`, { exact: true }); await expect(file).toHaveAttribute('accept', /video\/mp4/);
    await file.setInputFiles({ name: 'promo.mp4', mimeType: 'video/mp4', buffer: bannerVideoFixture() });
    await expect(page.getByRole('dialog').locator('video').first()).toBeVisible();
    await page.getByRole('button', { name: 'Upload 1 banner', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  expect(posts).toEqual([0, 1]);
});
test('homepage makes one request per public content resource and limits initial merchandising queries', async ({ page }) => {
  await mockApi(page); const calls = [];
  page.on('request', request => { if (request.url().includes('/api/')) calls.push(new URL(request.url())); });
  await page.goto('/'); await expect(page.locator('.hero-bento-grid')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'New Arrivals', exact: true })).toBeVisible();
  for (const path of ['/api/categories/tree', '/api/content/banner-grid', '/api/content/footer-content']) expect(calls.filter(url => url.pathname === path)).toHaveLength(1);
  const products = calls.filter(url => url.pathname === '/api/products'); expect(products).toHaveLength(3);
  for (const url of products) expect(Number(url.searchParams.get('limit'))).toBe(16);
});
