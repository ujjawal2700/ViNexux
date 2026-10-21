import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';

test.skip(process.env.PLAYWRIGHT_PREVIEW === '1', 'Firebase source-module injection requires the development server; covered in the development browser suite.');

for (const portal of ['admin', 'customer']) {
  test(`${portal} registers after auth restoration and shows foreground push for an id-only account`, async ({ page }) => {
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await mockApi(page); await seedBrowserSession(page, portal === 'admin' ? 'admin' : 'account');
    await page.route('**/src/lib/firebase.js*', route => route.fulfill({ contentType: 'application/javascript', body: `
      export const isFirebaseConfigured = true;
      export async function getPushToken() { return 'fixture-browser-token'; }
      export function onForegroundPush(callback) { window.receiveFirebaseTest = callback; return () => { delete window.receiveFirebaseTest; }; }
    ` }));
    await page.route('**/api/auth/refresh-token', async route => {
      await route.fulfill({ json: { success: true, data: { accessToken: 'restored-access', refreshToken: `${portal}-refresh`,
        user: { id: '507f1f77bcf86cd799439011', fullName: 'Push Tester', email: 'push@example.test', role: portal, phone: '9876543210' },
        session: { expiresAt: new Date(Date.now() + 86400000).toISOString() } } } });
    });
    let registrations = 0;
    await page.route('**/api/push/register-token', async route => {
      expect(route.request().headers().authorization).toBe('Bearer restored-access');
      expect(route.request().postDataJSON().token).toBe('fixture-browser-token'); registrations++;
      await route.fulfill({ json: { success: true, data: {} } });
    });
    await page.goto(portal === 'admin' ? '/admin/dashboard' : '/account/profile');
    await expect.poll(() => registrations).toBeGreaterThan(0);
    await expect.poll(() => page.evaluate(() => typeof window.receiveFirebaseTest)).toBe('function');
    await page.evaluate(() => window.receiveFirebaseTest({ title: 'Expired test', body: 'Do not show', data: { expiresAt: String(Date.now() - 1000) } }));
    await expect(page.getByRole('status', { name: 'Push notification' })).toHaveCount(0);
    await page.evaluate(() => window.receiveFirebaseTest({ title: 'ViNexus test notification', body: 'Received while this page is open', data: {
      expiresAt: String(Date.now() + 60000), link: 'https://example.test/products', actions: JSON.stringify([{ label: 'Unsafe action', url: 'javascript:alert(1)' }, { label: 'Browse offers', url: 'https://example.test/offers' }]),
    } }));
    const notification = page.getByRole('status', { name: 'Push notification' });
    await expect(notification).toContainText('ViNexus test notification');
    await expect(notification.locator('img')).toHaveCount(0);
    await expect(notification.getByRole('link', { name: 'View details' })).toHaveAttribute('href', 'https://example.test/products');
    await expect(notification.getByRole('link', { name: 'Browse offers' })).toHaveAttribute('href', 'https://example.test/offers');
    await expect(notification.getByRole('link', { name: 'Unsafe action' })).toHaveCount(0);
    await notification.getByRole('button', { name: 'Dismiss notification' }).click();
    await expect(notification).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
