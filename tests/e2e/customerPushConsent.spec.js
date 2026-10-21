import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';

test.skip(process.env.PLAYWRIGHT_PREVIEW === '1', 'Firebase adapter injection uses the development server.');

async function setup(page, permission = 'default', subscribed = false) {
  await mockApi(page); await seedBrowserSession(page, 'account');
  await page.addInitScript(permission => {
    Object.defineProperty(Notification, 'permission', { configurable: true, get: () => permission });
    navigator.geolocation.getCurrentPosition = () => { throw new Error('Push must never request location'); };
    navigator.geolocation.watchPosition = () => { throw new Error('Push must never watch location'); };
  }, permission);
  await page.route('**/src/lib/firebase.js*', route => route.fulfill({ contentType: 'application/javascript', body: `
    export const isFirebaseConfigured = true;
    export async function getPushToken(explicit = false) {
      if (explicit) { window.permissionRequests = (window.permissionRequests || 0) + 1; return 'customer-device'; }
      return Notification.permission === 'granted' ? 'customer-device' : null;
    }
    export function onForegroundPush(callback) { window.receiveFirebaseTest = callback; return () => {}; }
  ` }));
  let registered = false, consent = subscribed;
  await page.route('**/api/push/register-token', route => {
    registered = true; return route.fulfill({ json: { success: true } });
  });
  await page.route('**/api/communications/preferences', route => {
    if (route.request().method() === 'PATCH') {
      expect(registered).toBe(true);
      expect(route.request().postDataJSON()).toEqual({ push: true });
      consent = true;
    }
    return route.fulfill({ json: { success: true, data: { preferences: { email: false, push: consent } } } });
  });
  return { consent: () => consent };
}

for (const permission of ['default', 'granted']) {
  test(`customer with ${permission} permission can enable admin campaigns in one action`, async ({ page }) => {
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const api = await setup(page, permission);
    await page.goto('/account/profile');
    const prompt = page.getByRole('complementary', { name: 'Enable customer notifications' });
    await expect(prompt).toBeVisible();
    expect(await page.evaluate(() => window.permissionRequests || 0)).toBe(0);
    expect(api.consent()).toBe(false);
    await prompt.getByRole('button', { name: 'Enable notifications', exact: true }).click();
    await expect(prompt).toHaveCount(0);
    expect(api.consent()).toBe(true);
    await page.evaluate(() => window.receiveFirebaseTest({ title: 'Customer offer', body: 'From the admin panel', data: {} }));
    await expect(page.getByRole('status', { name: 'Push notification' })).toContainText('Customer offer');
    await page.reload();
    await expect(prompt).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test('dismissing the initial prompt does not subscribe or request permission', async ({ page }) => {
  const api = await setup(page);
  await page.goto('/account/profile');
  const prompt = page.getByRole('complementary', { name: 'Enable customer notifications' });
  await prompt.getByRole('button', { name: 'Not now' }).click();
  await page.reload();
  await expect(prompt).toHaveCount(0);
  expect(api.consent()).toBe(false);
  expect(await page.evaluate(() => window.permissionRequests || 0)).toBe(0);
});

test('blocked notification permission does not produce repeated prompts', async ({ page }) => {
  await setup(page, 'denied'); await page.goto('/account/profile');
  await expect(page.getByRole('heading', { name: /personal information/i })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Enable customer notifications' })).toHaveCount(0);
});

test('failed subscription stays visible and can be retried after device registration', async ({ page }) => {
  const api = await setup(page);
  let failOnce = true;
  await page.route('**/api/communications/preferences', route => {
    if (route.request().method() === 'PATCH' && failOnce) {
      failOnce = false;
      return route.fulfill({ status: 503, json: { success: false, message: 'Please retry notification setup.' } });
    }
    return route.fallback();
  });
  await page.goto('/account/profile');
  const prompt = page.getByRole('complementary', { name: 'Enable customer notifications' });
  await prompt.getByRole('button', { name: 'Enable notifications', exact: true }).click();
  await expect(prompt.getByRole('alert')).toContainText('Please retry notification setup.');
  expect(api.consent()).toBe(false);
  await prompt.getByRole('button', { name: 'Enable notifications', exact: true }).click();
  await expect(prompt).toHaveCount(0);
  expect(api.consent()).toBe(true);
});

test('account page enabling saves push consent without another Save preferences click', async ({ page }) => {
  const api = await setup(page);
  await page.goto('/account/notifications');
  await page.getByRole('button', { name: 'Enable notifications on this browser' }).click();
  await expect(page.getByRole('status')).toContainText('Push notifications are enabled');
  expect(api.consent()).toBe(true);
  await expect(page.getByLabel('Promotional push notifications')).toBeChecked();
  await expect(page.getByLabel('Promotional emails')).not.toBeChecked();
});
