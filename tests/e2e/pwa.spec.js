import { test, expect, devices } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';
test.use({ ...devices['Pixel 7'] });

test('Android admin page has a separate valid install manifest, icons and active scoped worker', async ({ page }) => {
  await mockApi(page); await page.goto('/admin/login');
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/admin/manifest.webmanifest');
  await expect(page.locator('meta[name="application-name"]')).toHaveAttribute('content', 'ViNexus Admin');
  const manifestResponse = await page.request.get('/admin/manifest.webmanifest');
  expect(manifestResponse.status()).toBe(200); expect(manifestResponse.headers()['content-type']).toContain('application/manifest+json');
  const manifest = await manifestResponse.json();
  expect(manifest).toMatchObject({ id: '/admin/', start_url: '/admin/login', scope: '/admin/', display: 'standalone', prefer_related_applications: false });
  for (const icon of manifest.icons) {
    const dimensions = await page.evaluate(async src => { const image = new Image(); image.src = src; await image.decode(); return `${image.naturalWidth}x${image.naturalHeight}`; }, icon.src);
    expect(dimensions).toBe(icon.sizes);
  }
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL || '')).toContain('/admin/sw.js');
  const cdp = await page.context().newCDPSession(page);
  const app = await cdp.send('Page.getAppManifest');
  expect(app.errors).toEqual([]); expect(app.url).toContain('/admin/manifest.webmanifest');
  await expect.poll(async () => (await cdp.send('Page.getInstallabilityErrors')).installabilityErrors).toEqual([]);
});

test('admin offline mode shows a generic reconnect screen and never caches authenticated data', async ({ page, context }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  await page.goto('/admin/profile');
  await expect(page.getByRole('heading', { name: 'Admin Settings & Profile', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL || '')).toContain('/admin/sw.js');
  const cached = await page.evaluate(async () => {
    const keys = await caches.keys(); const urls = [];
    for (const key of keys.filter(key => key.startsWith('vinexus-admin-'))) for (const request of await (await caches.open(key)).keys()) urls.push(new URL(request.url).pathname);
    return urls;
  });
  expect(cached).toEqual(['/admin/offline.html']);
  await context.setOffline(true); await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: "You're offline" })).toBeVisible();
  await expect(page.getByText('Connect to the internet to sign in and manage your store.', { exact: false })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Try again' })).toHaveAttribute('href', '/admin/login');
});

test('storefront and admin retain distinct identities across client-side navigation', async ({ page }) => {
  await mockApi(page); await page.goto('/');
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest');
  const storefront = await (await page.request.get('/manifest.webmanifest')).json();
  const admin = await (await page.request.get('/admin/manifest.webmanifest')).json();
  expect(storefront.id).not.toBe(admin.id); expect(storefront.start_url).toBe('/');
  await page.evaluate(() => { history.pushState({}, '', '/admin/login'); window.dispatchEvent(new PopStateEvent('popstate')); });
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/admin/manifest.webmanifest');
  await page.evaluate(() => { history.pushState({}, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')); });
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest');
});
