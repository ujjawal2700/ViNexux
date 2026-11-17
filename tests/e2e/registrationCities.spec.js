import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';

const openRegistration = async page => {
  await mockApi(page); await seedBrowserSession(page, 'storefront');
  await page.route('https://tile.openstreetmap.org/**', route => route.abort());
  await page.goto('/register');
  await page.getByRole('button', { name: 'Dealer / B2B', exact: true }).click();
};
const selectState = async (page, name) => {
  await page.getByRole('combobox', { name: 'State', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search states...' }).fill(name);
  await page.getByRole('option', { name, exact: true }).click();
};
for (const width of [1280, 390]) {
  test(`Rajasthan finds Chittorgarh and the dropdown stays above the map at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await openRegistration(page);
    const loaded = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/data/india-places/rajasthan.json'));
    await selectState(page, 'Rajasthan'); await loaded;
    await page.getByRole('combobox', { name: 'City', exact: true }).click();
    await page.getByRole('searchbox', { name: 'Search cities...' }).fill('chittorgarh');
    const option = page.getByRole('option', { name: 'Chittorgarh', exact: true });
    await expect(option).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('rajasthan-city-dropdown.png') });
    expect(await option.evaluate(el => { const r = el.getBoundingClientRect(); return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('[role="option"]') === el; })).toBe(true);
    await option.click();
    await expect(page.getByRole('combobox', { name: 'City', exact: true })).toHaveText('Chittorgarh');
    await page.getByRole('combobox', { name: 'City', exact: true }).click();
    await page.getByRole('searchbox', { name: 'Search cities...' }).fill('Rawatbhata');
    await page.getByRole('option', { name: 'Rawatbhata', exact: true }).click();
    await expect(page.getByRole('combobox', { name: 'City', exact: true })).toHaveText('Rawatbhata');
    await page.getByRole('combobox', { name: 'City', exact: true }).click();
    await page.getByRole('searchbox', { name: 'Search cities...' }).fill('Chittaurgarh');
    await expect(page.getByRole('option', { name: 'Chittorgarh', exact: true })).toBeVisible();
    await page.getByRole('option', { name: 'Chittorgarh', exact: true }).click();
    await selectState(page, 'Gujarat');
    await expect(page.getByRole('combobox', { name: 'City', exact: true })).toHaveText('Select City *');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('rural or unlisted names cannot be added when city data is unavailable', async ({ page }) => {
  await openRegistration(page);
  await page.route('**/data/india-places/rajasthan.json*', route => route.fulfill({ status: 503, body: '' }));
  await selectState(page, 'Rajasthan');
  await page.getByRole('combobox', { name: 'City', exact: true }).click();
  const search = page.getByRole('searchbox', { name: 'Search cities...' });
  await search.fill('Rural Settlement');
  await expect(page.getByRole('listbox', { name: 'City', exact: true }).getByRole('option')).toHaveCount(0);
  await expect(page.getByText('No matching city in this state.')).toBeVisible();
  await search.press('Enter');
  await expect(page.getByRole('combobox', { name: 'City', exact: true })).toHaveText('Select City *');
});

test('registration submits Chittorgarh with Rajasthan after city selection', async ({ page }) => {
  await openRegistration(page);
  let submitted;
  await page.route('**/api/auth/send-otp', route => route.fulfill({ json: { success: true, data: {} } }));
  await page.route('**/api/auth/verify-signup-otp', route => route.fulfill({ json: { success: true, data: {} } }));
  await page.route('**/api/auth/signup', route => {
    submitted = route.request().postDataJSON();
    return route.fulfill({ status: 400, json: { success: false, message: 'Captured test registration' } });
  });
  for (const [placeholder, value] of [['Full Name of Proprietor / Authorized Person', 'Test Dealer'], ['Business / Trade Registered Name', 'Test Company'], ['Official Email Address', 'dealer@example.test'], ['10-digit Indian Mobile Number', '9876543210'], ['10-digit WhatsApp Number', '9876543210'], ['15-character GSTIN', '08ABCDE1234F1Z5'], ['10-character PAN', 'ABCDE1234F'], ['12-digit Aadhaar number', '123456789012'], ['Shop / Office No, Building, Street, Area', 'Business Road'], ['6-digit Pincode', '312001']]) {
    await page.getByPlaceholder(placeholder, { exact: true }).fill(value);
  }
  await page.locator('select').selectOption('Proprietorship');
  for (const label of ['GST Certificate (Photo or PDF)', 'Aadhaar Card (Photo or PDF)']) await page.getByLabel(label, { exact: false }).setInputFiles({ name: 'document.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 fixture') });
  await selectState(page, 'Rajasthan');
  await page.getByRole('combobox', { name: 'City', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search cities...' }).fill('chittorgarh');
  await page.getByRole('option', { name: 'Chittorgarh', exact: true }).click();
  await page.getByLabel('Latitude', { exact: false }).fill('24.88');
  await page.getByLabel('Longitude', { exact: false }).fill('74.63');
  await page.getByRole('checkbox', { name: 'I accept the', exact: true }).check();
  await page.getByRole('button', { name: 'Create Account & Submit KYC' }).click();
  await expect(page.getByRole('heading', { name: 'Verify your phone number' })).toBeVisible();
  const otp = page.locator('input[maxlength="1"]');
  for (let i = 0; i < 6; i++) await otp.nth(i).fill(String(i + 1));
  await page.getByRole('button', { name: 'Verify & Submit KYC' }).click();
  await expect.poll(() => submitted?.city).toBe('Chittorgarh');
  expect(submitted.state).toBe('Rajasthan');
});

test('Rajasthan suggestions exclude numbered settlements and reject another state dataset', async ({ page }) => {
  await openRegistration(page);
  await page.route('**/data/india-places/rajasthan.json*', route => route.fulfill({ json: { state: 'Maharashtra', names: ['Mumbai'], aliases: {} } }));
  await selectState(page, 'Rajasthan');
  await expect(page.getByText('Full city list is unavailable.', { exact: false })).toBeVisible();
  await page.getByRole('combobox', { name: 'City', exact: true }).click();
  await expect(page.getByRole('option', { name: 'Chittorgarh', exact: true })).toBeVisible();
  await expect(page.getByRole('option', { name: 'Mumbai', exact: true })).toHaveCount(0);
  for (const name of ['1 Arm (Surjanwali)', '11 Arm', '1A', '2A']) await expect(page.getByRole('option', { name, exact: true })).toHaveCount(0);
});

test('late Rajasthan response cannot replace Maharashtra city suggestions', async ({ page }) => {
  await openRegistration(page);
  let signalArrival, releaseResponse;
  const arrived = new Promise(resolve => { signalArrival = resolve; });
  const release = new Promise(resolve => { releaseResponse = resolve; });
  await page.route('**/data/india-places/rajasthan.json*', async route => {
    const response = await route.fetch(); signalArrival();
    await release; await route.fulfill({ response });
  });
  await selectState(page, 'Rajasthan'); await arrived;
  await selectState(page, 'Maharashtra');
  const late = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/data/india-places/rajasthan.json'));
  releaseResponse(); await late;
  await page.getByRole('combobox', { name: 'City', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search cities...' }).fill('Mumbai');
  await expect(page.getByRole('option', { name: 'Mumbai', exact: true })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search cities...' }).fill('Chittorgarh');
  await expect(page.getByRole('option', { name: 'Chittorgarh', exact: true })).toHaveCount(0);
});
