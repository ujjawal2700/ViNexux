import { presetConfig } from '../../shared/seasonalThemes.js';
import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';
const id = '507f1f77bcf86cd799439011';
const applicant = { _id: id, fullName: 'Existing Customer', name: 'Existing Customer', email: 'customer@example.test', role: 'customer', phone: '9888888888' };
const details = { companyName: 'Customer IT Firm', organisationType: 'Proprietorship', gstin: '08ABCDE1234F1Z5', pan: 'ABCDE1234F', msmeNumber: '', whatsappNumber: '9888888888', aadhaarNumber: '123456789012', address: 'Business road', city: 'Kota', state: 'Rajasthan', pincode: '324001', officeLocation: { latitude: 25.18, longitude: 75.85 } };
const owner = { _id: '507f1f77bcf86cd799439012', fullName: 'Verifying Owner', role: 'admin', isEmployee: false };

test('customer completes remaining dealer details and documents, then becomes a dealer after approval', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'account');
  await page.route('**/api/content/theme', route => route.fulfill({ json: { success: true, data: { theme: { id: 'diwali', config: presetConfig('diwali') } } } }));
  let profile = null, approved = false; const writes = [];
  await page.route('https://*.tile.openstreetmap.org/**', route => route.abort());
  await page.route('**/api/auth/refresh-token', route => route.fulfill({ json: { success: true, data: { accessToken: 'customer-access', refreshToken: 'customer-refresh', user: applicant } } }));
  await page.route('**/api/auth/me', route => route.fulfill({ json: { success: true, data: { user: { ...applicant, role: approved ? 'dealer' : 'customer', dealerStatus: approved ? 'approved' : null } } } }));
  await page.route('**/api/dealers/application**', route => {
    const req = route.request(), path = new URL(req.url()).pathname;
    if (req.method() === 'PUT') {
      const body = req.postDataJSON(); writes.push(body);
      profile = { ...profile, ...body, _id: id, status: 'pending', applicationSource: 'customer', applicationState: 'draft', kycDocuments: profile?.kycDocuments || [] };
    }
    if (path.includes('/documents/')) profile.kycDocuments.push({ type: path.split('/').at(-1), url: 'https://files.example/document.pdf' });
    if (path.endsWith('/submit')) profile.applicationState = 'submitted';
    return route.fulfill({ json: { success: true, data: { profile } } });
  });
  await page.goto('/account/profile');
  await page.getByRole('navigation', { name: 'Account sidebar' }).getByRole('link', { name: 'Become a Dealer' }).click();
  await expect(page.getByRole('heading', { name: 'Become a Dealer', exact: true })).toBeVisible();
  await page.getByRole('region', { name: 'Dealer document uploads' }).screenshot({ path: '/tmp/vinexus-upload-controls-desktop.png' });
  for (const [label, value] of [['Company / firm name', details.companyName], ['GSTIN', details.gstin], ['PAN number', details.pan], ['WhatsApp number', details.whatsappNumber], ['Aadhaar number', details.aadhaarNumber], ['Business address', details.address], ['City', details.city], ['State', details.state], ['Pincode', details.pincode]]) {
    await page.getByLabel(label, { exact: false }).fill(value);
  }
  await page.getByLabel('Organisation type').selectOption('Proprietorship');
  await page.getByLabel('Latitude').fill('25.18'); await page.getByLabel('Longitude').fill('75.85');
  await page.getByRole('button', { name: 'Save business details', exact: true }).click();
  await expect(page.getByText('Business details saved. Upload your documents, then submit for verification.')).toBeVisible();
  expect(writes[0].msmeNumber).toBe('');
  const submit = page.getByRole('button', { name: 'Submit for dealer verification' });
  await expect(submit).toBeDisabled();
  for (const label of ['GST certificate (required)', 'Aadhaar card (required)']) {
    await page.getByLabel(label, { exact: false }).setInputFiles({ name: 'certificate.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 fixture') });
    await expect(page.getByRole('status').filter({ hasText: 'Document uploaded.' })).toBeVisible();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('region', { name: 'Dealer document uploads' }).screenshot({ path: '/tmp/vinexus-upload-controls-mobile.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(submit).toBeEnabled(); await submit.click();
  await expect(page.getByRole('heading', { name: 'Application under review' })).toBeVisible();
  await expect(page.getByText('Your role will change to dealer once your application is approved.', { exact: false })).toBeVisible();
  expect(profile.applicationState).toBe('submitted');
  approved = true; profile.status = 'approved'; profile.kycVerifiedBy = owner;
  await page.getByRole('button', { name: 'Check application status' }).click();
  await expect(page.getByRole('heading', { name: "You're now a dealer" })).toBeVisible();
  await expect(page.getByText('Your existing account now has dealer access.')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vinexus_user')).role)).toBe('dealer');
});

test('verification queue and dealer accounts are separate and show approval attribution', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  const pending = { _id: id, ...details, status: 'pending', userId: applicant };
  const verified = { ...pending, _id: '507f1f77bcf86cd799439013', companyName: 'Approved Dealer Firm', status: 'approved', kycVerifiedBy: owner, kycVerifiedAt: '2026-11-06T05:30:00Z', userId: { ...applicant, role: 'dealer', accountStatus: 'active' }, kycDocuments: [] };
  await page.route('**/api/admin/dealers?*', route => route.fulfill({ json: { success: true, data: { dealers: [pending], pagination: { total: 1, totalPages: 1 } } } }));
  await page.route('**/api/admin/dealer-accounts**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/status')) verified.userId.accountStatus = route.request().postDataJSON().accountStatus;
    return route.fulfill({ json: { success: true, data: path === '/api/admin/dealer-accounts' ? { dealers: [verified], pagination: { total: 1, totalPages: 1 } } : { profile: verified } } });
  });
  await page.goto('/admin/dealers');
  await expect(page.getByRole('heading', { name: 'Dealer Verification', exact: true })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'Customer IT Firm' })).toBeVisible();
  await expect(page.getByText('Approved Dealer Firm', { exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Dealer Accounts', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Dealer Accounts', exact: true })).toBeVisible();
  await expect(page.getByText('Verified by: Verifying Owner', { exact: true })).toBeVisible();
  await expect(page.getByText('Super admin', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Approve', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Inspect', exact: true }).click();
  await expect(page.getByText('Verified by: Verifying Owner', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Block Account', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Unblock Account', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('aside')).not.toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/vinexus-dealer-account-mobile.png', fullPage: true });
});

