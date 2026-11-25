import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';
import { posInvoiceFixture } from '../helpers/posFixture.js';
import { calculatePosBill, POS_SELLER_DEFAULTS } from '../../shared/posBilling.js';

async function setup(page) {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  const invoice = { ...posInvoiceFixture(), shareToken: 'a'.repeat(64), updatedAt: '2026-11-24T10:00:00.000Z' };
  const voided = { ...structuredClone(invoice), _id: '507f1f77bcf86cd799439098', invoiceNumber: 'VI/26-27/000002', status: 'voided' };
  let edit;
  await page.route('**/api/admin/pos/**', route => {
    const req = route.request(), path = new URL(req.url()).pathname;
    const send = data => route.fulfill({ json: { success: true, data } });
    if (path.endsWith('/settings')) return send(POS_SELLER_DEFAULTS);
    if (path.endsWith('/held') || path.endsWith('/products')) return send([]);
    if (path.endsWith('/sales')) return send({ sales: [invoice, voided], total: 2, pages: 1, summary: { netSales: invoice.total, collected: invoice.total, refundsDue: 0 } });
    if (path.endsWith('/invoice')) return route.fulfill({ contentType: 'application/pdf', body: '%PDF-1.4 invoice test' });
    if (req.method() === 'PUT') {
      edit = req.postDataJSON();
      const lines = edit.items?.map(item => ({ ...invoice.items.find(old => old.productId === item.productId), ...item, productName: item.productId === invoice.items[0]?.productId ? invoice.items[0].productName : 'Replacement Camera', returnedQuantity: 0 }));
      Object.assign(invoice, edit, lines ? calculatePosBill(lines, { ...edit, interstate: edit.customer.stateCode !== invoice.seller.stateCode }) : {});
      invoice.updatedAt = '2026-11-24T10:05:00.000Z';
    }
    return send(path.endsWith(voided._id) ? voided : invoice);
  });
  return { invoice, edit: () => edit };
}

