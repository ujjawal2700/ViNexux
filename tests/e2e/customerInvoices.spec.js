import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';
import { publicInvoiceUrl } from '../../shared/posInvoiceUrl.js';
const token = 'a'.repeat(64);
const invoice = { _id: '507f1f77bcf86cd799439099', invoiceNumber: 'VI/26-27/000001', createdAt: '2026-10-13T09:00:00Z', status: 'completed', total: 250, returnedAmount: 0, items: [{ productName: '12V 1A Wall Adapter', quantity: 1 }] };
const history = async (page, selected = invoice) => {
  await mockApi(page);
  await page.route('**/api/pos/my-invoices**', route => {
    if (route.request().url().endsWith('/pdf')) return route.fulfill({ contentType: 'application/pdf', body: '%PDF-1.4 test invoice' });
    return route.fulfill({ json: { success: true, data: { invoices: [invoice], total: 1, pages: 1, page: 1, selected } } });
  });
};

test('shared invoice asks for the purchase phone and verifies OTP before showing history', async ({ page }) => {
  await history(page); await seedBrowserSession(page, 'storefront');
  let otpPhone;
  await page.route('**/api/auth/send-otp', route => {
    otpPhone = route.request().postDataJSON().identifier;
    return route.fulfill({ json: { success: true, data: { mockOtpEnabled: true, mockOtp: '123456', resendAvailableInSeconds: 0 } } });
  });
  await page.route('**/api/auth/verify-otp', route => route.fulfill({ json: { success: true, data: {
    accessToken: 'e2e-access', refreshToken: 'customer-refresh', user: { _id: '507f1f77bcf86cd799439011', name: 'Invoice Customer', role: 'customer', phone: '9876543210' },
    session: { expiresAt: new Date(Date.now() + 86400000).toISOString() },
  } } }));
  const localLink = publicInvoiceUrl(token, { origin: 'http://localhost:4173' });
  expect(localLink).toBe(`http://127.0.0.1:4173/invoices/${token}`);
  await page.goto(localLink);
  await expect(page.getByRole('heading', { name: 'Find your invoices' })).toBeVisible();
  await expect(page.getByText(invoice.invoiceNumber, { exact: true })).toHaveCount(0);
  await page.getByLabel('Mobile number', { exact: true }).fill('9876543210');
  await page.getByRole('button', { name: 'Send verification code' }).click();
  expect(otpPhone).toBe('9876543210');
  await expect(page).toHaveURL(/verify-otp/);
  const digits = page.locator('input[maxlength="1"]');
  for (let i = 0; i < 6; i++) await digits.nth(i).fill(String(i + 1));
  await page.getByRole('button', { name: 'Verify & Login' }).click();
  await expect(page).toHaveURL(`/invoices/${token}`);
  await expect(page.getByRole('heading', { name: invoice.invoiceNumber })).toBeVisible();
});

test('account invoices are accessible from the profile sidebar and download a PDF', async ({ page }) => {
  await history(page, null); await seedBrowserSession(page, 'account');
  await page.goto('/account/profile');
  await page.getByRole('link', { name: 'My Invoices', exact: true }).click();
  await expect(page).toHaveURL('/account/invoices');
  await expect(page.getByRole('heading', { name: 'My invoices', exact: true })).toBeVisible();
  await expect(page.getByText('12V 1A Wall Adapter × 1')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('VI-26-27-000001.pdf');
  const popup = page.waitForEvent('popup');
  const pdfRequest = page.waitForRequest(request => request.url().endsWith('/my-invoices/' + invoice._id + '/pdf'));
  await page.getByRole('button', { name: 'View invoice', exact: true }).click();
  expect(await popup).toBeTruthy();
  expect((await pdfRequest).headers().authorization).toBe('Bearer e2e-access');
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('an invoice shared for a different account is not shown as owned', async ({ page }) => {
  await history(page, null); await seedBrowserSession(page, 'account');
  await page.goto(`/invoices/${token}`);
  await expect(page.getByText(/The shared invoice is not associated with this account/)).toBeVisible();
  await expect(page.getByRole('heading', { name: invoice.invoiceNumber })).toBeVisible();
  await page.getByRole('button', { name: 'Use another number' }).click();
  await page.getByRole('button', { name: 'Yes, log out' }).click();
  await expect(page.getByRole('heading', { name: 'Find your invoices' })).toBeVisible();
  await expect(page.getByRole('heading', { name: invoice.invoiceNumber })).toHaveCount(0);
});

test('admin customer link opens the sales history with that customer phone', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  await page.route('**/api/admin/customers/507f1f77bcf86cd799439011', route => route.fulfill({ json: { success: true,
    data: { customer: { _id: '507f1f77bcf86cd799439011', name: 'Invoice Customer', phone: '9876543210', accountStatus: 'active', createdAt: '2026-10-13T09:00:00Z' } } } }));
  let searched;
  await page.route('**/api/admin/pos/sales?**', route => {
    searched = new URL(route.request().url()).searchParams.get('search');
    return route.fulfill({ json: { success: true, data: { sales: [], total: 0, pages: 0, summary: {} } } });
  });
  await page.goto('/admin/customers/507f1f77bcf86cd799439011');
  await page.getByRole('link', { name: 'View customer invoices' }).click();
  await expect.poll(() => searched).toBe('9876543210');
  await expect(page.getByLabel('Search invoices')).toHaveValue('9876543210');
});
