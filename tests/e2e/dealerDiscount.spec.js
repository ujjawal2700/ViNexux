import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';
const id = '507f1f77bcf86cd799439011';
const fixture = () => ({ _id: id, companyName: 'Private Pricing Dealer', organisationType: 'Proprietorship', status: 'pending', city: 'Kota', state: 'Rajasthan', kycDocuments: [], userId: { _id: id, role: 'dealer', fullName: 'Dealer Owner', email: 'dealer@example.test', phone: '9876543210', accountStatus: 'active' } });

test('super admin sets 3% at verification and can later edit or remove it from the profile', async ({ page }, testInfo) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  const profile = fixture(); const approvals = [], edits = [];
  await page.route(`**/api/admin/dealers/${id}**`, route => {
    if (route.request().url().endsWith('/kyc/approve')) {
      const body = route.request().postDataJSON(); approvals.push(body);
      Object.assign(profile, body, { status: 'approved' });
    }
    return route.fulfill({ json: { success: true, data: { profile } } });
  });
  await page.route(`**/api/admin/dealer-accounts/${id}`, route => {
    const body = route.request().postDataJSON(); edits.push(body); Object.assign(profile, body);
    return route.fulfill({ json: { success: true, data: { user: profile.userId } } });
  });
  await page.goto(`/admin/dealers/${id}`);
  await page.getByRole('button', { name: 'Approve KYC', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Extra global dealer discount (%)').fill('3');
  await page.screenshot({ path: testInfo.outputPath('dealer-private-discount.png') });
  await page.getByRole('dialog').getByRole('button', { name: 'Approve KYC', exact: true }).click();
  await expect.poll(() => approvals).toEqual([{ dealerDiscountPercent: 3 }]);
  await expect(page.getByText('Extra global dealer discount: 3%', { exact: true })).toBeVisible();
  for (const discount of [5, 0]) {
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    const modal = page.getByRole('dialog');
    await modal.getByLabel('Extra global dealer discount (%)', { exact: true }).fill(String(discount));
    await modal.getByRole('button', { name: 'Save Account', exact: true }).click();
    await expect(page.getByText(`Extra global dealer discount: ${discount}%`, { exact: true })).toBeVisible();
    expect(edits.at(-1).dealerDiscountPercent).toBe(discount);
  }
});

test('quick verification also allows the super admin to set an extra global discount', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin'); const profile = fixture(); let approval;
  await page.route('**/api/admin/dealers?*', route => route.fulfill({ json: { success: true, data: { dealers: [profile], pagination: { total: 1, totalPages: 1 } } } }));
  await page.route(`**/api/admin/dealers/${id}/kyc/approve`, route => {
    approval = route.request().postDataJSON(); profile.status = 'approved';
    return route.fulfill({ json: { success: true, data: { profile } } });
  });
  await page.goto('/admin/dealers');
  await page.getByRole('button', { name: 'Approve', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Extra global dealer discount (%)').fill('3');
  await page.getByRole('dialog').getByRole('button', { name: 'Approve KYC', exact: true }).click();
  await expect.poll(() => approval).toEqual({ dealerDiscountPercent: 3 });
});

test('dealer sees only their final regular product price without discount labels or comparisons', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'account');
  const dealer = { _id: id, role: 'dealer', fullName: 'Dealer Owner', dealerStatus: 'approved', kycStatus: 'approved' };
  for (const path of ['**/api/auth/refresh-token', '**/api/auth/me']) await page.route(path, route => route.fulfill({ json: { success: true, data: { accessToken: 'dealer-token', user: dealer } } }));
  await page.route(`**/api/products/${id}`, route => route.fulfill({ json: { success: true, data: {
    _id: id, name: 'Dealer Camera', sku: 'CAM-1', isActive: true, stockQuantity: 10, standardPrice: 150, dealerPrice: 97, applicablePrice: 97, images: [], specifications: [],
  } } }));
  await page.goto(`/products/${id}`);
  await expect(page.getByTestId('purchase-price')).toContainText('97');
  await expect(page.getByText(/dealer saving|special.discount|extra global dealer discount|standard:/i)).toHaveCount(0);
});
