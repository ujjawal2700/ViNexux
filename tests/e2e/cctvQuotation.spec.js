import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';
import { cctvCatalog, ids, quoteCustomerFixture, quoteSettingsFixture, quoteSelectionFixture } from '../fixtures/cctvQuote.js';
import { calculateCctvQuote } from '../../shared/cctvQuote.js';
const quoteId = '607f1f77bcf86cd799439011';
const person = { _id: ids[0], role: 'customer', fullName: 'Quote Customer', name: 'Quote Customer', email: 'quote@example.test', phone: '9876543210', address: '123 Test Road, Kota, Rajasthan', isEmailVerified: true };
const makeQuote = () => ({ _id: quoteId, __v: 0, quoteNumber: 'VNQ-2026-TEST123', userId: ids[0], selection: quoteSelectionFixture, customer: quoteCustomerFixture, pricing: calculateCctvQuote(cctvCatalog, quoteSelectionFixture, quoteSettingsFixture), status: 'new', emailStatus: 'sent', seller: quoteSettingsFixture.seller, terms: quoteSettingsFixture.terms, messages: [], revisions: [], createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 7 * 86400000).toISOString() });
async function setup(page, { guest = false, admin = false } = {}) {
  await mockApi(page); await seedBrowserSession(page, guest ? 'storefront' : admin ? 'admin' : 'account');
  if (!guest && !admin) {
    await page.route('**/api/auth/refresh-token', route => route.fulfill({ json: { success: true, data: { user: person, accessToken: 'customer-token', refreshToken: 'customer-refresh' } } }));
    await page.route('**/api/auth/me', route => route.fulfill({ json: { success: true, data: { user: person } } }));
  }
  const writes = [], quote = makeQuote();
  await page.route('**/api/quotations**', route => {
    const req = route.request(), path = new URL(req.url()).pathname;
    if (path.endsWith('/catalog')) return route.fulfill({ json: { success: true, data: { settings: quoteSettingsFixture, catalog: guest ? cctvCatalog.map(({ price, ...row }) => row) : cctvCatalog, pricesVisible: !guest } } });
    if (path.endsWith('/pdf')) return route.fulfill({ contentType: 'application/pdf', body: '%PDF-1.4 fixture' });
    if (req.method() === 'POST') {
      const data = req.postDataJSON(); writes.push({ path, data });
      if (path.endsWith('/messages')) quote.messages.push({ from: 'customer', text: data.message, at: new Date().toISOString() });
      else if (path.endsWith('/verify-email')) return route.fulfill({ json: { success: true, data: { token: 'verified-quote-email' } } });
      else if (path.endsWith('/email-code')) return route.fulfill({ json: { success: true, data: { resendAfter: 60 } } });
      return route.fulfill({ json: { success: true, data: { quote } } });
    }
    return route.fulfill({ json: { success: true, data: path.endsWith(`/${quoteId}`) ? { quote } : { quotes: [quote], pagination: { page: 1, total: 1, totalPages: 1 } } } });
  });
  return { writes, quote };
}
async function cameras(page, system = 'WiFi Camera') {
  await page.getByRole('button', { name: new RegExp(`^${system}`) }).click(); await page.getByRole('button', { name: 'Next Step' }).click();
  await page.getByLabel('Dome Cameras (indoor)', { exact: true }).fill('2'); await page.getByLabel('Bullet Cameras (outdoor)', { exact: true }).fill('2'); await page.getByRole('radio', { name: 'Yes', exact: true }).check();
}
async function finalStep(page) { for (let step = 0; step < 4; step++) await page.getByRole('button', { name: 'Next Step' }).click(); }

