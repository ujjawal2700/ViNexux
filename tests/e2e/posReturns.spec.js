import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';
import { posInvoiceFixture } from '../helpers/posFixture.js';
import { calculatePosReturn } from '../../shared/posReturns.js';
import { productLineKey } from '../../shared/productVariants.js';
const customerId = '507f1f77bcf86cd799439025';

async function setup(page) {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  const sale = posInvoiceFixture(); sale.refundDue = 0;
  sale.items[0].model = 'Mini PT'; sale.items[0].modelName = 'Mini PT';
  const requests = [], searches = [];
  const sync = () => { sale.paidAmount = sale.total - sale.refunds.reduce((sum, entry) => sum + entry.amount, 0); sale.refundDue = sale.paidAmount - (sale.total - sale.returnedAmount); };
  await page.route('**/api/admin/pos/sales**', async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname;
    const respond = data => route.fulfill({ json: { success: true, data } });
    if (path.endsWith('/returns')) {
      const input = request.postDataJSON(); requests.push(input);
      const preview = calculatePosReturn(sale, input.items);
      for (const returned of input.items) sale.items.find(item => productLineKey(item.productId, item.variantId) === productLineKey(returned.productId, returned.variantId)).returnedQuantity += returned.quantity;
      sale.returnedAmount = preview.returnedAmount;
      const creditNoteNumber = `VI/26-27/CN00000${sale.returns.length + 1}`;
      sale.returns.push({ ...input, creditNoteNumber, amount: preview.creditAmount, createdAt: new Date().toISOString() });
      if (input.refund) sale.refunds.push({ ...input.refund, amount: preview.creditAmount, creditNoteNumber, createdAt: new Date().toISOString() });
      sync(); return respond(sale);
    }
    if (path.endsWith('/refunds')) {
      const input = request.postDataJSON(); requests.push(input); sale.refunds.push({ ...input, createdAt: new Date().toISOString() }); sync(); return respond(sale);
    }
    if (path.endsWith('/sales')) {
      const search = url.searchParams.get('search') || ''; searches.push(search);
      const matches = [sale.invoiceNumber, sale.customer.name, sale.customer.phone, ...sale.items.flatMap(item => [item.productName, item.model, item.modelNumber, item.sku])].some(value => value.toLowerCase().includes(search.toLowerCase()));
      return respond({ sales: matches ? [sale] : [], total: matches ? 1 : 0, pages: matches ? 1 : 0, summary: {} });
    }
    return respond(sale);
  });
  return { sale, requests, searches };
}

