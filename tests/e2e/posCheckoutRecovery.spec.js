import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';
import { posInput } from '../helpers/posFixture.js';
import { calculatePosBill, POS_SELLER_DEFAULTS } from '../../shared/posBilling.js';

const setup = async (page, { missingHsn = false, creationError = null, preflightError = null } = {}) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  let customer = posInput().customer, creates = 0, preflights = 0, lookups = 0, lastPayload;
  const product = { _id: '507f1f77bcf86cd799439022', name: 'Checkout camera', sku: 'CAM-1', stockQuantity: 10, standardPrice: 100,
    images: [], specifications: missingHsn ? [] : [{ key: 'HSN', value: '85258900' }] };
  await page.route('**/api/admin/pos/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    const respond = data => route.fulfill({ json: { success: true, data } });
    if (path.endsWith('/settings')) return respond(POS_SELLER_DEFAULTS);
    if (path.endsWith('/held')) return respond([]);
    if (path.endsWith('/products')) return respond([product]);
    if (path.endsWith('/customer')) {
      if (request.method() === 'PUT') customer = request.postDataJSON();
      else lookups++;
      return respond({ found: true, customer, needsVerification: false });
    }
    if (path.endsWith('/sales/validate')) {
      preflights++;
      if (preflightError) return route.fulfill({ status: 409, json: { success: false, message: 'Review quantity', details: [preflightError] } });
      const data = request.postDataJSON();
      return respond({ ready: true, seller: POS_SELLER_DEFAULTS, ...calculatePosBill(data.items, data) });
    }
    if (path.endsWith('/sales') && request.method() === 'POST') {
      creates++; lastPayload = request.postDataJSON();
      if (creationError && creates === 1) return route.fulfill({ status: 400, json: { success: false, message: 'Billing issue', details: [creationError] } });
      const bill = calculatePosBill(lastPayload.items.map(item => ({ ...item, productName: product.name, sku: product.sku, returnedQuantity: 0 })), lastPayload);
      return respond({ ...lastPayload, ...bill, _id: '507f1f77bcf86cd799439099', createdAt: new Date().toISOString(), seller: POS_SELLER_DEFAULTS,
        invoiceNumber: 'VI/26-27/000001', status: 'completed', paymentStatus: 'paid', paidAmount: bill.total, balanceDue: 0,
        returnedAmount: 0, returns: [], refunds: [], shareToken: 'a'.repeat(64), payments: lastPayload.payments.map(p => ({ ...p, createdAt: new Date().toISOString() })) });
    }
    return respond({});
  });
  await page.goto('/admin/pos');
  await page.getByRole('button', { name: /Checkout camera CAM-1/ }).click();
  return { creates: () => creates, preflights: () => preflights, lookups: () => lookups, payload: () => lastPayload };
};

