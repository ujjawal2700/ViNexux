import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';

const owner = { _id: '507f1f77bcf86cd799439011', fullName: 'Existing Owner', email: 'owner@example.test', phone: '9876543210', accountStatus: 'active' };
test('super admins can list and create additional owners separately from employees', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  const admins = [owner]; const writes = [];
  await page.route('**/api/admin/super-admins**', route => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON(); writes.push(body);
      const { password, ...data } = body;
      const admin = { ...data, _id: '507f1f77bcf86cd799439012', accountStatus: 'active' }; admins.push(admin);
      return route.fulfill({ status: 201, json: { success: true, data: { admin } } });
    }
    const search = new URL(route.request().url()).searchParams.get('search')?.toLowerCase() || '';
    const matches = admins.filter(admin => `${admin.fullName} ${admin.email} ${admin.phone}`.toLowerCase().includes(search));
    return route.fulfill({ json: { success: true, data: { admins: matches, total: matches.length, pages: 1, page: 1 } } });
  });
  await page.goto('/admin/dashboard');
  await page.getByRole('link', { name: 'Super Admins', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Super Admins', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Existing Owner' })).toBeVisible();
  await page.getByRole('button', { name: 'Create super admin', exact: true }).click();
  const modal = page.getByRole('dialog');
  await modal.getByLabel('Full name', { exact: true }).fill('Second Owner');
  await modal.getByLabel('Email address', { exact: true }).fill('second@example.test');
  await modal.getByLabel('Phone number', { exact: true }).fill('9777777777');
  await modal.getByLabel('Password', { exact: true }).fill('Owner-password-2026');
  await modal.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Second Owner' })).toBeVisible();
  expect(writes).toEqual([{ fullName: 'Second Owner', email: 'second@example.test', phone: '9777777777', password: 'Owner-password-2026' }]);
  await expect(page.getByText('Full access', { exact: true })).toHaveCount(2);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Second Owner' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Search super admins' }).fill('second@example.test');
  await expect(page.getByRole('heading', { name: 'Existing Owner' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Second Owner' })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('aside')).not.toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/vinexus-super-admins-mobile.png', fullPage: true });
});

test('employees cannot see or open super-admin management, even with every employee permission', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  const employee = { ...owner, role: 'admin', isEmployee: true, accessRoleActive: true, permissions: { products: { read: true, write: true }, 'super-admins': { read: true, write: true } } };
  await page.route('**/api/auth/refresh-token', route => route.fulfill({ json: { success: true, data: { accessToken: 'employee-token', refreshToken: 'employee-refresh', user: employee } } }));
  await page.route('**/api/admin/access/self', route => route.fulfill({ json: { success: true, data: { access: employee } } }));
  let requests = 0;
  await page.route('**/api/admin/super-admins**', route => { requests++; return route.fulfill({ status: 403, json: { success: false } }); });
  await page.goto('/admin/products');
  await expect(page.getByRole('link', { name: 'Product Catalog', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Super Admins', exact: true })).toHaveCount(0);
  await page.goto('/admin/super-admins');
  await expect(page.getByRole('heading', { name: 'This section is outside your role' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create super admin' })).toHaveCount(0);
  expect(requests).toBe(0);
});

test('super-admin creation displays duplicate errors without losing the form', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  await page.route('**/api/admin/super-admins**', route => route.request().method() === 'POST'
    ? route.fulfill({ status: 409, json: { success: false, message: 'That email or phone number is already in use.' } })
    : route.fulfill({ json: { success: true, data: { admins: [owner], total: 1, page: 1, pages: 1 } } }));
  await page.goto('/admin/super-admins');
  await page.getByRole('button', { name: 'Create super admin', exact: true }).click();
  const modal = page.getByRole('dialog');
  await modal.getByLabel('Full name', { exact: true }).fill('Another Owner');
  await modal.getByLabel('Email address', { exact: true }).fill(owner.email);
  await modal.getByLabel('Phone number', { exact: true }).fill(owner.phone);
  await modal.getByLabel('Password', { exact: true }).fill('Owner-password-2026');
  await modal.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(modal.getByRole('alert')).toHaveText('That email or phone number is already in use.');
  await expect(modal.getByLabel('Full name', { exact: true })).toHaveValue('Another Owner');
});
