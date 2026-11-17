import { posInvoiceFixture } from '../helpers/posFixture.js';
import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';
const id = '507f1f77bcf86cd799439011', secondId = '507f1f77bcf86cd799439012';
const cursor = '000000000000000000000000';
async function setup(page, adminId = id) {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  await page.addInitScript(adminId => {
    const user = JSON.parse(localStorage.getItem('vinexus_admin_user')); user._id = adminId; localStorage.setItem('vinexus_admin_user', JSON.stringify(user));
    window.rings = []; window.AudioContext = class { state = 'running'; currentTime = 0; destination = {};
      resume() { return Promise.resolve(); }
      createOscillator() { return { frequency: {}, connect() {}, start() {}, stop: time => window.rings.push(time), disconnect() {} }; }
      createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} }; }
    };
  }, adminId);
}
test('every logged-in super admin gets one-second ring, six-second banner, and live Orders card without push permission', async ({ browser }, testInfo) => {
  const pages = [await browser.newPage(), await browser.newPage()];
  let arrival = null;
  const bootstrapped = new Set();
  for (const [index, page] of pages.entries()) {
    await setup(page, index ? secondId : id);
    await page.route('**/api/admin/arrivals**', route => {
      const after = new URL(route.request().url()).searchParams.get('after');
      bootstrapped.add(index);
      const arrivals = after && after !== id && arrival ? [arrival] : [];
      return route.fulfill({ json: { success: true, data: { arrivals, cursor: arrivals.length ? id : after || cursor, hasMore: false } } });
    });
    await page.route('**/api/admin/dashboard', route => route.fulfill({ json: { success: true, data: { orders: { total: arrival ? 8 : 7, new: arrival ? 2 : 1, whatsapp: arrival ? 5 : 4, pos: 3 } } } }));
    await page.goto('/admin/dashboard');
    await page.getByRole('button', { name: 'Enable alert sound' }).click();
    await expect(page.getByText('Orders', { exact: true }).locator('..').getByRole('heading', { name: '7', exact: true })).toBeVisible();
    await expect(page.getByRole('status', { name: 'New order or enquiry' })).toHaveCount(0);
    expect(await page.evaluate(() => window.rings)).toEqual([]);
  }
  expect(bootstrapped.size).toBe(2);
  arrival = { _id: id, title: 'New WhatsApp order lead', body: 'VNX-000008 · Customer', link: `/admin/whatsapp-orders/${id}` };
  for (const page of pages) {
    await expect(page.getByRole('status', { name: 'New order or enquiry' })).toBeVisible({ timeout: 7500 });
    await expect(page.getByText('Orders', { exact: true }).locator('..').getByRole('heading', { name: '8', exact: true })).toBeVisible();
    expect(await page.evaluate(() => window.rings)).toEqual([1]);
  }
  await pages[0].screenshot({ path: testInfo.outputPath('super-admin-new-order-banner.png'), fullPage: false });
  // A duplicate push must not create a second banner/ring after polling delivered it.
  await pages[0].evaluate(id => window.dispatchEvent(new CustomEvent('vinexus-push', { detail: { title: 'New WhatsApp order lead', body: 'VNX-000008', data: { type: 'admin-arrival', arrivalId: id, link: `/admin/whatsapp-orders/${id}` } } })), id);
  expect(await pages[0].evaluate(() => window.rings)).toEqual([1]);
  await expect(pages[0].getByRole('status', { name: 'New order or enquiry' })).toHaveCount(0, { timeout: 7500 });
  expect(await pages[0].evaluate(() => window.rings)).toEqual([1]);
  for (const page of pages) await page.close();
});
test('push alert works on any admin page and links to the exact enquiry', async ({ page }) => {
  await setup(page);
  await page.goto('/admin/products');
  await page.getByRole('button', { name: 'Enable alert sound' }).click();
  await page.evaluate(id => window.dispatchEvent(new CustomEvent('vinexus-push', { detail: { title: 'New enquiry received', body: 'VNX-000009', data: { type: 'admin-arrival', arrivalId: id, link: `/admin/enquiries/${id}` } } })), id);
  const banner = page.getByRole('status', { name: 'New order or enquiry' });
  await expect(banner).toBeVisible(); expect(await page.evaluate(() => window.rings)).toEqual([1]);
  await banner.getByRole('link', { name: 'View details', exact: true }).click();
  await expect(page).toHaveURL(`/admin/enquiries/${id}`);
});
test('customers never see or ring a super admin arrival notification', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'account');
  await page.goto('/account/enquiries');
  await page.evaluate(id => window.dispatchEvent(new CustomEvent('vinexus-push', { detail: { title: 'New order', data: { type: 'admin-arrival', arrivalId: id, link: '/admin/whatsapp-orders' } } })), id);
  await expect(page.getByRole('status', { name: 'New order or enquiry' })).toHaveCount(0);
  await expect(page.getByRole('status', { name: 'Push notification' })).toHaveCount(0);
});

test('new POS order banner opens the saved invoice directly', async ({ page }) => {
  await setup(page);
  const sale = posInvoiceFixture();
  await page.route(`**/api/admin/pos/sales/${sale._id}`, route => route.fulfill({ json: { success: true, data: sale } }));
  await page.goto('/admin/products');
  await page.getByRole('button', { name: 'Enable alert sound' }).click();
  await page.evaluate(({ id, saleId }) => window.dispatchEvent(new CustomEvent('vinexus-push', { detail: { title: 'New order received', body: 'POS order', data: { type: 'admin-arrival', arrivalId: id, link: `/admin/pos?invoice=${saleId}` } } })), { id, saleId: sale._id });
  await page.getByRole('status', { name: 'New order or enquiry' }).getByRole('link', { name: 'View details' }).click();
  await expect(page.getByRole('dialog')).toContainText(sale.invoiceNumber);
  await expect(page.getByRole('dialog')).toContainText('Sample Customer');
});
