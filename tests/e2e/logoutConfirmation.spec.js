import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';

async function setup(page, role) {
  await mockApi(page);
  await seedBrowserSession(page, role === 'admin' ? 'admin' : 'account');
  const user = { _id: '507f1f77bcf86cd799439011', name: 'Test Account', fullName: 'Test Account', email: 'account@example.test', phone: '9876543210', role };
  await page.route('**/api/auth/refresh-token', route => route.fulfill({ json: { success: true, data: { user, accessToken: 'test-access', refreshToken: role === 'admin' ? 'admin-refresh' : 'customer-refresh', session: { expiresAt: new Date(Date.now() + 86400000).toISOString() } } } }));
  await page.route('**/api/auth/me', route => route.fulfill({ json: { success: true, data: { user } } }));
  let logouts = 0;
  await page.route('**/api/auth/logout', route => { logouts++; return route.fulfill({ json: { success: true, data: {} } }); });
  return () => logouts;
}

test('admin sign-out waits for confirmation and cancel preserves the session', async ({ page }) => {
  const logouts = await setup(page, 'admin');
  await page.goto('/admin/dashboard');
  await page.getByRole('button', { name: 'Admin Sign Out' }).click();
  const dialog = page.getByRole('dialog', { name: 'Sign out of the admin panel?' });
  await expect(dialog).toBeVisible(); expect(logouts()).toBe(0);
  await dialog.getByRole('button', { name: 'Stay logged in' }).click();
  await expect(dialog).toHaveCount(0); await expect(page).toHaveURL(/\/admin\/dashboard$/); expect(logouts()).toBe(0);
  await page.getByRole('button', { name: 'Admin Sign Out' }).click();
  await page.getByRole('button', { name: 'Yes, log out' }).click();
  await expect(page).toHaveURL(/\/admin\/login$/); expect(logouts()).toBe(1);
});

for (const role of ['customer', 'dealer']) {
  test(`${role} can cancel and confirm account logout`, async ({ page }) => {
    const logouts = await setup(page, role);
    await page.goto(role === 'dealer' ? '/' : '/account/profile');
    const trigger = role === 'customer' ? page.getByRole('button', { name: 'Log Out', exact: true }) : page.locator('header').getByRole('button', { name: 'Logout', exact: true });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Log out of your account?' });
    await expect(dialog).toBeVisible(); expect(logouts()).toBe(0);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0); await expect(page).toHaveURL(role === 'dealer' ? /\/$/ : /\/account\/profile$/); expect(logouts()).toBe(0);
    await trigger.click(); await page.getByRole('button', { name: 'Yes, log out' }).click();
    await expect(page).toHaveURL(role === 'customer' ? /\/login$/ : /\/$/);
    await expect(page.getByText('You are not logged in.', { exact: true })).toBeVisible(); expect(logouts()).toBe(1);
    expect(await page.evaluate(() => localStorage.getItem('vinexus_refresh_token'))).toBeNull();
  });
}

test('mobile dealer menu asks before logout and closes after confirmation', async ({ page }) => {
  const logouts = await setup(page, 'dealer');
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/account/profile');
  await page.getByRole('button', { name: 'Open menu', exact: true }).click();
  await page.getByRole('button', { name: 'Log out', exact: true }).last().click();
  await expect(page.getByRole('dialog', { name: 'Log out of your account?' })).toBeVisible(); expect(logouts()).toBe(0);
  await page.getByRole('button', { name: 'Stay logged in' }).click();
  await expect(page.getByRole('button', { name: 'Close menu', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Log out', exact: true }).last().click();
  await page.getByRole('button', { name: 'Yes, log out' }).click();
  await expect(page.getByRole('button', { name: 'Close menu', exact: true })).toHaveCount(0); expect(logouts()).toBe(1);
});
