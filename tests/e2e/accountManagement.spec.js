import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';

const decodeBody = req => {
  if (!req.headers()['content-type']?.includes('multipart/form-data')) return req.postDataJSON();
  return JSON.parse(req.postData().match(/name="details"\r\n\r\n([^]*?)\r\n--/)[1]);
};
const fillDealer = async dialog => {
  for (const [label, value] of [['Company name *', 'Cable Company'], ['GSTIN (optional)' , '08ABCDE1234F1Z5'], ['PAN number (optional)' , 'ABCDE1234F'], ['Aadhaar number (optional)' , '123456789012'], ['WhatsApp number (optional)' , '9876543210'], ['Business address (optional)' , 'Business road'], ['City (optional)' , 'Kota'], ['State (optional)' , 'Rajasthan'], ['Pincode (optional)' , '324001']]) {
    await dialog.getByLabel(label, { exact: true }).fill(value);
  }
  await dialog.getByRole('combobox', { name: 'Organisation type', exact: false }).selectOption('Private Limited Company');
  await dialog.getByLabel('Latitude', { exact: false }).fill('25.18');
  await dialog.getByLabel('Longitude', { exact: false }).fill('75.85');
};
const attachDocuments = async dialog => {
  for (const type of ['GST certificate', 'Aadhaar card']) await dialog.getByLabel(`${type} (optional)`, { exact: true }).setInputFiles({ name: `${type}.pdf`, mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 fixture') });
};
const id = '507f1f77bcf86cd799439099';
for (const dealer of [false, true]) {
  test(`super admin creates, edits and deletes a ${dealer ? 'dealer' : 'customer'} account`, async ({ page }) => {
    await mockApi(page); await seedBrowserSession(page, 'admin');
    const base = dealer ? '/admin/dealer-accounts' : '/admin/customers';
    let records = []; const mutations = [];
    await page.route(`**/api${base}**`, async route => {
      const req = route.request(), method = req.method();
      if (method !== 'GET') {
        const data = method === 'DELETE' ? null : decodeBody(req); mutations.push({ method, data });
        if (method === 'DELETE') records = [];
        else {
          const user = { ...data, _id: id, createdAt: new Date().toISOString() };
          records = [dealer ? { ...data, _id: id, userId: user, status: 'approved', createdAt: user.createdAt, kycVerifiedBy: { fullName: 'E2E Admin', role: 'admin' }, kycVerifiedAt: user.createdAt } : user];
        }
      }
      await route.fulfill({ json: { success: true, data: { [dealer ? 'dealers' : 'customers']: records, pagination: { total: records.length, totalPages: 1, page: 1, limit: 20 } } } });
    });
    await page.route('https://tile.openstreetmap.org/**', route => route.abort());
    await page.goto(base);
    await page.getByRole('button', { name: `Create ${dealer ? 'Dealer' : 'Customer'}`, exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Full name *', { exact: true }).fill('New Owner');
    await dialog.getByLabel('Email address *', { exact: true }).fill('owner@example.com');
    await dialog.getByLabel('Mobile number *', { exact: true }).fill('9876543210');
    if (dealer) {
      await fillDealer(dialog);
      await attachDocuments(dialog);
      await expect(dialog).toContainText('approved immediately');
      await expect(dialog.getByLabel('Udyam number (optional)')).toBeVisible();
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


test('customer profile converts the existing account with optional uploads and retains inputs after errors', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  const customer = { _id: id, fullName: 'Existing Customer', email: 'customer@example.com', phone: '9888888888', role: 'customer', accountStatus: 'active', createdAt: new Date().toISOString() };
  const profileId = '507f1f77bcf86cd799439013';
  let submitted; let attempts = 0;
  await page.route('https://tile.openstreetmap.org/**', route => route.abort());
  await page.route(`**/api/admin/customers/${id}**`, route => {
    if (route.request().method() === 'POST') {
      attempts++;
      submitted = decodeBody(route.request());
      if (attempts === 1) return route.fulfill({ status: 503, json: { success: false, message: 'Document storage unavailable. Try again.' } });
      expect(route.request().url()).toContain('/convert-to-dealer');
      expect(route.request().postData()).not.toContain('name="gst"');
      return route.fulfill({ json: { success: true, data: { user: { ...customer, role: 'dealer', dealerProfileId: profileId } } } });
    }
    return route.fulfill({ json: { success: true, data: { customer } } });
  });
  await page.route(`**/api/admin/dealer-accounts/${profileId}`, route => route.fulfill({ json: { success: true, data: { profile: { _id: profileId, userId: { ...customer, role: 'dealer' }, companyName: 'Cable Company', status: 'approved', kycDocuments: [], kycVerifiedBy: { fullName: 'E2E Admin', role: 'admin' } } } } }));
  await page.goto(`/admin/customers/${id}`);
  await page.getByRole('button', { name: 'Convert to Dealer', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Existing Customer');
  await expect(dialog.getByLabel('Full name *', { exact: true })).toHaveCount(0);
  await fillDealer(dialog);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('[role="dialog"]')).toBeVisible();
  await dialog.getByRole('button', { name: 'Convert & Approve Dealer', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Document storage unavailable');
  await expect(dialog.getByLabel('Company name *', { exact: true })).toHaveValue('Cable Company');
  await dialog.getByRole('button', { name: 'Convert & Approve Dealer', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/dealer-accounts/${profileId}$`));
  expect(attempts).toBe(2);
  expect(submitted.officeLocation).toMatchObject({ latitude: 25.18, longitude: 75.85 });
  expect(submitted.fullName).toBeUndefined();
  expect(submitted.role).toBeUndefined();
});

test('admin creates a dealer with basic details and no supplementary fields or documents', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  await page.route('https://tile.openstreetmap.org/**', route => route.abort());
  let submitted;
  await page.route('**/api/admin/dealer-accounts**', route => {
    if (route.request().method() === 'POST') submitted = decodeBody(route.request());
    return route.fulfill({ json: { success: true, data: { user: { _id: id }, dealers: [], pagination: { total: 0, page: 1, totalPages: 1 } } } });
  });
  await page.goto('/admin/dealer-accounts');
  await page.getByRole('button', { name: 'Create Dealer', exact: true }).click();
  const dialog = page.getByRole('dialog');
  for (const [label, value] of [['Full name *', 'Basic Dealer'], ['Email address *', 'basic@example.test'], ['Mobile number *', '9876543210'], ['Company name *', 'Basic Company']]) await dialog.getByLabel(label, { exact: true }).fill(value);
  await expect(dialog.getByLabel('GST certificate (optional)', { exact: true })).toBeAttached();
  await expect(dialog.getByLabel('Aadhaar card (optional)', { exact: true })).toBeAttached();
  await dialog.getByRole('button', { name: 'Create & Approve Dealer', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(submitted.companyName).toBe('Basic Company');
  expect(submitted.officeLocation).toBeUndefined();
});
