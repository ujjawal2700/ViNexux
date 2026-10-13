import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';
import { calculatePosBill, POS_SELLER_DEFAULTS } from '../../shared/posBilling.js';
import { generatePosInvoice } from '../../backend/src/services/posInvoice.service.js';
import { generatePosExport } from '../../backend/src/services/posExport.service.js';
import { posInvoiceFixture } from '../helpers/posFixture.js';

const configure = async page => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  let saved = null, holds = [], saleRequests = 0, otpRequests = 0;
  const customers = new Map();
  await page.route('**/api/admin/pos/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    const response = data => route.fulfill({ json: { success: true, data } });
    if (path.endsWith('/customer')) {
      if (request.method() === 'PUT') { const customer = request.postDataJSON(); customers.set(customer.phone, customer); return response({ customer, customerId: '507f1f77bcf86cd799439025', found: true, needsVerification: false }); }
      const phone = new URL(request.url()).searchParams.get('phone'), customer = customers.get(phone);
      return response({ found: !!customer, customer: customer || null, needsVerification: !customer });
    }
    if (path.endsWith('/customer/otp')) { otpRequests++; return response({ mockOtp: '123456', resendAvailableInSeconds: 0 }); }
    if (path.endsWith('/customer/verify')) return response({ verified: true });
    if (path.endsWith('/sales/validate')) { const body = request.postDataJSON(); return response({ ready: true, seller: POS_SELLER_DEFAULTS, ...calculatePosBill(body.items, body) }); }
    if (path.endsWith('/settings')) return response(POS_SELLER_DEFAULTS);
    if (path.endsWith('/products')) return response([{ _id: '507f1f77bcf86cd799439022', name: 'TRUEVIEW 3MP 4G Camera', sku: 'CAM-001', modelNumber: 'T-18120', stockQuantity: 8,
      standardPrice: 3550, images: [], specifications: [{ key: 'HSN', value: '85258900' }] }]);
    if (path.endsWith('/customers')) return response([]);
    if (path.endsWith('/held')) {
      if (request.method() === 'POST') { const data = request.postDataJSON(); holds.push({ ...data, _id: '507f1f77bcf86cd799439023', updatedAt: new Date().toISOString() }); }
      return response(holds);
    }
    if (path.endsWith('/invoice')) return route.fulfill({ contentType: 'application/pdf', body: await generatePosInvoice(saved || posInvoiceFixture()) });
    if (path.endsWith('/export')) return route.fulfill({ contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', body: Buffer.from(await generatePosExport(saved ? [saved] : [])) });
    if (path.endsWith('/sales') && request.method() === 'POST') {
      const data = request.postDataJSON(); saleRequests++;
      saved = { ...data, ...calculatePosBill(data.items.map(item => ({ ...item, productName: 'TRUEVIEW 3MP 4G Camera', sku: 'CAM-001', returnedQuantity: 0 })), data),
        _id: '507f1f77bcf86cd799439099', invoiceNumber: 'VI/26-27/000001', seller: POS_SELLER_DEFAULTS, shipping: data.customer,
        shareToken: 'a'.repeat(64), status: 'completed', createdAt: new Date().toISOString(), returnedAmount: 0,
        paidAmount: data.payments.reduce((sum, p) => sum + p.amount, 0), balanceDue: 0, refundDue: 0, paymentStatus: 'paid', returns: [], refunds: [],
        payments: data.payments.map(p => ({ ...p, createdAt: new Date().toISOString() })) };
      return response(saved);
    }
    if (path.endsWith('/sales')) return response({ sales: saved ? [saved] : [], total: saved ? 1 : 0, pages: saved ? 1 : 0, summary: { netSales: saved?.total || 0, collected: saved?.paidAmount || 0, balance: 0, refundsDue: 0 } });
    return response(saved);
  });
  await page.goto('/admin/pos');
  return { sale: () => saved, saleRequests: () => saleRequests, customers: () => customers, otpRequests: () => otpRequests, holds: () => holds };
};

