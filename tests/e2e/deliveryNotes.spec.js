import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';
import { calculatePosBill, POS_SELLER_DEFAULTS } from '../../shared/posBilling.js';
import { posInput } from '../helpers/posFixture.js';
const customerId = '507f1f77bcf86cd799439011', noteId = '507f1f77bcf86cd799439088', invoiceId = '507f1f77bcf86cd799439099', productId = '507f1f77bcf86cd799439022';
async function setup(page) {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  const customer = { ...posInput().customer, name: 'Delivery Customer' };
  let note, invoice, payload;
  await page.route('**/api/admin/pos/**', route => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname;
    const reply = data => route.fulfill({ json: { success: true, data } });
    if (path.endsWith('/settings')) return reply(POS_SELLER_DEFAULTS);
    if (path.endsWith('/held')) return reply([]);
    if (path.endsWith('/products')) return reply([{ _id: productId, name: 'Delivery Camera', sku: 'DC-1', hsnCode: '85258900', stockQuantity: 10, standardPrice: 100, dealerPrice: 80, images: [] }]);
    if (path.endsWith('/customer')) return reply({ found: true, customer, needsVerification: false });
    if (path.endsWith('/sales/validate')) return reply({ ready: true, seller: POS_SELLER_DEFAULTS, ...calculatePosBill(req.postDataJSON().items, req.postDataJSON()) });
    if (path.endsWith('/sales') && req.method() === 'POST') {
      payload = req.postDataJSON();
      const bill = calculatePosBill(payload.items.map(item => ({ ...item, productName: 'Delivery Camera', sku: 'DC-1', returnedQuantity: 0 })), payload);
      note = { ...payload, ...bill, seller: POS_SELLER_DEFAULTS, _id: noteId, customerId, invoiceNumber: 'VI-DN/26-27/000001', deliveryNoteNumber: 'VI-DN/26-27/000001', status: 'completed', createdAt: new Date().toISOString(), payments: payload.payments, paidAmount: payload.payments[0].amount, balanceDue: bill.total - payload.payments[0].amount, refundDue: 0, returnedAmount: 0, returns: [], refunds: [], paymentStatus: payload.payments[0].amount ? 'partial' : 'unpaid', deliveryNoteIds: [] };
      return reply(note);
    }
    if (path.endsWith('/delivery-notes/invoice')) {
      expect(req.postDataJSON().noteIds).toEqual([noteId]);
      const remaining = calculatePosBill(note.items.filter(item => item.quantity > item.returnedQuantity).map(item => ({ ...item, quantity: item.quantity - item.returnedQuantity, returnedQuantity: 0 })), note);
      invoice = { ...note, ...remaining, returns: [], returnedAmount: 0, _id: invoiceId, documentType: 'invoice', invoiceNumber: 'VI/26-27/000001', deliveryNoteIds: [noteId] }; note.invoiceId = invoiceId;
      return reply(invoice);
    }
    if (path.includes('/account-balances/')) return reply({ balanceDue: (invoice || note)?.balanceDue || 0, paidAmount: (invoice || note)?.paidAmount || 0, refundDue: 0, documents: invoice ? [invoice] : note ? [note] : [] });
    if (path.includes('/delivery-notes/')) return reply({ ...note, ...(invoice ? { invoice } : {}) });
    if (path.endsWith('/returns')) {
      const data = req.postDataJSON(); note.items[0].returnedQuantity += data.items[0].quantity; note.returnedAmount = note.items[0].returnedQuantity * note.items[0].unitPrice; note.balanceDue = Math.max(0, note.total - note.returnedAmount - note.paidAmount); note.refundDue = Math.max(0, note.paidAmount - note.total + note.returnedAmount); note.returns.push({ ...data, amount: data.items[0].quantity * note.items[0].unitPrice, creditNoteNumber: 'CN-1', createdAt: new Date().toISOString() }); return reply(note);
    }
    if (path.endsWith('/payments')) {
      const amount = req.postDataJSON().amount; invoice.paidAmount += amount; invoice.balanceDue -= amount;
      invoice.payments.push(req.postDataJSON()); return reply(invoice);
    }
    if (path.endsWith(`/sales/${invoiceId}`)) return reply(invoice);
    if (path.endsWith('/sales')) return reply({ sales: url.searchParams.get('documentType') === 'delivery-note' && note ? [note] : invoice ? [invoice] : [], total: note ? 1 : 0, pages: 1, summary: { balance: note && !note.invoiceId ? note.balanceDue : 0, collected: note && !note.invoiceId ? note.paidAmount : 0 } });
    return reply({});
  });
  await page.route(`**/api/admin/customers/${customerId}`, route => route.fulfill({ json: { success: true, data: { customer: { ...customer, _id: customerId, fullName: customer.name, role: 'customer' } } } }));
  return { customer, note: () => note, invoice: () => invoice, payload: () => payload };
}
for (const billType of ['b2c', 'b2b']) test(`${billType} dispatch note supports partial receipts, invoicing and account dues`, async ({ page }) => {
  const state = await setup(page);
  await page.goto('/admin/pos');
  await page.getByRole('button', { name: 'Delivery notes', exact: true }).click();
  await page.getByRole('button', { name: 'New delivery note', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Document type', exact: true })).toHaveValue('delivery-note');
  await page.getByRole('combobox', { name: 'Bill type', exact: true }).selectOption(billType);
  await page.getByRole('button', { name: /Delivery Camera DC-1/ }).click();
  await page.getByLabel('Payment due date (optional)').fill('2026-12-05');
  await expect(page.getByLabel(/Transporter|Vehicle|Received by|Dispatch reference/)).toHaveCount(0);
  await page.getByLabel('Delivery note date', { exact: true }).fill('2026-11-25');
  await page.getByRole('button', { name: /Add customer details/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Phone *', { exact: true }).fill(state.customer.phone);
  await expect(dialog.getByLabel('Customer name *', { exact: true })).toHaveValue(state.customer.name);
  await dialog.getByRole('button', { name: 'Save details', exact: true }).click();
  await page.getByRole('button', { name: /Proceed to payment/ }).click();
  await dialog.getByLabel('Amount received now', { exact: true }).fill('30');
  const due = billType === 'b2c' ? 70 : 50;
  await expect(dialog.getByText(`Outstanding after this payment: ₹${due}.00`)).toBeVisible();
  await dialog.getByRole('button', { name: 'Save delivery note', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'Delivery note VI-DN/26-27/000001', exact: true })).toBeVisible();
  expect(state.payload()).toMatchObject({ deliveryNoteDate: '2026-11-25', documentType: 'delivery-note', billType, dueDate: '2026-12-05', payments: [{ amount: 30 }] });
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Delivery notes', exact: true }).click();
  await expect(page.getByText(`Due ₹${due}.00`, { exact: true })).toBeVisible();
  const noteRow = page.getByRole('row').filter({ hasText: 'VI-DN/26-27/000001' });
  await expect(noteRow.getByText('2026-11-25', { exact: true })).toHaveCSS('color', 'oklch(0.446 0.043 257.281)');
  await expect(noteRow.getByText('2026-11-25', { exact: true })).toHaveCSS('font-size', '14px');
  await expect(noteRow.getByText(`${state.customer.phone} · ${billType.toUpperCase()}`, { exact: true })).toHaveCSS('color', 'oklch(0.446 0.043 257.281)');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.getByRole('columnheader', { name: 'Select', exact: true })).toHaveCount(0);
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  await page.getByRole('button', { name: 'Convert to bill', exact: true }).click();
  const confirmation = page.getByRole('dialog', { name: `Create ${billType === 'b2b' ? 'Proforma Bill' : 'Sale Bill'}?`, exact: true });
  await expect(confirmation).toContainText('VI-DN/26-27/000001');
  await expect(confirmation).toContainText(state.customer.name);
  expect(state.invoice()).toBeUndefined();
  await confirmation.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(state.invoice()).toBeUndefined(); expect(state.note().invoiceId).toBeUndefined();
  await page.getByRole('button', { name: 'Convert to bill', exact: true }).click();
  await confirmation.getByRole('button', { name: 'Create bill', exact: true }).click();

  await expect(dialog.getByRole('heading', { name: 'VI/26-27/000001', exact: true })).toBeVisible();
  expect(state.invoice().balanceDue).toBe(due);
  await page.goto(`/admin/customers/${customerId}`);
  const account = page.getByRole('region', { name: 'Customer account balance', exact: true });
  await expect(account.getByText(`₹${due}.00`, { exact: true }).first()).toBeVisible();
  await expect(account.getByText(`VI/26-27/000001 · ${billType === 'b2b' ? 'Proforma Bill' : 'Sale Bill'}`, { exact: true })).toBeVisible();
  await expect(account.getByText(/VI-DN/)).toHaveCount(0);
});

test('partial product returns remain on the note and only kept goods become a Sale Bill', async ({ page }) => {
  const state = await setup(page);
  await page.goto('/admin/pos');
  await page.getByRole('button', { name: 'Delivery notes', exact: true }).click();
  await page.getByRole('button', { name: 'New delivery note', exact: true }).click();
  await page.getByRole('button', { name: /Delivery Camera DC-1/ }).click();
  await page.getByLabel('Delivery Camera quantity', { exact: true }).fill('3');
  await page.getByRole('button', { name: /Add customer details/ }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Phone *', { exact: true }).fill(state.customer.phone);
  await expect(dialog.getByLabel('Customer name *', { exact: true })).toHaveValue(state.customer.name);
  await dialog.getByRole('button', { name: 'Save details', exact: true }).click();
  await page.getByRole('button', { name: /Proceed to payment/ }).click();
  await dialog.getByLabel('Amount received now', { exact: true }).fill('50');
  await dialog.getByRole('button', { name: 'Save delivery note', exact: true }).click();
  await dialog.getByRole('button', { name: 'Return items', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel(/Return quantity.*Delivery Camera/).fill('1');
  await dialog.getByLabel('Reason', { exact: true }).fill('One product returned');
  await dialog.getByRole('button', { name: 'Save return', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Convert to Sale Bill', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Convert to Sale Bill', exact: true }).click();
  const confirmation = page.getByRole('dialog', { name: 'Create Sale Bill?', exact: true });
  await expect(confirmation).toContainText('₹200.00'); expect(state.invoice()).toBeUndefined();
  await confirmation.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(state.invoice()).toBeUndefined();
  await dialog.getByRole('button', { name: 'Convert to Sale Bill', exact: true }).click();
  await confirmation.getByRole('button', { name: 'Create bill', exact: true }).click();

  await expect(dialog.getByText(/Sale Bill/).first()).toBeVisible();
  expect(state.invoice().items[0].quantity).toBe(2);
  expect(state.invoice().total).toBe(200);
  expect(state.invoice().paidAmount).toBe(50);
  expect(state.invoice().balanceDue).toBe(150);
  expect(state.invoice().returnedAmount).toBe(0);
  expect(state.note().returns).toHaveLength(1);
});
