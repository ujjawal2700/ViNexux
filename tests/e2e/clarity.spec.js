import { test, expect } from '@playwright/test';
import { mockApi } from './mockApi.js';
test('Clarity loads once after analytics opt-in and stops before private routes or consent withdrawal', async ({ page }) => {
  await mockApi(page); let loads = 0;
  await page.route('https://www.clarity.ms/tag/**', route => { loads++; return route.fulfill({ contentType: 'application/javascript', body: 'window.clarityCalls=window.clarity.q.map(args=>Array.from(args));window.clarity=function(){window.clarityCalls.push(Array.from(arguments))};' }); });
  await page.route('https://www.googletagmanager.com/**', route => route.fulfill({ contentType: 'application/javascript', body: '' }));
  await page.goto('/'); await expect(page.locator('#clarity-script')).toHaveCount(0); expect(loads).toBe(0);
  await page.getByRole('button', { name: 'Allow optional storage', exact: true }).click();
  await expect.poll(() => loads).toBe(1);
  await expect(page.locator('#clarity-script')).toHaveAttribute('src', 'https://www.clarity.ms/tag/z9lnjg4lha?ref=npm');
  await expect.poll(() => page.evaluate(() => window.clarityCalls?.some(args => args[0] === 'consentv2' && args[1].analytics_Storage === 'granted'))).toBe(true);
  await page.getByRole('link', { name: 'Login', exact: true }).first().click();
  await expect.poll(() => page.evaluate(() => window.clarityCalls?.at(-1)?.[0])).toBe('stop');
  await page.goBack(); await expect.poll(() => page.evaluate(() => window.clarityCalls?.some(args => args[0] === 'start'))).toBe(true);
  expect(loads).toBe(1);
  await page.evaluate(() => { window.dispatchEvent(new Event('open-storage-choices')); });
  await page.getByRole('button', { name: 'Essential only', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.clarityCalls?.at(-1)?.[0])).toBe('stop');
  expect(loads).toBe(1);
});
test('Clarity never loads on private pages even with saved analytics consent', async ({ page }) => {
  await mockApi(page); let loads = 0;
  await page.addInitScript(() => localStorage.setItem('vinexus_storage_choices_v1', JSON.stringify({ preferences: true, analytics: true })));
  await page.route('https://www.clarity.ms/tag/**', route => { loads++; return route.fulfill({ body: '' }); });
  await page.goto('/login'); await expect(page.getByRole('button', { name: 'Login', exact: true }).first()).toBeVisible();
  expect(loads).toBe(0); await expect(page.locator('#clarity-script')).toHaveCount(0);
});
