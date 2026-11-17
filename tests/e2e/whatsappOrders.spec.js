import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';
import { buildWhatsAppOrderLink } from '../../shared/whatsappOrder.js';
const id = '507f1f77bcf86cd799439011', productId = '507f1f77bcf86cd799439012';
const product = { _id: productId, name: 'Outdoor Camera', modelNumber: 'CAM-1', model: 'Mini PT', variant: '4G', stockQuantity: 10, stockStatus: 'in-stock', standardPrice: 100, isActive: true, images: [], specifications: [] };
const address = { _id: id, isDefault: true, label: 'Office', line1: '123 Main Road', line2: 'Near Market', city: 'Kota', state: 'Rajasthan', pincode: '324002' };
const lead = { _id: id, source: 'whatsapp', enquiryNumber: 'VNX-000007', userType: 'customer', contactName: 'E2E Customer', contactEmail: 'customer@example.com', contactPhone: '9876543210', whatsappNumber: '9876543210', deliveryAddress: address, status: 'new', createdAt: new Date().toISOString(), notes: [], customerReplies: [], items: [{ productId, productName: 'Outdoor Camera', modelNumber: 'CAM-1', modelName: 'Mini PT', variantName: '4G', quantity: 2, priceShown: 100 }] };
async function setup(page) {
  await mockApi(page); await seedBrowserSession(page, 'account');
  await page.route('**/api/cart', route => route.fulfill({ json: { success: true, data: { cart: { items: [{ productId: product, quantity: 2, priceSnapshot: 100 }] } } } }));
  await page.route('**/api/addresses', route => route.fulfill({ json: { success: true, data: { addresses: [address] } } }));
  await page.addInitScript(() => { window.chatOpens = []; window.chatCloses = 0; window.open = () => ({ opener: null, location: { replace: url => window.chatOpens.push(url) }, close: () => { window.chatCloses++; } }); });
}
test('saves WhatsApp lead before chat opens, even without a WhatsApp message, and admin can manage it', async ({ page, browser }, testInfo) => {
  await setup(page); let captured, chatCountAtSave;
  await page.route('**/api/enquiries/whatsapp', async route => {
    chatCountAtSave = await page.evaluate(() => window.chatOpens.length);
    captured = route.request().postDataJSON();
    await route.fulfill({ status: 201, json: { success: true, data: { enquiry: lead, whatsappUrl: buildWhatsAppOrderLink(lead, '9876543211') } } });
  });
  await page.goto('/cart'); await page.getByRole('button', { name: 'Order on WhatsApp', exact: true }).click();
  await page.getByLabel('Full Name', { exact: true }).fill('Customer Name');
  await page.getByRole('button', { name: 'Save & Open WhatsApp', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'WhatsApp order details saved' })).toBeVisible();
  expect(chatCountAtSave).toBe(0);
  expect(captured).toMatchObject({ addressId: id, contactName: 'Customer Name', selectedProductIds: [productId], deliveryAddress: { city: 'Kota' } });
  expect(captured.requestId).toMatch(/^[\da-f-]{36}$/);
  const opened = await page.evaluate(() => window.chatOpens);
  expect(opened).toHaveLength(1);
  const text = new URL(opened[0]).searchParams.get('text');
  expect(text).toContain('VNX-000007'); expect(text).toContain('123 Main Road, Near Market, Kota, Rajasthan, 324002');
  expect(text).toContain('Model Name / Variant: Mini PT / 4G');
  const admin = await browser.newPage(); await mockApi(admin); await seedBrowserSession(admin, 'admin');
  const statuses = []; let queueSource;
  await admin.route('**/api/admin/enquiries**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith(id)) {
      if (route.request().method() === 'PUT') statuses.push(route.request().postDataJSON().status);
      return route.fulfill({ json: { success: true, data: { enquiry: { ...lead, status: statuses.at(-1) || 'new' } } } });
    }
    queueSource = url.searchParams.get('source');
    return route.fulfill({ json: { success: true, data: { enquiries: [lead], pagination: { total: 1 } } } });
  });
  await admin.goto('/admin/whatsapp-orders');
  await expect(admin.getByRole('heading', { name: 'Order on WhatsApp' })).toBeVisible();
  expect(queueSource).toBe('whatsapp');
  await expect(admin.getByText('WhatsApp lead · Message unconfirmed')).toBeVisible();
  await admin.getByRole('button', { name: 'Inspect' }).click();
  await expect(admin).toHaveURL(`/admin/whatsapp-orders/${id}`);
  await expect(admin.getByText('123 Main Road')).toBeVisible();
  await expect(admin.getByText('Saved before opening WhatsApp.', { exact: false })).toBeVisible();
  await admin.getByRole('button', { name: 'Change Status', exact: true }).click();
  await admin.getByRole('menuitem', { name: 'In Progress', exact: true }).click();
  await expect.poll(() => statuses).toEqual(['in-progress']);
  await expect(admin.getByRole('button', { name: 'Change Status', exact: true })).toContainText('In Progress');
  await expect(admin.getByRole('menu')).toHaveCount(0);
  await admin.screenshot({ path: testInfo.outputPath('whatsapp-lead-admin.png'), fullPage: false });
  await admin.close();
});
test('save failure keeps entered details and retries the same request without opening WhatsApp', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page); const requests = [];
  await page.route('**/api/enquiries/whatsapp', route => { requests.push(route.request().postDataJSON()); return route.fulfill(requests.length === 1 ? { status: 503, json: { success: false, message: 'Unable to save lead. Try again.' } } : { status: 201, json: { success: true, data: { enquiry: lead, whatsappUrl: buildWhatsAppOrderLink(lead, '9876543211') } } }); });
  await page.goto('/account/checkout-enquiry?channel=whatsapp');
  await page.getByLabel('Full Name', { exact: true }).fill('Customer Name');
  await page.getByRole('button', { name: 'Save & Open WhatsApp', exact: true }).click();
  await expect(page.getByText('Unable to save lead. Try again.')).toBeVisible();
  expect(await page.evaluate(() => window.chatOpens)).toEqual([]);
  expect(await page.evaluate(() => window.chatCloses)).toBe(1);
  await expect(page.getByLabel('Full Name', { exact: true })).toHaveValue('Customer Name');
  await page.getByRole('button', { name: 'Save & Open WhatsApp', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'WhatsApp order details saved' })).toBeVisible();
  expect(requests).toHaveLength(2); expect(requests[0].requestId).toBe(requests[1].requestId);
});
test('product WhatsApp button carries selected product into the details form', async ({ page }) => {
  await setup(page);
  await page.route(`**/api/products/${productId}`, route => route.fulfill({ json: { success: true, data: product } }));
  await page.route('**/api/content/footer-content', route => route.fulfill({ json: { success: true, data: { footer: { whatsappNumber: '9876543211' } } } }));
  await page.route('**/api/cart/items', route => route.fulfill({ json: { success: true, data: { cart: { items: [{ productId: product, quantity: 1 }] } } } }));
  await page.goto(`/products/${productId}`);
  await page.getByRole('button', { name: 'Order on WhatsApp', exact: true }).click();
  await expect(page).toHaveURL('/account/checkout-enquiry?channel=whatsapp');
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('vinexus_enquiry_selected_products')))).toEqual([productId]);
  expect(await page.evaluate(() => window.chatOpens)).toEqual([]);
});
