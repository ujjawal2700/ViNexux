import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';

test('processing a new enquiry clears its sidebar badge immediately', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  const enquiry = { _id: '507f1f77bcf86cd799439011', enquiryNumber: 'ENQ-QUEUE-1', contactName: 'Queue Customer', userType: 'customer', status: 'new', items: [], createdAt: new Date().toISOString() };
  await page.route('**/api/admin/dashboard', route => route.fulfill({ json: { success: true, data: { enquiries: { b2c: { new: enquiry.status === 'new' ? 1 : 0 } } } } }));
  await page.route('**/api/admin/enquiries?*', route => route.fulfill({ json: { success: true, data: { enquiries: [enquiry], pagination: { total: 1, page: 1, totalPages: 1 } } } }));
  await page.route(`**/api/admin/enquiries/${enquiry._id}`, async route => {
    enquiry.status = route.request().postDataJSON().status;
    await route.fulfill({ json: { success: true, data: { enquiry } } });
  });
  await page.goto('/admin/enquiries/customers');
  const link = page.getByRole('navigation', { name: 'Admin sections' }).locator('a[href="/admin/enquiries/customers"]');
  await expect(link.getByLabel('1 new enquiries')).toHaveText('1 New');
  await page.getByRole('row').filter({ hasText: 'ENQ-QUEUE-1' }).getByRole('combobox').selectOption('in-progress');
  await expect(link.locator('span[aria-label]')).toHaveCount(0);
});

test('sidebar shows actionable queue counts, refreshes and hides cleared badges', async ({ page }, testInfo) => {
  await page.clock.install(); await mockApi(page); await seedBrowserSession(page, 'admin');
  let counts = { dealers: 3, b2b: 2, b2c: 5 };
  await page.route('**/api/admin/dashboard', route => route.fulfill({ json: { success: true, data: {
    dealers: { pending: counts.dealers }, enquiries: { b2b: { total: 20, new: counts.b2b }, b2c: { total: 30, new: counts.b2c } },
  } } }));
  await page.goto('/admin/dashboard');
  const nav = page.getByRole('navigation', { name: 'Admin sections' });
  const dealers = nav.locator('a[href="/admin/dealers"]');
  const b2b = nav.locator('a[href="/admin/enquiries/dealers"]');
  const b2c = nav.locator('a[href="/admin/enquiries/customers"]');
  await expect(dealers.getByLabel('3 pending dealer verifications')).toHaveText('3');
  await expect(b2b.getByLabel('2 new enquiries')).toHaveText('2 New');
  await expect(b2c.getByLabel('5 new enquiries')).toHaveText('5 New');
  await expect(dealers.getByLabel('3 pending dealer verifications')).toHaveClass(/bg-primary.*text-primary-foreground/);
  await page.locator('aside').screenshot({ path: testInfo.outputPath('sidebar-queue-badges.png') });
  counts = { dealers: 0, b2b: 4, b2c: 0 };
  await page.clock.runFor(60000);
  await expect(b2b.getByLabel('4 new enquiries')).toHaveText('4 New');
  await expect(dealers.locator('span[aria-label]')).toHaveCount(0);
  await expect(b2c.locator('span[aria-label]')).toHaveCount(0);
  counts.b2c = 125;
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(b2c.getByLabel('125 new enquiries')).toHaveText('125 New');
});

test('employee badges use only permitted queues without requiring dashboard access', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  const employee = { id: '507f1f77bcf86cd799439022', role: 'admin', isEmployee: true, accessRoleActive: true,
    fullName: 'Enquiry reviewer', permissions: { 'enquiries-customers': { read: true, write: false } } };
  await page.route('**/api/auth/refresh-token', route => route.fulfill({ json: { success: true, data: { accessToken: 'employee-token', user: employee } } }));
  await page.route('**/api/admin/access/self', route => route.fulfill({ json: { success: true, data: { access: employee } } }));
  const requests = [];
  await page.route('**/api/admin/enquiries?*', route => {
    const params = new URL(route.request().url()).searchParams;
    requests.push(Object.fromEntries(params));
    return route.fulfill({ json: { success: true, data: { enquiries: [], pagination: { total: 8, page: 1, totalPages: 1 } } } });
  });
  await page.goto('/admin/enquiries/customers');
  const nav = page.getByRole('navigation', { name: 'Admin sections' });
  await expect(nav.locator('a[href="/admin/enquiries/customers"]').getByLabel('8 new enquiries')).toHaveText('8 New');
  await expect(nav.locator('a[href="/admin/enquiries/dealers"]')).toHaveCount(0);
  await expect(nav.locator('a[href="/admin/dealers"]')).toHaveCount(0);
  expect(requests.some(params => params.status === 'new' && params.userType === 'customer' && params.limit === '1')).toBe(true);
});