test('six-step customer journey creates a priced quotation, downloads the PDF and opens the saved record', async ({ page }, testInfo) => {
  const { writes } = await setup(page); await page.goto('/cctv-quote'); await cameras(page);
  await expect(page.getByTestId('quotation-total')).toHaveText('₹17,134.00');
  await finalStep(page); await expect(page.getByText('Email verified', { exact: true })).toBeVisible();
  await page.getByRole('radio', { name: 'Email', exact: true }).check();
  await page.getByRole('button', { name: 'Get My Quote', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your Quotation is Ready!' })).toBeVisible();
  const submitted = writes.find(row => row.path === '/api/quotations').data;
  expect(submitted.selection).toMatchObject({ systemType: 'WIFI', domeCount: 2, bulletCount: 2, area: 'Kota City', mobileView: true });
  expect(submitted.total).toBeUndefined(); expect(submitted.customer.email).toBe(person.email);
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download Quotation', exact: true }).click(); expect((await download).suggestedFilename()).toContain('quotation');
  await page.getByRole('link', { name: 'Open Quotation', exact: true }).click(); await expect(page).toHaveURL(`/account/quotations/${quoteId}`);
  await expect(page.getByRole('heading', { name: 'VNQ-2026-TEST123' })).toBeVisible();
  await page.getByLabel('Send a message', { exact: true }).fill('Please confirm installation availability.'); await page.getByRole('button', { name: 'Send Message', exact: true }).click();
  await expect(page.getByText('Please confirm installation availability.', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('customer-quotation.png'), fullPage: true });
});
test('guest configuration hides prices and retains selections for sign-in', async ({ page }) => {
  const { writes } = await setup(page, { guest: true }); await page.goto('/cctv-quote'); await cameras(page);
  await expect(page.getByRole('region', { name: 'Your quotation', exact: true })).not.toContainText('₹');
  await finalStep(page); await page.getByRole('button', { name: 'Sign in to Get My Quote' }).click();
  await expect(page).toHaveURL('/login'); expect(writes).toHaveLength(0);
  const stored = await page.evaluate(() => JSON.parse(sessionStorage.getItem('vinexus-cctv-quote-draft-v1'))); expect(stored.selection).toMatchObject({ systemType: 'WIFI', domeCount: 2, bulletCount: 2 }); expect(stored.customer).toBeUndefined();
});
test('counts, mobile preference, searches, accessories and responsive layout stay consistent', async ({ page }, testInfo) => {
  await setup(page); await page.goto('/cctv-quote'); await page.getByRole('button', { name: /^HD Camera/ }).click(); await page.getByRole('button', { name: 'Next Step' }).click();
  await page.getByRole('button', { name: 'Next Step' }).click(); await expect(page.getByRole('alert')).toContainText('Choose 1–64 cameras');
  await page.getByLabel('Dome Cameras (indoor)', { exact: true }).fill('2'); await page.getByLabel('Bullet Cameras (outdoor)', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Next Step' }).click(); await expect(page.getByRole('alert')).toContainText('mobile viewing');
  await page.getByRole('radio', { name: 'No', exact: true }).check();
  await page.getByLabel('Search dome camera model', { exact: true }).fill('MODEL-2'); await expect(page.getByRole('combobox', { name: 'Dome camera model', exact: true })).toContainText('CP Plus 2MP HD Dome Camera');
  for (const width of [1920, 1280, 768, 390, 320]) { await page.setViewportSize({ width, height: 1000 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await page.screenshot({ path: testInfo.outputPath(`wizard-${width}.png`), fullPage: true }); }
  await page.getByRole('button', { name: 'Next Step' }).click(); await page.getByRole('tab', { name: 'Rack', exact: true }).click();
  await page.getByLabel('Include in my quote', { exact: true }).uncheck(); await expect(page.getByTestId('quotation-total')).toHaveText('₹14,042.00');
});
test('email verification is required for a different quote email before submission', async ({ page }) => {
  const { writes } = await setup(page); await page.goto('/cctv-quote'); await cameras(page); await finalStep(page);
  await page.getByLabel('Email address *', { exact: true }).fill('other@example.test'); await page.getByRole('radio', { name: 'Email', exact: true }).check();
  await page.getByRole('button', { name: 'Get My Quote' }).click(); await expect(page.getByRole('alert')).toContainText('Verify your email');
  await page.getByRole('button', { name: 'Send Code', exact: true }).click(); await expect(page.getByRole('button', { name: /Resend in/ })).toBeDisabled();
  await page.getByLabel('Six-digit email verification code').fill('123456'); await page.getByRole('button', { name: 'Verify Email', exact: true }).click(); await expect(page.getByText('Email verified', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Get My Quote' }).click(); await expect(page.getByRole('heading', { name: 'Your Quotation is Ready!' })).toBeVisible();
  expect(writes.find(row => row.path === '/api/quotations').data.emailToken).toBe('verified-quote-email');
});
test('admin quotation settings and follow-up controls manage configurations and manual responses', async ({ page }, testInfo) => {
  await setup(page, { admin: true }); const quote = makeQuote(); let saved;
  await page.route('**/api/admin/quotations**', route => {
    const req = route.request(), path = new URL(req.url()).pathname;
    if (req.method() === 'PUT') { saved = req.postDataJSON(); if (!path.endsWith('/settings')) { quote.status = saved.status; quote.messages.push({ from: 'admin', text: saved.response, at: new Date().toISOString() }); quote.__v++; } }
    const data = path.endsWith('/settings') ? req.method() === 'PUT' ? { settings: { ...saved, revision: 1 } } : { settings: quoteSettingsFixture, catalog: cctvCatalog } : path.endsWith(`/${quoteId}`) ? { quote } : { quotes: [quote], pagination: { page: 1, total: 1, totalPages: 1 } };
    return route.fulfill({ json: { success: true, data } });
  });
  await page.goto('/admin/quotations/settings'); await page.getByLabel('Installation per camera (₹)', { exact: true }).fill('150'); await page.getByRole('button', { name: 'Save Quotation Settings', exact: true }).click(); await expect(page.getByRole('status')).toContainText('settings saved'); expect(saved.installationPerCamera).toBe(150);
  await page.goto(`/admin/quotations/${quoteId}`); await page.getByLabel('Quotation status', { exact: true }).selectOption('responded'); await page.getByLabel('Revise / confirm quotation prices', { exact: true }).check();
  const price = page.getByLabel('Unit price (₹)', { exact: true }).first();
  await expect(price).toHaveAttribute('type', 'text');
  await price.fill(''); await price.pressSequentially('12.50'); await expect(price).toHaveValue('12.50');
  await price.fill('2500'); await page.getByLabel('Response to customer', { exact: true }).fill('Confirmed equipment and installation after discussion.');
  await page.getByRole('button', { name: 'Save Status / Response', exact: true }).click(); await expect(page.getByText('Confirmed equipment and installation after discussion.', { exact: true })).toBeVisible(); expect(saved.lines[0].unitPrice).toBe(2500); expect(saved.expectedVersion).toBe(0);
  await page.screenshot({ path: testInfo.outputPath('admin-quotation.png'), fullPage: true });
});

test('bottom quotation pill opens the wizard and camera counts accept typing without leading zero', async ({ page }, testInfo) => {
  await setup(page);
  await page.goto('/');
  const tab = page.getByRole('link', { name: 'Get quick CCTV quotation', exact: true });
  await expect(tab).toBeVisible();
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const bounds = await tab.boundingBox();
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    expect(Math.abs(bounds.x + bounds.width - (width - 16))).toBeLessThan(2);
    expect(bounds.y + bounds.height).toBeGreaterThan(850);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(884);
    expect(bounds.width).toBeGreaterThan(bounds.height * 3);
    expect(await tab.evaluate(element => getComputedStyle(element.closest('[data-quotation-float]')).position)).toBe('fixed');
    await page.screenshot({ path: testInfo.outputPath(`quote-tab-${width}.png`) });
  }
  const prompt = page.getByRole('complementary', { name: 'Quick CCTV quotation suggestion' });
  await expect(prompt).toBeVisible();
  await page.getByRole('button', { name: 'Dismiss quotation suggestion' }).click();
  await expect(prompt).toHaveCount(0);
  await page.reload();
  await expect(tab).toBeVisible();
  await expect(prompt).toBeVisible();
  await tab.click();
  await expect(page).toHaveURL('/cctv-quote');
  await expect(tab).toHaveCount(0);
  await page.getByRole('button', { name: /^HD Camera/ }).click();
  await page.getByRole('button', { name: 'Next Step' }).click();
  const count = page.getByLabel('Dome Cameras (indoor)', { exact: true });
  await expect(count).toHaveAttribute('type', 'text');
  await expect(count).toHaveValue('');
  await count.pressSequentially('4');
  await expect(count).toHaveValue('4');
  await expect(page.getByText('★ Recommended: CP Plus 2MP HD Dome Camera', { exact: true })).toBeVisible();
  await count.fill('04'); await expect(count).toHaveValue('4');
  await count.fill(''); await count.pressSequentially('2'); await expect(count).toHaveValue('2');
  await count.fill('99'); expect(await count.evaluate(element => element.validity.valid)).toBe(false);
  await page.getByRole('button', { name: 'Next Step' }).click(); await expect(page.getByRole('alert')).toContainText('Choose 1–64 cameras');
});

test('4G camera choices exclude mislabeled accessories and use the team camera fallback', async ({ page }) => {
  await setup(page);
  const accessories = ['FYBER Mini UPS (Li-Ion)', 'SD Card for 4G Camera', '4CH NVR'].map((name, index) => ({ ...cctvCatalog[0], key: `accessory-${index}`, name, kind: 'camera', style: 'dome', systemTypes: ['4G'], stock: 100 }));
  await page.route('**/api/quotations/catalog', route => route.fulfill({ json: { success: true, data: { settings: quoteSettingsFixture, catalog: accessories, pricesVisible: true } } }));
  await page.goto('/cctv-quote'); await cameras(page, '4G Camera');
  for (const style of ['Dome', 'Bullet']) {
    const select = page.getByRole('combobox', { name: `${style} camera model`, exact: true });
    await expect(select).toContainText('Our team will recommend the best camera for you');
    await expect(select.locator('option')).toHaveCount(1);
  }
  await page.getByLabel('Search camera (any brand)', { exact: true }).fill('FYBER');
  await expect(page.getByRole('button', { name: /FYBER Mini UPS/ })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Your quotation', exact: true })).not.toContainText('UPS');
});
