import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';

const id = '507f1f77bcf86cd799439011';
const dealer = { _id: id, fullName: 'Test Dealer', email: 'dealer@example.test', phone: '9876543210', role: 'dealer', accountStatus: 'active' };
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jY9kAAAAASUVORK5CYII=', 'base64');

test('dealer profile upload buttons open the picker; image/PDF replacement and retry update the document', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'account');
  for (const path of ['**/api/auth/refresh-token', '**/api/auth/me']) await page.route(path, route => route.fulfill({ json: { success: true, data: { accessToken: 'dealer-token', refreshToken: 'dealer-refresh', user: dealer } } }));
  let profile = { _id: id, companyName: 'Test Firm', status: 'approved', kycDocuments: [{ type: 'aadhaar', url: 'https://files.example/old.pdf' }] };
  let uploads = 0;
  await page.route('**/api/dealers/profile', route => route.fulfill({ json: { success: true, data: { profile } } }));
  await page.route('**/api/dealers/kyc/documents', route => {
    const req = route.request(); const data = req.postData();
    expect(req.headers()['content-type']).toContain('multipart/form-data; boundary=');
    const type = data.match(/name="type"\r\n\r\n(.*?)\r\n/)[1];
    uploads++;
    if (uploads === 1) return route.fulfill({ status: 503, json: { message: 'Storage temporarily unavailable' } });
    profile = { ...profile, status: 'pending', kycDocuments: [...profile.kycDocuments.filter(doc => doc.type !== type), { type, url: `https://files.example/${type}-${uploads}.webp` }] };
    return route.fulfill({ json: { success: true, data: { profile } } });
  });
  await page.goto('/account/profile/update');
  const gst = page.getByRole('button', { name: 'Upload GST Certificate', exact: true });
  const choose = async (button, file) => {
    const chooser = page.waitForEvent('filechooser');
    await button.click();
    await (await chooser).setFiles(file);
  };
  const pdf = { name: 'gst.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 fixture') };
  await choose(gst, pdf);
  await expect(page.getByRole('alert').filter({ hasText: 'Storage temporarily unavailable' })).toBeVisible();
  await expect(gst).toBeEnabled();
  await choose(gst, pdf);
  await expect(page.getByRole('button', { name: 'Replace GST Certificate', exact: true })).toBeVisible();
  const image = { name: 'aadhaar.png', mimeType: 'image/png', buffer: png };
  await choose(page.getByRole('button', { name: 'Replace Aadhaar Card', exact: true }), image);
  await expect(page.locator('a[href="https://files.example/aadhaar-3.webp"]')).toBeVisible();
  await choose(page.getByRole('button', { name: 'Replace Aadhaar Card', exact: true }), image);
  await expect(page.locator('a[href="https://files.example/aadhaar-4.webp"]')).toBeVisible();
  expect(uploads).toBe(4);
});

for (const width of [1280, 390]) {
  test(`dealer profile preserves saved dropdown values and saves Rajasthan/Chittorgarh at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await mockApi(page); await seedBrowserSession(page, 'account');
    for (const path of ['**/api/auth/refresh-token', '**/api/auth/me']) await page.route(path, route => route.fulfill({ json: { success: true, data: { accessToken: 'dealer-token', refreshToken: 'dealer-refresh', user: dealer } } }));
    let profile = { _id: id, companyName: 'Test Firm', state: 'Rajasthan', city: 'Chittorgarh', pincode: '312001', status: 'pending', kycDocuments: [] };
    let saved;
    await page.route('**/api/dealers/profile', route => {
      if (route.request().method() === 'PUT') { saved = route.request().postDataJSON(); profile = { ...profile, ...saved }; }
      return route.fulfill({ json: { success: true, data: { profile } } });
    });
    await page.goto('/account/profile/update');
    const state = page.getByRole('combobox', { name: 'State', exact: true });
    const city = page.getByRole('combobox', { name: 'City', exact: true });
    await expect(state).toHaveText('Rajasthan');
    await expect(city).toHaveText('Chittorgarh');
    await state.click();
    await page.getByRole('searchbox', { name: 'Search states...' }).fill('Gujarat');
    await page.getByRole('option', { name: 'Gujarat', exact: true }).click();
    await expect(city).toHaveText('Select City');
    await state.click();
    await page.getByRole('searchbox', { name: 'Search states...' }).fill('Rajasthan');
    await page.getByRole('option', { name: 'Rajasthan', exact: true }).click();
    await city.click();
    await page.getByRole('searchbox', { name: 'Search cities...' }).fill('chittorgarh');
    await page.getByRole('option', { name: 'Chittorgarh', exact: true }).click();
    await page.getByRole('button', { name: 'Update Business Profile', exact: true }).click();
    await expect.poll(() => saved?.city).toBe('Chittorgarh');
    expect(saved.state).toBe('Rajasthan');
    await expect(city).toHaveText('Chittorgarh');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('profile preserves a saved value but does not offer free-text rural entries', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'account');
  for (const path of ['**/api/auth/refresh-token', '**/api/auth/me']) await page.route(path, route => route.fulfill({ json: { success: true, data: { accessToken: 'dealer-token', refreshToken: 'dealer-refresh', user: dealer } } }));
  await page.route('**/data/india-places/rajasthan.json*', route => route.fulfill({ status: 503, body: '' }));
  await page.route('**/api/dealers/profile', route => route.fulfill({ json: { success: true, data: { profile: { _id: id, companyName: 'Test Firm', state: 'Rajasthan', city: 'Existing Small Town', status: 'pending', kycDocuments: [] } } } }));
  await page.goto('/account/profile/update');
  const city = page.getByRole('combobox', { name: 'City', exact: true });
  await expect(city).toHaveText('Existing Small Town');
  await city.click();
  const search = page.getByRole('searchbox', { name: 'Search cities...' });
  await search.fill('New Small Town');
  await expect(page.getByRole('option')).toHaveCount(0);
  await search.press('Enter');
  await expect(city).toHaveText('Existing Small Town');
});