test('a rejected customer can correct their dealer application and resubmit', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'account');
  const profile = { _id: id, ...details, aadhaarNumber: undefined, status: 'rejected', applicationState: 'submitted', rejectionReason: 'Correct the business address.', kycDocuments: ['gst', 'aadhaar'].map(type => ({ type, url: 'https://files.example/doc.pdf' })) };
  await page.route('https://*.tile.openstreetmap.org/**', route => route.abort());
  await page.route('**/api/dealers/application**', route => {
    if (route.request().method() === 'PUT') Object.assign(profile, route.request().postDataJSON(), { status: 'pending', applicationState: 'draft' });
    if (route.request().url().endsWith('/submit')) profile.applicationState = 'submitted';
    return route.fulfill({ json: { success: true, data: { profile } } });
  });
  await page.goto('/account/become-dealer');
  await expect(page.getByText('Application rejected: Correct the business address.')).toBeVisible();
  await page.getByLabel('Business address', { exact: false }).fill('Corrected address');
  await page.getByLabel('Aadhaar number', { exact: false }).fill(details.aadhaarNumber);
  await page.getByRole('button', { name: 'Save business details', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Submit for dealer verification' })).toBeEnabled();
  await page.getByRole('button', { name: 'Submit for dealer verification' }).click();
  await expect(page.getByRole('heading', { name: 'Application under review' })).toBeVisible();
  expect(profile.address).toBe('Corrected address');
});
