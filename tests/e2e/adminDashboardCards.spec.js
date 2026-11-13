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
