import { test, expect } from '@playwright/test';
import { mockApi } from './mockApi.js';
import { presetConfig } from '../../shared/seasonalThemes.js';
const startup = { version: 1, settings: { websiteName: 'Startup fixture', maintenanceEnabled: false, promoPopupEnabled: false }, theme: { name: 'Diwali', config: presetConfig('diwali') }, grid: { configured: true, sections: [{ images: [{ url: '/startup-banner.svg', title: 'Instant banner' }] }, { images: [] }] } };
const insert = (page, data) => page.route('**/', async route => {
  if (route.request().resourceType() !== 'document') return route.fallback();
  const response = await route.fetch();
  const body = (await response.text()).replace('</head>', `<script id="storefront-startup" type="application/json">${JSON.stringify({ ...data, createdAt: data.createdAt || Date.now() })}</script></head>`);
  return route.fulfill({ response, body });
});

test('homepage renders initial theme/banner without browser settings, theme or banner requests; maintenance still refreshes', async ({ page }) => {
  await mockApi(page);
  await insert(page, startup);
  const requests = []; page.on('request', request => requests.push(request.url()));
  await page.route('**/startup-banner.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><rect width="800" height="400" fill="red"/></svg>' }));
  await page.clock.install();
  await page.goto('/');
  await expect(page.locator('.hero-bento-grid img').first()).toHaveAttribute('src', '/startup-banner.svg');
  await expect(page.locator('.theme-announcement')).toHaveText('Wishing you a bright and joyful Diwali!');
  expect(requests.filter(url => /\/api\/content\/(website-settings|theme|banner-grid)(\?|$)/.test(url))).toHaveLength(0);
  await page.route('**/api/content/website-settings', route => route.fulfill({ json: { success: true, data: { settings: { maintenanceEnabled: true, maintenanceMessage: 'Updating now' } } } }));
  await page.clock.fastForward(16000);
  await expect(page.getByRole('heading', { name: "We're under maintenance" })).toBeVisible();
});

test('expired startup data falls back to the public endpoints', async ({ page }) => {
  await mockApi(page);
  await insert(page, { ...startup, createdAt: Date.now() - 180000 });
  const requests = []; page.on('request', request => requests.push(request.url()));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'All Products', exact: true })).toBeVisible();
  for (const endpoint of ['website-settings', 'theme', 'banner-grid']) expect(requests.some(url => url.includes(`/api/content/${endpoint}`))).toBe(true);
});