test('POS completes a counter sale with customer details, serials, invoice and Excel export', async ({ page }) => {
  const state = await configure(page);
  await expect(page.getByRole('heading', { name: 'Offline POS Billing' })).toBeVisible();
  await page.getByRole('button', { name: /TRUEVIEW 3MP 4G Camera CAM-001/ }).click();
  await page.getByRole('button', { name: /Add customer details/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Customer name *', { exact: true }).fill('Retail Customer');
  await dialog.getByLabel('Phone *', { exact: true }).fill('9876543210');
  await dialog.getByRole('button', { name: 'Use phone number for WhatsApp' }).click();
  await dialog.getByLabel('Full street address *').fill('116, Main Road');
  await dialog.getByLabel('City *', { exact: true }).fill('Kota');
  await dialog.getByLabel('PIN code *').fill('324001');
  await dialog.getByRole('button', { name: 'Send OTP', exact: true }).click();
  await dialog.getByLabel('Verification code', { exact: true }).fill('123456');
  await dialog.getByRole('button', { name: 'Verify OTP', exact: true }).click();
  await dialog.getByRole('button', { name: 'Save details' }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByLabel('Serial numbers (comma separated)').fill('CAM-SERIAL-001');
  await page.screenshot({ path: '/private/tmp/vinexus-pos-checkout.png', fullPage: true });
  await page.getByRole('button', { name: /Proceed to payment/ }).click();
  await expect(dialog.getByText('₹3,550.00', { exact: true }).first()).toBeVisible();
  await dialog.getByRole('button', { name: 'Complete sale & generate invoice' }).click();
  await expect(dialog.getByRole('heading', { name: 'VI/26-27/000001' })).toBeVisible();
  expect(state.saleRequests()).toBe(1);
  expect(state.customers().get('9876543210').name).toBe('Retail Customer');
  expect(state.otpRequests()).toBe(1);
  expect(state.sale().items[0].serialNumbers).toEqual(['CAM-SERIAL-001']);
  const whatsapp = dialog.getByRole('link', { name: 'Send to WhatsApp' });
  await expect(whatsapp).toHaveAttribute('href', /https:\/\/wa.me\/919876543210\?text=/);
  expect(decodeURIComponent(await whatsapp.getAttribute('href'))).toContain('/invoices/' + 'a'.repeat(64));
  expect(decodeURIComponent(await whatsapp.getAttribute('href'))).not.toContain('/api/pos/invoices/');
  const pdfDownload = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Download PDF' }).click();
  expect((await pdfDownload).suggestedFilename()).toBe('VI-26-27-000001.pdf');
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click();
  await page.getByRole('button', { name: 'Sales register', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'Retail Customer 9876543210' })).toBeVisible();
  const excelDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export Excel' }).click();
  expect((await excelDownload).suggestedFilename()).toBe('vinexus-offline-sales.xlsx');
  await page.getByRole('button', { name: 'New sale', exact: true }).click();
  await page.getByRole('button', { name: /Add customer details/ }).click();
  await dialog.getByLabel('Phone *', { exact: true }).fill('9876543210');
  await expect(dialog.getByLabel('Customer name *', { exact: true })).toHaveValue('Retail Customer');
  await expect(dialog.getByLabel('Full street address *')).toHaveValue('116, Main Road');
  await expect(dialog.getByRole('button', { name: 'Send OTP', exact: true })).toHaveCount(0);
  expect(state.otpRequests()).toBe(1);
  await expect(dialog.getByRole('button', { name: 'Delivery references', exact: true })).toHaveCount(0);
});

test('POS holds a bill and restores it without issuing an invoice', async ({ page }) => {
  const state = await configure(page);
  await page.getByRole('button', { name: /TRUEVIEW 3MP 4G Camera CAM-001/ }).click();
  await page.getByRole('button', { name: 'Hold bill', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ready for the next customer' })).toBeVisible();
  expect(state.holds()).toHaveLength(1); expect(state.saleRequests()).toBe(0);
  await page.getByRole('button', { name: 'Held (1)', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Resume' }).click();
  await expect(page.getByText('Resumed held bill', { exact: false })).toBeVisible();
  await expect(page.getByLabel('TRUEVIEW 3MP 4G Camera quantity', { exact: true })).toHaveValue('1');
});

test('POS stays usable on narrow screens and surfaces checkout errors inside the dialog', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await configure(page);
  await page.getByRole('button', { name: /TRUEVIEW 3MP 4G Camera CAM-001/ }).click();
  await page.getByRole('button', { name: /Proceed to payment/ }).click();
  await expect(page.getByRole('dialog').getByRole('alert').first()).toContainText('Customer → Name');
  const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: innerWidth }));
  expect(width.scroll).toBeLessThanOrEqual(width.viewport);
});
