import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';
const id = '507f1f77bcf86cd799439011';
const headerId = '507f1f77bcf86cd799439012';
const secondHeader = '507f1f77bcf86cd799439013';
const product = { _id: id, name: 'Outdoor Camera', sku: 'CAM-1', modelNumber: 'CAM-1', model: 'Mini PT', variant: '4G 3MP', warranty: 'https://example.com/warranty', warrantyType: 'text', isActive: true, stockQuantity: 10, standardPrice: 100, images: [{ url: 'https://example.com/camera.webp' }], specifications: [], categoryId: headerId, categoryIds: [headerId] };

for (const warrantyType of ['text', 'link']) test(`warranty ${warrantyType} renders with the chosen behavior and displays model/variant`, async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'storefront');
  await page.route(`**/api/products/${id}`, route => route.fulfill({ json: { success: true, data: { ...product, warrantyType } } }));
  await page.goto(`/products/${id}`);
  const warranty = page.getByRole('row').filter({ hasText: 'Warranty Period' });
  await expect(warranty).toContainText(product.warranty);
  if (warrantyType === 'link') await expect(warranty.getByRole('link')).toHaveAttribute('href', product.warranty);
  else await expect(warranty.getByRole('link')).toHaveCount(0);
  await expect(page.getByRole('row').filter({ hasText: 'Model Name / Variant' })).toContainText('Mini PT / 4G 3MP');
});

test('admin changes warranty format and saves a direct header-category assignment', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  const row = { ...product }; const updates = [];
  const categories = [{ _id: headerId, name: 'Security', slug: 'security', parentId: null }, { _id: secondHeader, name: 'Networking', slug: 'networking', parentId: null }];
  await page.route('**/api/admin/categories**', route => route.fulfill({ json: { success: true, data: { categories } } }));
  await page.route(`**/api/admin/products/${id}`, route => {
    if (route.request().method() === 'PUT') { const body = route.request().postDataJSON(); updates.push(body); Object.assign(row, body); }
    return route.fulfill({ json: { success: true, data: row } });
  });
  await page.goto(`/admin/products/${id}`);
  await page.getByRole('button', { name: 'Warranty format', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Link', exact: true }).click();
  await page.getByRole('button', { name: 'Save & Publish', exact: true }).click();
  await expect.poll(() => updates.length).toBe(1);
  expect(updates[0]).toMatchObject({ warrantyType: 'link' });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Warranty format' })).toContainText('Link');
  await page.getByRole('button', { name: /^Groups/ }).click();
  await page.locator('#field-headerCategory').getByRole('button').click();
  await page.getByRole('menuitem', { name: 'Networking (Header)', exact: true }).click();
  await page.getByRole('button', { name: 'Save & Publish', exact: true }).click();
  await expect.poll(() => updates.length).toBe(2);
  expect(updates[1]).toMatchObject({ categoryId: secondHeader, categoryIds: [secondHeader] });
});

test('WhatsApp order summary includes VI Nexus, customer contact, default address and model/variant', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'account');
  await page.route('**/api/addresses', route => route.fulfill({ json: { success: true, data: { addresses: [
    { line1: 'Other Address', city: 'Jaipur', state: 'Rajasthan', pincode: '302001' },
    { isDefault: true, line1: '123 Main Road', line2: 'Near Market', city: 'Kota', state: 'Rajasthan', pincode: '324002' },
  ] } } }));
  await page.route('**/api/cart', route => route.fulfill({ json: { success: true, data: { cart: { items: [{ productId: product, quantity: 2, priceSnapshot: 100 }] } } } }));
  await page.goto('/cart');
  await page.evaluate(() => document.addEventListener('click', event => {
    const anchor = event.target.closest('a');
    if (anchor?.href.includes('api.whatsapp.com/send')) { window.orderWhatsAppUrl = anchor.href; event.preventDefault(); }
  }, true));
  await page.getByRole('button', { name: 'Order on WhatsApp', exact: true }).click();
  const url = await page.evaluate(() => window.orderWhatsAppUrl);
  const message = new URL(url).searchParams.get('text');
  expect(message).toContain('VI Nexus — Order Summary');
  expect(message).not.toMatch(/Compu World|Enquiry Summary|Product Enquiry/i);
  expect(message).toContain('Customer:');
  expect(message).toContain('Phone:');
  expect(message).toContain('123 Main Road, Near Market, Kota, Rajasthan, 324002');
  expect(message).toContain('Model Name / Variant: Mini PT / 4G 3MP');
});