test('sale returns searches invoice and product/customer identifiers, returns partially then fully and tracks methods', async ({ page }, testInfo) => {
  const state = await setup(page);
  await page.goto('/admin/pos');
  const tabs = page.getByRole('button', { name: /^(New sale|Sale returns|Sales register|Invoice setup)$/ });
  await expect(tabs).toHaveText(['New sale', 'Sale returns', 'Sales register', 'Invoice setup']);
  await page.getByRole('button', { name: 'Sale returns', exact: true }).click();
  const section = page.getByRole('region', { name: 'Sale returns', exact: true });
  for (const query of [state.sale.invoiceNumber, 'TRUEVIEW', 'Mini PT', 'T-18120-SF', state.sale.customer.name, state.sale.customer.phone]) {
    await section.getByLabel('Find invoice').fill(query);
    await expect.poll(() => state.searches.at(-1)).toBe(query);
    await expect(section.getByRole('heading', { name: state.sale.invoiceNumber })).toBeVisible();
  }
  await section.getByRole('button', { name: 'Return products' }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByRole('spinbutton', { name: /^Return quantity/ }).fill('1');
  await dialog.getByLabel('Reason', { exact: true }).fill('One camera returned');
  await dialog.getByLabel('Refund status', { exact: true }).selectOption('paid');
  await dialog.getByLabel('Refund method', { exact: true }).selectOption('upi');
  await dialog.getByLabel('Refund reference (optional)', { exact: true }).fill('UPI-RETURN-001');
  await page.screenshot({ path: testInfo.outputPath('partial-return-refund.png') });
  await dialog.getByRole('button', { name: 'Save return', exact: true }).click();
  await expect.poll(() => state.requests.length).toBe(1);
  expect(state.requests[0]).toMatchObject({ items: [{ quantity: 1 }], refund: { method: 'upi', reference: 'UPI-RETURN-001' } });
  await expect(dialog.getByRole('region', { name: 'Returns and refunds' })).toContainText('Refund paid · UPI');
  await expect(dialog.getByRole('region', { name: 'Returns and refunds' })).toContainText('UPI-RETURN-001');
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click();
  await section.getByRole('button', { name: 'Return products' }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Return all remaining products' }).click();
  await expect(dialog.getByRole('spinbutton', { name: /^Return quantity/ })).toHaveValue('1');
  await dialog.getByLabel('Reason', { exact: true }).fill('Remaining camera returned');
  await expect(dialog.getByLabel('Refund status', { exact: true })).toHaveValue('pending');
  await dialog.getByRole('button', { name: 'Save return', exact: true }).click();
  await expect.poll(() => state.sale.items[0].returnedQuantity).toBe(2);
  expect(state.requests[1].refund).toBeUndefined();
  expect(state.sale.refundDue).toBe(3550);
  await dialog.getByRole('button', { name: 'Record refund', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Refund method', { exact: true }).selectOption('bank');
  await page.getByRole('dialog').getByLabel('Refund reference (optional)', { exact: true }).fill('BANK-RETURN-002');
  await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
  await expect.poll(() => state.sale.refundDue).toBe(0);
  await expect(page.getByRole('dialog').getByRole('region', { name: 'Returns and refunds' })).toContainText('Refund paid · Bank transfer');
  expect(state.sale.refunds.map(entry => entry.method)).toEqual(['upi', 'bank']);
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).last().click();
  await expect(section.getByRole('button', { name: 'Return products' })).toHaveCount(0);
  await expect(section.getByRole('button', { name: 'Record refund' })).toHaveCount(0);
});

for (const role of ['customer', 'dealer']) test(`${role} sees returned products, credit notes, refunds and pending amounts on their own invoice`, async ({ page }, testInfo) => {
  await mockApi(page); await seedBrowserSession(page, 'account');
  const user = { _id: customerId, fullName: 'Invoice Owner', role, dealerStatus: role === 'dealer' ? 'approved' : undefined };
  for (const path of ['**/api/auth/me', '**/api/auth/refresh-token']) await page.route(path, route => route.fulfill({ json: { success: true, data: { user, accessToken: 'owner-token' } } }));
  const sale = posInvoiceFixture(); sale.items[0].returnedQuantity = 1; sale.returnedAmount = 3550; sale.refundDue = 1550;
  sale.returns = [{ creditNoteNumber: 'VI/26-27/CN000001', items: [{ productId: sale.items[0].productId, quantity: 1 }], amount: 3550, reason: 'Camera returned', createdAt: new Date().toISOString() }];
  sale.refunds = [{ method: 'cash', amount: 2000, reference: 'CASH-RECEIPT', createdAt: new Date().toISOString() }];
  await page.route('**/api/pos/my-invoices**', route => route.fulfill({ json: { success: true, data: { invoices: [sale], total: 1, page: 1, pages: 1 } } }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/account/invoices');
  const history = page.getByRole('region', { name: 'Returns and refunds', exact: true });
  await expect(history).toContainText('VI/26-27/CN000001');
  await expect(history).toContainText('Refund paid · Cash');
  await expect(history).toContainText('CASH-RECEIPT');
  await expect(history.getByRole('cell', { name: '1', exact: true })).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath(`${role}-return-history-mobile.png`), fullPage: true });
  sale.refunds.push({ method: 'bank', amount: 1550, reference: 'BANK-SETTLED', createdAt: new Date().toISOString() }); sale.refundDue = 0;
  await page.getByRole('button', { name: 'Refresh purchase records' }).click();
  await expect(page.getByRole('region', { name: 'Returns and refunds' })).toContainText('BANK-SETTLED');
});
