import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';
const id = '507f1f77bcf86cd799439011';
const variantId = '507f1f77bcf86cd799439012';
const product = { _id: id, name: 'Unavailable Camera', sku: 'OOS-1', stockQuantity: 0, stockStatus: 'out-of-stock', standardPrice: 100, isActive: true, images: [], specifications: [], categoryId: { _id: id, name: 'Security', slug: 'security', isActive: true } };
const initial = () => ({ _id: id, enquiryNumber: 'VNX-000001', enquiryType: 'out-of-stock', userType: 'customer', status: 'new', message: 'When will this camera return?', contactName: 'E2E Customer', contactEmail: 'customer@example.com', contactPhone: '9876543210',
  userId: { _id: id, fullName: 'E2E Customer', email: 'customer@example.com', phone: '9876543210', role: 'customer' }, items: [{ productId: product, productName: product.name, quantity: 1, priceShown: 0 }], customerReplies: [], customerMessages: [], notes: [], lastReadReplyCount: 0, createdAt: new Date().toISOString() });

for (const variant of [false, true]) {
  test(`out-of-stock ${variant ? 'variant' : 'product'} enquiry asks only for description and never writes the cart`, async ({ page }) => {
    await mockApi(page); await seedBrowserSession(page, 'account');
    const value = variant ? { ...product, variants: [{ _id: variantId, name: 'Unavailable variant', standardPrice: 100, stockQuantity: 0, isActive: true }] } : product;
    await page.route(`**/api/products/${id}`, route => route.fulfill({ json: { success: true, data: { product: value } } }));
    await page.route('**/api/content/footer-content', route => route.fulfill({ json: { success: true, data: { footer: { whatsappNumbers: [{ number: '9876543210' }] } } } }));
    let payload; let cartWrites = 0;
    await page.route('**/api/cart/items', route => { cartWrites++; return route.fulfill({ json: { success: true, data: {} } }); });
    await page.route('**/api/enquiries/availability', route => { payload = route.request().postDataJSON(); return route.fulfill({ status: 201, json: { success: true, data: { enquiry: initial() } } }); });
    await page.goto(`/products/${id}`);
    await expect(page.getByRole('link', { name: 'Order on WhatsApp', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Add to Cart', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Enquire about availability', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.locator('textarea')).toHaveCount(1);
    await expect(dialog.locator('input, select')).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Send enquiry', exact: true }).click();
    expect(payload).toBeUndefined();
    await dialog.getByLabel('Description *', { exact: true }).fill('When will this camera return?');
    await dialog.getByRole('button', { name: 'Send enquiry', exact: true }).click();
    await expect(dialog.getByRole('status')).toContainText('Your enquiry has been sent');
    expect(payload).toEqual({ productId: id, ...(variant ? { variantId } : {}), message: 'When will this camera return?' });
    expect(cartWrites).toBe(0);
  });
}

test('admin flags, responses, unread markers, customer follow-ups and notification beep share one enquiry', async ({ page, context }, testInfo) => {
  let enquiry = initial(); let beepReplies = 0;
  const bind = async (surface, admin) => {
    await mockApi(surface); await seedBrowserSession(surface, admin ? 'admin' : 'account');
    await surface.route('**/api/enquiries**', route => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith('/messages')) enquiry.customerMessages.push({ message: route.request().postDataJSON().message, createdAt: new Date().toISOString() });
      if (path.endsWith('/read')) enquiry.lastReadReplyCount = route.request().postDataJSON().replyCount;
      return route.fulfill({ json: { success: true, data: path === '/api/enquiries' ? { enquiries: [enquiry], pagination: { total: 1, totalPages: 1 } } : { enquiry } } });
    });
    await surface.route('**/api/admin/enquiries**', route => {
      const path = new URL(route.request().url()).pathname;
      if (route.request().method() === 'PUT') {
        const body = route.request().postDataJSON();
        if (body.status) enquiry.status = body.status;
        if (body.customerReply) { enquiry.customerReplies.push({ adminId: { fullName: 'E2E Admin' }, message: body.customerReply, createdAt: new Date().toISOString() }); beepReplies++; }
      }
      return route.fulfill({ json: { success: true, data: path === '/api/admin/enquiries' ? { enquiries: [enquiry], pagination: { total: 1, totalPages: 1 } } : { enquiry } } });
    });
  };
  await page.addInitScript(() => {
    window.beepStarts = 0;
    window.AudioContext = class {
      state = 'running'; currentTime = 0; destination = {};
      resume() { return Promise.resolve(); }
      createOscillator() { return { frequency: {}, connect() {}, disconnect() {}, start() { window.beepStarts++; }, stop() {} }; }
      createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} }; }
    };
  });
  await bind(page, false);
  await page.goto('/account/enquiries');
  await expect(page.getByText('Out-of-stock enquiry', { exact: true })).toBeVisible();
  await page.getByRole('heading', { name: 'My Enquiries' }).click(); // unlock foreground sound with a user gesture
  const admin = await context.newPage(); await bind(admin, true);
  await admin.goto('/admin/enquiries/customers');
  await expect(admin.getByText('Out of stock', { exact: true })).toBeVisible();
  await expect(admin.getByText('When will this camera return?', { exact: true })).toBeVisible();
  await admin.goto(`/admin/enquiries/${id}`);
  await expect(admin.getByText('Out-of-stock product enquiry', { exact: false })).toBeVisible();
  await admin.getByPlaceholder('Write an update or response for the enquiry owner...').fill('Restocking next week.');
  await admin.getByRole('button', { name: 'Send Reply', exact: true }).click();
  await expect.poll(() => enquiry.customerReplies.length).toBe(1);
  enquiry.status = 'in-progress';
  await page.bringToFront();
  await page.evaluate(({ id }) => window.dispatchEvent(new CustomEvent('vinexus-push', { detail: { title: 'New response to your enquiry', body: 'Our team replied.', data: { type: 'enquiry-reply', enquiryId: id, replyCount: '1', link: `/account/enquiries/${id}` } } })), { id });
  await expect(page.getByText('New response', { exact: true })).toBeVisible();
  await expect(page.getByRole('status', { name: 'Push notification' })).toContainText('Our team replied');
  await expect.poll(() => page.evaluate(() => window.beepStarts)).toBe(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('link', { name: 'View', exact: true }).click();
  await expect(page.getByText('Restocking next week.', { exact: true })).toBeVisible();
  await expect(page.getByText('In Progress', { exact: false }).first()).toBeVisible();
  await expect.poll(() => enquiry.lastReadReplyCount).toBe(1);
  await page.getByLabel('Send message', { exact: true }).fill('Please let me know when it arrives.');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.getByText('Please let me know when it arrives.', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('customer-enquiry-messages-mobile.png'), fullPage: true });
  await admin.bringToFront();
  await admin.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(admin.getByText('Please let me know when it arrives.', { exact: true })).toBeVisible();
  await admin.screenshot({ path: testInfo.outputPath('admin-out-of-stock-conversation.png'), fullPage: true });
  expect(beepReplies).toBe(1);
});

test('catalog out-of-stock enquire button opens a description form rather than adding to cart', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'account');
  await page.route('**/api/products**', route => route.fulfill({ json: { success: true, data: { products: [product], pagination: { total: 1, totalPages: 1, page: 1 } } } }));
  let cartWrites = 0;
  await page.route('**/api/cart/items', route => { cartWrites++; return route.fulfill({ json: { success: true, data: {} } }); });
  await page.goto('/products');
  const enquire = page.getByRole('button', { name: 'ENQUIRE', exact: true }).first();
  await enquire.click();
  await expect(page.getByRole('dialog').getByLabel('Description *', { exact: true })).toBeVisible();
  expect(cartWrites).toBe(0);
});

test('stale cart out-of-stock items cannot be selected for checkout or WhatsApp ordering', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'account');
  await page.route('**/api/cart', route => route.fulfill({ json: { success: true, data: { cart: { items: [{ productId: product, quantity: 1, priceSnapshot: 100 }] } } } }));
  await page.goto('/cart');
  await expect(page.getByRole('checkbox', { name: `Select ${product.name}`, exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Order on WhatsApp', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Send Enquiry', exact: true }).first()).toBeDisabled();
});