test('sales register row exposes functional view, edit, download and general share actions', async ({ page }, testInfo) => {
  const state = await setup(page);
  await page.addInitScript(() => { window.sharedInvoices = []; Object.defineProperty(navigator, 'share', { configurable: true, value: async data => { window.sharedInvoices.push(data); } }); });
  await page.goto('/admin/pos?tab=sales');
  const row = page.getByRole('row').filter({ hasText: state.invoice.invoiceNumber });
  for (const name of ['View invoice', 'Edit invoice', 'Download invoice', 'Share invoice']) await expect(row.getByRole('button', { name, exact: true })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'VI/26-27/000002' }).getByRole('button', { name: 'Edit invoice', exact: true })).toBeDisabled();
  await expect(row.getByText(state.invoice.customer.phone, { exact: true })).toHaveCSS('color', 'oklch(0.446 0.043 257.281)');
  await expect(row.getByText(state.invoice.customer.phone, { exact: true })).toHaveCSS('font-size', '14px');
  await expect(row.locator('td').first().locator('p').last()).toHaveCSS('color', 'oklch(0.446 0.043 257.281)');
  await expect(row.locator('td').first().locator('p').last()).toHaveCSS('font-size', '14px');
  await page.screenshot({ path: testInfo.outputPath('sales-register-actions.png') });
  await row.getByRole('button', { name: 'View invoice', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText(state.invoice.invoiceNumber);
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).last().click();
  const download = page.waitForEvent('download');
  await row.getByRole('button', { name: 'Download invoice', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('VI-26-27-000001.pdf');
  await row.getByRole('button', { name: 'Share invoice', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.sharedInvoices.length)).toBe(1);
  const shared = await page.evaluate(() => window.sharedInvoices[0]);
  expect(shared.title).toBe(`Sale Bill ${state.invoice.invoiceNumber}`);
  expect(shared.url).toContain('/invoices/' + 'a'.repeat(64));
  expect(shared.url).not.toContain('wa.me');
  await row.getByRole('button', { name: 'Edit invoice', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Billing name', { exact: false }).fill('Corrected Buyer');
  await expect(dialog.getByLabel('Invoice owner phone', { exact: false })).toHaveAttribute('readonly', '');
  await expect(dialog.getByRole('combobox', { name: 'State *', exact: true })).toBeEnabled();
  await dialog.getByLabel('Invoice notes', { exact: true }).fill('Deliver in the evening');
  await dialog.getByRole('button', { name: 'Save invoice details', exact: true }).click();
  await expect.poll(() => state.edit()?.customer?.name).toBe('Corrected Buyer');
  expect(state.edit().notes).toBe('Deliver in the evening');
  expect(state.edit().items).toHaveLength(1); expect(state.edit().payments).toBeUndefined();
  await expect(page.getByRole('dialog')).toContainText('Corrected Buyer');
});

test('return invoice cards are compact and show product quantities, return status and refund summary on mobile', async ({ page }, testInfo) => {
  const state = await setup(page);
  state.invoice.items[0].returnedQuantity = 1; state.invoice.returnedAmount = 3550; state.invoice.refundDue = 500;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/admin/pos?tab=returns');
  const section = page.getByRole('region', { name: 'Sale returns', exact: true });
  const card = section.getByRole('article').filter({ hasText: state.invoice.invoiceNumber });
  await expect(card).toContainText('Partially returned');
  await expect(card).toContainText('1 / 2 units returned');
  await expect(card).toContainText('Refund pending');
  await expect(card.getByRole('button', { name: 'Record refund', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await card.screenshot({ path: testInfo.outputPath('return-invoice-card-mobile.png') });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await section.screenshot({ path: testInfo.outputPath('return-invoice-cards-desktop.png') });
});


test('full invoice edit changes quantity, price and tax mode and records settlement choice', async ({ page }, testInfo) => {
  const state = await setup(page);
  await page.goto('/admin/pos?tab=sales');
  await page.getByRole('row').filter({ hasText: state.invoice.invoiceNumber }).getByRole('button', { name: 'Edit invoice', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('spinbutton', { name: /^Quantity for/ }).fill('3');
  await dialog.getByRole('spinbutton', { name: /^Unit price for/ }).fill('4000');
  await dialog.getByLabel('Price mode', { exact: true }).selectOption('inclusive');
  await dialog.getByLabel('Settlement status', { exact: true }).selectOption('paid');
  await dialog.getByLabel('Settlement method', { exact: true }).selectOption('upi');
  await dialog.getByLabel('Settlement reference', { exact: true }).fill('UPI-4900');
  await page.screenshot({ path: testInfo.outputPath('full-invoice-editor.png') });
  await dialog.getByRole('button', { name: 'Save invoice details', exact: true }).click();
  await expect.poll(() => state.edit()?.items?.[0]?.quantity).toBe(3);
  expect(state.edit().items[0].unitPrice).toBe(4000);
  expect(state.edit().taxMode).toBe('inclusive');
  expect(state.edit().settlement).toEqual({ method: 'upi', reference: 'UPI-4900' });
  expect(state.edit().total).toBeUndefined();
  await expect(page.getByRole('dialog')).toContainText('12,000');
});

test('invoice editor replaces products and keeps financial controls locked after returns', async ({ page }) => {
  const state = await setup(page);
  await page.route('**/api/admin/pos/products**', route => route.fulfill({ json: { success: true, data: [{ _id: '507f1f77bcf86cd799439088', name: 'Replacement Camera', sku: 'NEW-CAM', standardPrice: 1000, hsnCode: '85258900', stockQuantity: 5 }] } }));
  await page.goto('/admin/pos?tab=sales');
  await page.getByRole('row').filter({ hasText: state.invoice.invoiceNumber }).getByRole('button', { name: 'Edit invoice', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Add product', { exact: true }).fill('Replacement');
  await dialog.getByRole('button', { name: /Replacement Camera.*NEW-CAM/ }).click();
  await dialog.getByRole('button', { name: /^Remove TRUEVIEW/ }).click();
  await dialog.getByRole('button', { name: 'Save invoice details', exact: true }).click();
  await expect.poll(() => state.edit()?.items?.[0]?.productId).toBe('507f1f77bcf86cd799439088');
  expect(state.edit().items).toHaveLength(1);
  expect(state.edit().settlement).toBeUndefined();
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).last().click();
  state.invoice.items[0].returnedQuantity = 1;
  state.invoice.returns.push({ reason: 'Returned', amount: 1180 });
  await page.getByRole('row').filter({ hasText: state.invoice.invoiceNumber }).getByRole('button', { name: 'Edit invoice', exact: true }).click();
  await expect(page.getByRole('dialog').getByText(/Products, prices and the tax state are locked/)).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('region', { name: 'Invoice products' })).toHaveCount(0);
});


for (const mode of ['unsupported', 'unavailable', 'cancelled']) test(`general invoice sharing handles ${mode} share menus`, async ({ page }) => {
  const state = await setup(page);
  await page.addInitScript(mode => {
    window.copiedInvoice = '';
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.copiedInvoice = text; } } });
    Object.defineProperty(navigator, 'share', { configurable: true, value: mode === 'unsupported' ? undefined : async () => { throw new DOMException('Share menu closed', mode === 'cancelled' ? 'AbortError' : 'NotAllowedError'); } });
  }, mode);
  await page.goto('/admin/pos?tab=sales');
  await page.getByRole('row').filter({ hasText: state.invoice.invoiceNumber }).getByRole('button', { name: 'Share invoice', exact: true }).click();
  if (mode === 'cancelled') {
    await expect(page.getByRole('button', { name: 'Share invoice', exact: true }).first()).toBeEnabled();
    expect(await page.evaluate(() => window.copiedInvoice)).toBe('');
    await expect(page.getByRole('alert')).toHaveCount(0);
  } else {
    await expect.poll(() => page.evaluate(() => window.copiedInvoice)).toContain('/invoices/' + 'a'.repeat(64));
    await expect(page.getByRole('status').filter({ hasText: 'Invoice link copied.' })).toBeVisible();
  }
});


test('sales register PDF export uses the active search, date and status filters', async ({ page }) => {
  await setup(page); let exported;
  await page.route('**/api/admin/pos/sales/export/pdf?*', route => {
    exported = Object.fromEntries(new URL(route.request().url()).searchParams);
    return route.fulfill({ contentType: 'application/pdf', body: '%PDF-1.4 register fixture' });
  });
  await page.goto('/admin/pos?tab=sales');
  await page.getByLabel('Search invoices / products / models / customer / phone', { exact: true }).fill('Camera');
  await page.getByLabel('From (IST)', { exact: true }).fill('2026-10-01');
  await page.getByLabel('To (IST)', { exact: true }).fill('2026-10-31');
  await page.getByRole('combobox', { name: 'Status', exact: true }).selectOption('completed');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export PDF', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('vinexus-sales-register.pdf');
  expect(exported).toEqual({ search: 'Camera', from: '2026-10-01', to: '2026-10-31', status: 'completed', paymentStatus: 'all' });
});
