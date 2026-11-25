import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';
import { posInput } from '../helpers/posFixture.js';
const id = '507f1f77bcf86cd799439011';
for (const billType of ['b2c', 'b2b']) test(`WhatsApp Send to billing opens ${billType} POS with the exact order products and customer`, async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  const customer = { ...posInput().customer, name: 'WhatsApp buyer' };
  const draft = { ...posInput(), billType, customer, items: [{ ...posInput().items[0], productName: 'Ordered Camera', sku: 'CAM', stockQuantity: 8, quantity: 3, unitPrice: 123.45, standardPrice: 150, dealerPrice: 130, serialInput: '' }] };
  await page.route('**/api/admin/enquiries**', route => {
    const path = new URL(route.request().url()).pathname;
    const data = path.endsWith('/pos-draft') ? { orderId: id, orderNumber: 'WA-123', draft, customerKnown: true } : { enquiries: [{ _id: id, enquiryNumber: 'WA-123', source: 'whatsapp', status: 'new', userType: billType === 'b2b' ? 'dealer' : 'customer', contactName: customer.name, contactPhone: customer.phone, items: [{ productId: draft.items[0].productId, productName: 'Ordered Camera', quantity: 3, priceShown: 123.45 }], createdAt: new Date().toISOString() }], pagination: { page: 1, total: 1, totalPages: 1 } };
    return route.fulfill({ json: { success: true, data } });
  });
  await page.goto('/admin/whatsapp-orders');
  await page.getByRole('link', { name: 'Send to billing', exact: true }).click();
  await expect(page).toHaveURL(`/admin/pos?order=${id}`);
  await expect(page.getByRole('combobox', { name: 'Bill type', exact: true })).toHaveValue(billType);
  await expect(page.getByText('WA-123 loaded.', { exact: false })).toBeVisible();
  await expect(page.getByText('Ordered Camera', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Ordered Camera quantity', { exact: true })).toHaveValue('3');
  await expect(page.locator('input[data-pos-field="items.0.unitPrice"]')).toHaveValue('123.45');
  await page.getByRole('button', { name: /WhatsApp buyer/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Phone *', { exact: true })).toHaveValue(customer.phone);
  await expect(dialog.getByLabel('Full street address *')).toHaveValue(customer.address);
  await expect(dialog.getByRole('button', { name: 'Send OTP', exact: true })).toHaveCount(0);
});

test('sending an already billed WhatsApp order opens its existing invoice', async ({ page }) => {
  const { posInvoiceFixture } = await import('../helpers/posFixture.js');
  const invoice = posInvoiceFixture();
  await mockApi(page); await seedBrowserSession(page, 'admin');
  await page.route(`**/api/admin/enquiries/${id}/pos-draft`, route => route.fulfill({ json: { success: true, data: { orderId: id, orderNumber: 'WA-123', invoiceId: invoice._id } } }));
  await page.route(`**/api/admin/pos/sales/${invoice._id}`, route => route.fulfill({ json: { success: true, data: invoice } }));
  await page.goto(`/admin/pos?order=${id}`);
  await expect(page.getByRole('dialog').getByRole('heading', { name: invoice.invoiceNumber, exact: true })).toBeVisible();
});

test('an unfinished POS bill stays intact when replacement is cancelled', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  const draft = { ...posInput(), billType: 'b2c', items: [{ ...posInput().items[0], productName: 'Existing counter sale', sku: 'OLD', stockQuantity: 8, serialInput: '' }] };
  await page.addInitScript(({ id, draft }) => { sessionStorage.setItem(`vinexus-pos-draft:${id}`, JSON.stringify({ draft, requestId: draft.requestId })); }, { id, draft });
  await page.route(`**/api/admin/enquiries/${id}/pos-draft`, route => route.fulfill({ json: { success: true, data: { orderId: id, orderNumber: 'WA-123', draft: { ...draft, customer: { ...draft.customer, name: 'New WhatsApp customer' } }, customerKnown: true } } }));
  await page.goto(`/admin/pos?order=${id}`);
  const dialog = page.getByRole('dialog', { name: 'Replace the current bill?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText('Existing counter sale', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Sample Customer/ })).toBeVisible();
});

for (const source of ['whatsapp', 'storefront']) test(`Send to billing is available on ${source} order detail pages`, async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  const enquiry = { _id: id, source, status: 'closed', enquiryNumber: 'VNX-000011', userType: 'dealer', contactName: 'Dealer buyer', contactPhone: '9876543210', contactEmail: 'buyer@example.test', createdAt: new Date().toISOString(), items: [{ productId: posInput().items[0].productId, productName: 'Camera', quantity: 2, priceShown: 100 }], notes: [], customerReplies: [] };
  await page.route(`**/api/admin/enquiries/${id}`, route => route.fulfill({ json: { success: true, data: { enquiry } } }));
  await page.goto(source === 'whatsapp' ? `/admin/whatsapp-orders/${id}` : `/admin/enquiries/${id}`);
  await expect(page.getByRole('link', { name: 'Send to billing', exact: true })).toHaveAttribute('href', `/admin/pos?order=${id}`);
  await expect(page.getByRole('button', { name: 'Sync Sheet', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Message on WhatsApp', exact: true })).toBeVisible();
});