const saveCustomer = async page => {
  await page.getByRole('button', { name: /Add customer details/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Phone *', { exact: true }).fill('9876543210');
  await expect(dialog.getByLabel('Customer name *', { exact: true })).toHaveValue('Sample Customer');
  await dialog.getByRole('button', { name: 'Save details', exact: true }).click();
  await expect(dialog).toHaveCount(0);
};

test('checkout has a fixed full charge and only Cash, UPI and Bank', async ({ page }) => {
  const state = await setup(page); await saveCustomer(page);
  await page.getByRole('button', { name: /Proceed to payment/ }).click();
  const dialog = page.getByRole('dialog');
  const amount = dialog.getByLabel('Payment amount (fixed)', { exact: true });
  await expect(amount).toHaveValue('₹100.00'); await expect(amount).toHaveAttribute('readonly', '');
  expect(await dialog.getByLabel('Payment method', { exact: true }).locator('option').allTextContents()).toEqual(['Cash', 'UPI', 'Bank']);
  await expect(dialog.getByText(/Credit sale|pay later|split tender|Cash received/)).toHaveCount(0);
  await dialog.getByLabel('Payment method', { exact: true }).selectOption('upi');
  await dialog.getByRole('button', { name: 'Complete sale & generate invoice' }).click();
  await expect(dialog.getByRole('heading', { name: 'VI/26-27/000001' })).toBeVisible();
  expect(state.payload().payments).toHaveLength(1); expect(state.payload().payments[0]).toMatchObject({ method: 'upi', amount: 100 });
  expect(state.preflights()).toBe(1);
});

test('a customer field error is corrected before saving the customer or entering payment', async ({ page }) => {
  const state = await setup(page);
  await page.getByRole('button', { name: /Add customer details/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Phone *', { exact: true }).fill('9876543210');
  await expect(dialog.getByLabel('Customer name *', { exact: true })).toHaveValue('Sample Customer');
  await dialog.getByLabel('PIN code *', { exact: true }).fill('12');
  await dialog.getByRole('button', { name: 'Save details', exact: true }).click();
  await expect(dialog.getByLabel('PIN code *', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await expect(dialog.getByRole('alert').first()).toContainText('Customer → PIN code');
  expect(state.preflights()).toBe(0); expect(state.creates()).toBe(0);
  await dialog.getByLabel('PIN code *', { exact: true }).fill('324005');
  await dialog.getByRole('button', { name: 'Save details', exact: true }).click();
  await expect(dialog).toHaveCount(0);
});

test('missing product details stay at the bill with a product-specific hint', async ({ page }) => {
  const state = await setup(page, { missingHsn: true }); await saveCustomer(page);
  await page.getByRole('button', { name: /Proceed to payment/ }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('alert').first()).toContainText('Checkout camera → HSN/SAC');
  await expect(page.locator('[data-pos-field="items.0.hsn"]')).toHaveAttribute('aria-invalid', 'true');
  expect(state.preflights()).toBe(0); expect(state.creates()).toBe(0);
});

test('stock is checked before payment and points to the affected product quantity', async ({ page }) => {
  const state = await setup(page, { preflightError: { path: 'items.0.quantity', message: 'Checkout camera (CAM-1): only 0 units remain in stock.' } });
  await saveCustomer(page); await page.getByRole('button', { name: /Proceed to payment/ }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('alert').first()).toContainText('Checkout camera → Quantity');
  expect(state.preflights()).toBe(1); expect(state.creates()).toBe(0);
});

test('a later server address error can be corrected inside the payment dialog', async ({ page }) => {
  const state = await setup(page, { creationError: { path: 'customer.pincode', message: 'Enter a 6-digit PIN code.' } });
  await saveCustomer(page); await page.getByRole('button', { name: /Proceed to payment/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Complete sale & generate invoice' }).click();
  await expect(dialog.getByRole('heading', { name: 'Complete sale', exact: true })).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Correct customer details here' })).toBeVisible();
  await expect(dialog.getByRole('alert').first()).toContainText('Customer → PIN code');
  await expect(dialog.getByRole('button', { name: 'Complete sale & generate invoice' })).toBeDisabled();
  await dialog.getByLabel('PIN code *', { exact: true }).fill('324099');
  await dialog.getByRole('button', { name: 'Save corrections', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'Correct customer details here' })).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Complete sale & generate invoice' }).click();
  await expect(dialog.getByRole('heading', { name: 'VI/26-27/000001' })).toBeVisible();
  expect(state.payload().customer.pincode).toBe('324099');
  expect(state.lookups()).toBe(1);
});

test('admin rendering errors identify the broken route and preserve storage on go back and refresh', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  await page.goto('/admin/dashboard');
  const fault = process.env.PLAYWRIGHT_PREVIEW === '1' ? '**/assets/AdminPosPage-*.js' : '**/src/pages/admin/AdminPosPage.jsx*';
  await page.route(fault, route => route.fulfill({ contentType: 'application/javascript', body: 'export default function AdminPosPage() { throw new Error("POS render fixture"); }' }));
  await page.evaluate(() => { sessionStorage.setItem('recovery-marker', 'keep'); localStorage.setItem('recovery-marker', 'keep'); });
  await page.getByRole('link', { name: 'Offline POS Billing' }).click();
  await expect(page.getByRole('heading', { name: 'This page ran into a problem' })).toBeVisible();
  await expect(page.getByText('Page: /admin/pos')).toBeVisible();
  await page.getByText('Error details', { exact: true }).click();
  await expect(page.getByText('POS render fixture', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Clear Cache/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Go back', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
  await page.getByRole('link', { name: 'Offline POS Billing' }).click();
  await expect(page.getByRole('heading', { name: 'This page ran into a problem' })).toBeVisible();
  await page.unroute(fault);
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Offline POS Billing', exact: true })).toBeVisible();
  expect(await page.evaluate(() => [localStorage.getItem('recovery-marker'), sessionStorage.getItem('recovery-marker'), localStorage.getItem('vinexus_admin_refresh_token')])).toEqual(['keep', 'keep', 'admin-refresh']);
});
