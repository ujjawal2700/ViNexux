import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';
const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect width="24" height="24" fill="red"/></svg>');

const setup = async page => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  const employee = { _id: '507f1f77bcf86cd799439011', role: 'admin', isEmployee: true, accessRoleActive: true, permissions: { brands: { read: true, write: true } } };
  await page.route('**/api/auth/refresh-token', route => route.fulfill({ json: { success: true, data: { user: employee, accessToken: 'brand-editor-token', refreshToken: 'employee-refresh' } } }));
  await page.route('**/api/admin/access/self', route => route.fulfill({ json: { success: true, data: { access: employee } } }));
  let brands = [], payload, uploads = 0, uploadFails = false;
  await page.route('**/api/admin/upload/**', route => route.fulfill({ status: 403, json: { message: "You don't have write access to this section." } }));
  await page.route('**/api/admin/brands/logo', route => {
    expect(route.request().headers()['content-type']).toMatch(/^multipart\/form-data/);
    expect(route.request().postDataBuffer().toString()).toContain('name="file"');
    uploads++;
    return route.fulfill(uploadFails ? { status: 400, json: { message: 'Logo image could not be processed. Choose another image.' } } : { json: { success: true, data: { url: 'https://cdn.example.test/logo.webp', publicId: 'vinexus/brands/logo-test' } } });
  });
  await page.route('**/api/admin/brands', route => {
    if (route.request().method() === 'POST') {
      payload = route.request().postDataJSON(); brands.push({ ...payload, _id: '507f1f77bcf86cd799439012' });
      return route.fulfill({ status: 201, json: { success: true, data: { brand: brands[0] } } });
    }
    return route.fulfill({ json: { success: true, data: { brands } } });
  });
  await page.goto('/admin/brands'); await page.getByRole('button', { name: 'Add Brand', exact: true }).click();
  await page.getByPlaceholder('Enter brand name').fill('Camera Brand');
  return { payload: () => payload, uploads: () => uploads, failUpload: value => { uploadFails = value; } };
};

for (const mimeType of ['image/svg+xml', 'application/octet-stream']) test(`brand-only editor creates a brand with an SVG logo (${mimeType})`, async ({ page }) => {
  const state = await setup(page);
  await page.getByLabel('Brand logo image').setInputFiles({ name: 'brand.svg', mimeType, buffer: svg });
  await page.getByRole('button', { name: 'Create Brand', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('row').filter({ hasText: 'Camera Brand' })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('created successfully');
  expect(state.payload().logo).toEqual({ url: 'https://cdn.example.test/logo.webp', publicId: 'vinexus/brands/logo-test' });
  expect(state.uploads()).toBe(1);
});

test('failed logo uploads show the real error and keep the brand form available for retry', async ({ page }) => {
  const state = await setup(page); state.failUpload(true);
  await page.getByLabel('Brand logo image').setInputFiles({ name: 'brand.svg', mimeType: 'image/svg+xml', buffer: svg });
  await page.getByRole('button', { name: 'Create Brand', exact: true }).click();
  await expect(page.getByText('Logo image could not be processed. Choose another image.', { exact: true })).toBeVisible();
  expect(state.payload()).toBeUndefined();
  await expect(page.getByPlaceholder('Enter brand name')).toHaveValue('Camera Brand');
  state.failUpload(false); await page.getByRole('button', { name: 'Create Brand', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(state.uploads()).toBe(2);
});
