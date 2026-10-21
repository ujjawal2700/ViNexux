import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';

test.skip(process.env.PLAYWRIGHT_PREVIEW === '1', 'Firebase source-module injection requires the development server; covered in the development browser suite.');

for (const role of ['admin', 'customer', 'dealer']) {
  test(`${role} persists the registered browser token across reload and clears it on logout`, async ({ page }) => {
    await mockApi(page); await seedBrowserSession(page, role === 'admin' ? 'admin' : 'account');
    // No Firebase connection, permission prompt or notification is used here.
    await page.route('**/src/lib/firebase.js*', route => route.fulfill({ contentType: 'application/javascript', body: `
      export const isFirebaseConfigured = true;
      export async function getPushToken() { return 'fixture-local-storage-token'; }
      export function onForegroundPush() { return () => {}; }
    ` }));
    const portal = role === 'admin' ? 'admin' : 'customer';
    const user = { id: '507f1f77bcf86cd799439011', fullName: 'Storage Tester', email: 'storage@example.test', phone: '9876543210', role };
    await page.route('**/api/auth/refresh-token', route => route.fulfill({ json: { success: true, data: {
      user, accessToken: 'storage-access', refreshToken: `${portal}-refresh`, session: { expiresAt: new Date(Date.now() + 86400000).toISOString() },
    } } }));
    await page.route('**/api/auth/me', route => route.fulfill({ json: { success: true, data: { user } } }));
    let registrations = 0, removals = 0;
    await page.route('**/api/push/register-token', route => {
      expect(route.request().postDataJSON()).toEqual({ token: 'fixture-local-storage-token' }); registrations++;
      return route.fulfill({ json: { success: true } });
    });
    await page.route('**/api/push/unregister-token', route => {
      expect(route.request().postDataJSON()).toEqual({ token: 'fixture-local-storage-token' }); removals++;
      return route.fulfill({ json: { success: true } });
    });
    const key = role === 'admin' ? 'vinexus_admin_fcm_token' : 'vinexus_fcm_token';
    await page.goto(role === 'admin' ? '/admin/dashboard' : role === 'dealer' ? '/' : '/account/profile');
    await expect.poll(() => page.evaluate(key => localStorage.getItem(key), key)).toBe('fixture-local-storage-token');
    await page.reload();
    await expect.poll(() => registrations).toBeGreaterThanOrEqual(2);
    expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe('fixture-local-storage-token');
    await (role === 'admin' ? page.getByRole('button', { name: 'Admin Sign Out' }) : role === 'dealer' ? page.locator('header').getByRole('button', { name: 'Logout', exact: true }) : page.getByRole('button', { name: 'Log Out', exact: true })).click();
    await page.getByRole('button', { name: 'Yes, log out' }).click();
    await expect.poll(() => removals).toBe(1);
    await expect.poll(() => page.evaluate(key => localStorage.getItem(key), key)).toBeNull();
  });
}
