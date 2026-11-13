import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';
const id = '507f1f77bcf86cd799439011';
const product = { _id: id, name: '8 MP SEO Camera', categoryPath: '/security/cameras', modelNumber: 'CAM-8MP', sku: 'CAM-8MP', standardPrice: 4500, stockQuantity: 3, images: [{ url: 'https://cdn.example/camera.jpg' }], description: 'Detailed business surveillance.', specifications: [{ key: 'Resolution', value: '8 MP' }] };

test('tracking links stay indexable after rendering and client navigation preserves filter exclusions', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'public');
  await page.goto('/products?utm_source=google&gclid=click');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow, max-image-preview:large');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://vinexus.in/products');
  // Navigate within the mounted router so query-only updates also exercise the hook.
  await page.evaluate(() => {
    history.pushState({}, '', '/products?search=camera&utm_source=google');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
  await page.evaluate(() => {
    history.pushState({}, '', '/products?fbclid=click');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow, max-image-preview:large');
});

test('verification, public titles, canonical product URLs and private noindex survive navigation and settings refresh', async ({ page }) => {
  await page.clock.install(); await mockApi(page); await seedBrowserSession(page, 'account');
  await page.route(`**/api/products/${id}`, route => route.fulfill({ json: { success: true, data: product } }));
  await page.goto(`/products/${id}`);
  await expect(page).toHaveTitle('8 MP SEO Camera | ViNexus');
  await expect(page.locator('meta[name="google-site-verification"]')).toHaveAttribute('content', 'BIdzIKiLz_srzFwDsNbqfYMPkuBRJpeEJhTRNMotlqU');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://vinexus.in/security/cameras/${id}`);
  const schema = JSON.parse(await page.locator('#page-structured-data').textContent());
  expect(schema['@type']).toBe('Product'); expect(schema).not.toHaveProperty('offers');
  await page.clock.runFor(16000);
  await expect(page).toHaveTitle('8 MP SEO Camera | ViNexus');
  await page.locator('.store-footer').getByRole('link', { name: 'Privacy Policy', exact: true }).first().click();
  await expect(page).toHaveTitle('Privacy Policy | ViNexus');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://vinexus.in/privacy');
  await expect(page.locator('#page-structured-data')).toHaveCount(0);
  await page.goto('/products');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://vinexus.in/social-preview.png');
  await page.goto('/account/profile');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
  await expect(page).not.toHaveTitle('Privacy Policy | ViNexus');
  await page.goto('/products?search=camera');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
});

test('Analytics loads once with the confirmed ID after consent, sanitizes URLs and disables collection on private pages', async ({ page }) => {
  await mockApi(page); let loads = 0;
  await page.route('https://www.googletagmanager.com/gtag/js?*', route => { loads++; return route.fulfill({ contentType: 'application/javascript', body: 'window.googleTagTestLoaded=true;' }); });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Allow optional storage', exact: true })).toBeVisible();
  expect(loads).toBe(0);
  await page.getByRole('button', { name: 'Allow optional storage', exact: true }).click();
  await expect.poll(() => loads).toBe(1);
  const configs = await page.evaluate(() => window.dataLayer.map(args => Array.from(args)).filter(args => args[0] === 'config'));
  expect(configs).toHaveLength(1); expect(configs[0][1]).toBe('G-L1LPWYW2V6');
  await page.evaluate(() => window.history.pushState({}, '', '/products?search=private-query'));
  const location = await page.evaluate(() => window.dataLayer.map(args => Array.from(args)).filter(args => args[0] === 'set' && args[1] === 'page_location').at(-1)[2]);
  expect(location).not.toContain('?');
  await page.evaluate(() => window.history.pushState({}, '', '/admin/login'));
  expect(await page.evaluate(() => window['ga-disable-G-L1LPWYW2V6'])).toBe(true);
  expect(loads).toBe(1);
  await page.evaluate(() => { document.cookie = '_ga=test; path=/'; localStorage.setItem('vinexus_storage_choices_v1', JSON.stringify({ preferences: false, analytics: false })); window.dispatchEvent(new Event('storage-choices-updated')); });
  expect(await page.evaluate(() => document.cookie)).not.toContain('_ga=');
});

test('essential-only choices do not load Google Analytics and homepage has a meaningful H1', async ({ page }) => {
  await mockApi(page); let loads = 0;
  await page.route('https://www.googletagmanager.com/**', route => { loads++; return route.abort(); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Essential only', exact: true }).click();
  await expect(page.locator('h1')).toHaveText('ViNexus — Networking, CCTV & IT Hardware');
  expect(loads).toBe(0);
  expect(await page.evaluate(() => window['ga-disable-G-L1LPWYW2V6'])).toBe(true);
});

test('missing category and product pages retain noindex after their parent metadata hooks run', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'public');
  await page.goto('/missing-category');
  await expect(page.getByRole('heading', { name: 'We couldn’t find that page' })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
  await expect(page).toHaveTitle('Page not found | ViNexus');
  await page.route(`**/api/products/${id}`, route => route.fulfill({ status: 404, json: { success: false, message: 'Product not found.' } }));
  await page.goto(`/products/${id}`);
  await expect(page.getByRole('heading', { name: 'We couldn’t find that page' })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
  await expect(page).toHaveTitle('Page not found | ViNexus');
});
