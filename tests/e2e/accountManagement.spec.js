import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';

const id = '507f1f77bcf86cd799439099';
for (const dealer of [false, true]) {
  test(`super admin creates, edits and deletes a ${dealer ? 'dealer' : 'customer'} account`, async ({ page }) => {
    await mockApi(page); await seedBrowserSession(page, 'admin');
    const base = dealer ? '/admin/dealer-accounts' : '/admin/customers';
    let records = []; const mutations = [];
    await page.route(`**/api${base}**`, async route => {
      const req = route.request(), method = req.method();
      if (method !== 'GET') {
        const data = method === 'DELETE' ? null : req.postDataJSON(); mutations.push({ method, data });
        if (method === 'DELETE') records = [];
        else {
          const user = { ...data, _id: id, createdAt: new Date().toISOString() };
          records = [dealer ? { ...data, _id: id, userId: user, status: 'approved', createdAt: user.createdAt, kycVerifiedBy: { fullName: 'E2E Admin', role: 'admin' }, kycVerifiedAt: user.createdAt } : user];
        }
      }
      await route.fulfill({ json: { success: true, data: { [dealer ? 'dealers' : 'customers']: records, pagination: { total: records.length, totalPages: 1, page: 1, limit: 20 } } } });
    });
    await page.goto(base);
    await page.getByRole('button', { name: `Create ${dealer ? 'Dealer' : 'Customer'}`, exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Full name *', { exact: true }).fill('New Owner');
    await dialog.getByLabel('Email address *', { exact: true }).fill('owner@example.com');
    await dialog.getByLabel('Mobile number *', { exact: true }).fill('9876543210');
    if (dealer) {
      await dialog.getByLabel('Company name *', { exact: true }).fill('Cable Company');
      await expect(dialog).toContainText('approved immediately');
      await dialog.getByRole('combobox', { name: 'Organisation type', exact: true }).selectOption('Private Limited Company');
    }
    await dialog.getByRole('button', { name: dealer ? 'Create & Approve Dealer' : 'Create Customer', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('cell', { name: dealer ? /Cable Company/ : /New Owner/ }).first()).toBeVisible();
    expect(mutations[0].method).toBe('POST');
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await dialog.getByLabel('Full name *', { exact: true }).fill('Updated Owner');
    await dialog.getByRole('button', { name: 'Save Account', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect(mutations[1].method).toBe('PUT'); expect(mutations[1].data.fullName).toBe('Updated Owner');
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(dialog).toContainText('Historical enquiries and invoices will remain');
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    expect(mutations).toHaveLength(2);
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await dialog.getByRole('button', { name: 'Delete Account', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0);
    expect(mutations[2].method).toBe('DELETE');
  });
}

test('employees with account write permissions cannot see super-admin CRUD controls', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  const employee = { _id: id, role: 'admin', isEmployee: true, accessRoleActive: true, permissions: { customers: { read: true, write: true }, 'dealer-accounts': { read: true, write: true } } };
  await page.route('**/api/auth/refresh-token', route => route.fulfill({ json: { success: true, data: { accessToken: 'employee-token', refreshToken: 'admin-refresh', user: employee } } }));
  await page.route('**/api/admin/access/self', route => route.fulfill({ json: { success: true, data: { access: employee } } }));
  const user = { _id: id, fullName: 'Existing Customer', email: 'existing@example.com', role: 'customer', createdAt: new Date().toISOString() };
  for (const dealer of [false, true]) {
    const base = dealer ? '/admin/dealer-accounts' : '/admin/customers';
    await page.route(`**/api${base}**`, route => route.fulfill({ json: { success: true, data: { [dealer ? 'dealers' : 'customers']: [dealer ? { _id: id, companyName: 'Existing Company', userId: user, status: 'approved' } : user], pagination: { total: 1, page: 1, totalPages: 1 } } } }));
    await page.goto(base);
    await expect(page.getByRole('heading', { name: dealer ? 'Dealer Accounts' : 'Retail Customer Accounts', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: dealer ? 'Inspect' : 'View', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Create (Customer|Dealer)$/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^(Edit|Delete)$/ })).toHaveCount(0);
  }
});
