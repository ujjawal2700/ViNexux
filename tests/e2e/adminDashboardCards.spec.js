import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';

test('dashboard cards show separate B2B/B2C counts and link to the matching admin sections', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  await page.route('**/api/admin/dashboard', route => route.fulfill({ json: { success: true, data: {
    enquiries: { total: 9, new: 4, b2b: { total: 3, new: 1 }, b2c: { total: 6, new: 3 } },
    dealers: { pending: 2, total: 5, approved: 3 }, customers: { total: 12 },
    products: { total: 20, active: 18 }, categories: { active: 7 },
  } } }));
  const cards = [
    ['B2B Enquiries', '/admin/enquiries/dealers', '3', '1 New Dealer Leads'],
    ['B2C Enquiries', '/admin/enquiries/customers', '6', '3 New Customer Leads'],
    ['Pending KYC Queue', '/admin/dealers?status=pending', '2', 'Awaiting your review'],
    ['Customer Accounts', '/admin/customers', '12', '5 Total B2B Dealer Accounts'],
    ['Product Catalog', '/admin/products', '20', '18 Active / 7 Categories'],
  ];
  for (const [title, destination, count, subtext] of cards) {
    await page.goto('/admin/dashboard');
    const card = page.getByRole('main').getByRole('link').filter({ has: page.getByText(title, { exact: true }) });
    await expect(card).toHaveCount(1);
    await expect(card).toHaveAttribute('href', destination);
    await expect(card.getByRole('heading')).toHaveText(count);
    await expect(card).toContainText(subtext);
    await card.focus(); await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`${destination.replace(/[?]/g, '\\?')}$`));
  }
});

test('POS Billing dashboard card opens a new sale', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  await page.goto('/admin/dashboard');
  const card = page.getByRole('main').getByRole('link').filter({ has: page.getByText('POS Billing', { exact: true }) });
  await expect(card).toHaveAttribute('href', '/admin/pos');
  await card.click();
  await expect(page).toHaveURL(/\/admin\/pos$/);
  await expect(page.getByRole('button', { name: 'New sale', exact: true })).toBeVisible();
});

test('sidebar remembers its icon rail and expands on hover and keyboard focus', async ({ page }, testInfo) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  await page.goto('/admin/dashboard');
  const sidebar = page.getByRole('complementary', { name: 'Admin sidebar' });
  await page.getByRole('button', { name: 'Collapse sidebar', exact: true }).click();
  await expect(sidebar).toHaveCSS('width', '72px');
  await page.screenshot({ path: testInfo.outputPath('admin-collapsed-sidebar.png') });
  await sidebar.hover();
  await expect(sidebar).toHaveCSS('width', '256px');
  await page.getByRole('banner').hover();
  await expect(sidebar).toHaveCSS('width', '72px');
  // Any keyboard-focused link reveals all labels without changing the saved preference.
  await sidebar.getByRole('link', { name: 'Admin Dashboard', exact: true }).focus();
  await expect(sidebar).toHaveCSS('width', '256px');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Expand sidebar', exact: true })).toBeVisible();
  await expect(sidebar).toHaveCSS('width', '72px');
  await page.getByRole('button', { name: 'Expand sidebar', exact: true }).click();
  await expect(sidebar).toHaveCSS('width', '256px');
});
