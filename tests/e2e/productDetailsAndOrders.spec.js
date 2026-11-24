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

test('cart WhatsApp button collects contact and delivery details before opening chat', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'account');
  await page.route('**/api/cart', route => route.fulfill({ json: { success: true, data: { cart: { items: [{ productId: product, quantity: 2, priceSnapshot: 100 }] } } } }));
  await page.goto('/cart');
  await page.getByRole('button', { name: 'Order on WhatsApp', exact: true }).click();
  await expect(page).toHaveURL('/account/checkout-enquiry?channel=whatsapp');
  await expect(page.getByLabel('Full Name', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save & Open WhatsApp', exact: true })).toBeVisible();
});

test('main product image loads eagerly at high priority with gallery-sized responsive images', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'storefront');
  const imageUrl = 'https://res.cloudinary.com/store/image/upload/v123/camera.webp';
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jY9kAAAAASUVORK5CYII=', 'base64');
  await page.route('https://res.cloudinary.com/**', route => route.fulfill({ contentType: 'image/png', body: png }));
  await page.route(`**/api/products/${id}`, route => route.fulfill({ json: { success: true, data: { ...product, images: [{ url: imageUrl }, { url: imageUrl.replace('camera', 'back') }] } } }));
  await page.goto(`/products/${id}`);
  const image = page.getByRole('button', { name: 'Open full size product image', exact: true }).locator('img');
  await expect(image).toHaveAttribute('loading', 'eager');
  await expect(image).toHaveAttribute('fetchpriority', 'high');
  await expect(image).toHaveAttribute('srcset', /w_1280.*1280w$/);
  await expect(image).toHaveCSS('opacity', '1');
  const thumbs = page.getByRole('group', { name: 'Product image thumbnails', exact: true }).locator('img');
  await expect(thumbs.first()).toHaveAttribute('srcset', /w_192.*192w$/);
});
