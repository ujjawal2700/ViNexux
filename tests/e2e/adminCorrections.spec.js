import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';

for (const [label, viewport, width, height] of [
  ['portrait desktop', { width: 1280, height: 720 }, 1000, 1500],
  ['landscape desktop', { width: 1280, height: 720 }, 1600, 700],
  ['portrait mobile', { width: 390, height: 844 }, 1000, 1500],
]) test(`promotional banner fits the window without cropping: ${label}`, async ({ page }) => {
  await page.setViewportSize(viewport); await mockApi(page);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#f0f0f0"/><rect x="5" y="5" width="${width - 10}" height="${height - 10}" fill="none" stroke="red" stroke-width="8"/></svg>`;
  await page.route('**/api/content/promotional-banners', route => route.fulfill({ json: { success: true, data: { promotionalBanners: [{ title: 'Full banner', isActive: true, link: '/products', image: { url: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}` } }] } } }));
  await page.goto('/');
  const image = page.getByRole('dialog').getByRole('img', { name: 'Full banner' });
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate(img => img.getBoundingClientRect().width / img.getBoundingClientRect().height)).toBeCloseTo(width / height, 3);
  const bounds = await image.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width); expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
  expect(await image.evaluate(img => getComputedStyle(img).objectFit)).toBe('contain');
  await image.hover();
  expect(await image.evaluate(img => getComputedStyle(img).transform)).toBe('none');
  await page.screenshot({ path: `/private/tmp/vinexus-popup-${label.replaceAll(' ', '-')}.png` });
});

test('stock dialog adds and removes quantities and prevents negative stock', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  const product = { _id: '507f1f77bcf86cd799439011', name: 'Stock camera', sku: 'CAM-001', modelNumber: 'CAM-1', stockQuantity: 10, isActive: true, images: [], standardPrice: 100, dealerPrice: 90 };
  const requests = [];
  await page.route('**/api/admin/products**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/stock')) { const body = route.request().postDataJSON(); requests.push(body); product.stockQuantity += body.operation === 'remove' ? -body.quantity : body.quantity; return route.fulfill({ json: { success: true, data: product } }); }
    if (path.endsWith(product._id)) return route.fulfill({ json: { success: true, data: product } });
    return route.fulfill({ json: { success: true, data: { products: [product], pagination: { page: 1, total: 1, totalPages: 1 } } } });
  });
  await page.goto('/admin/products');
  await page.getByRole('button', { name: 'Update stock for Stock camera' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('radio', { name: 'Remove stock', exact: true }).check();
  await dialog.getByLabel('Units to remove', { exact: true }).fill('11');
  await expect(dialog.getByRole('alert')).toContainText('Only 10 units');
  await expect(dialog.getByRole('button', { name: 'Remove Stock', exact: true })).toBeDisabled();
  await dialog.getByLabel('Units to remove', { exact: true }).fill('3');
  await expect(dialog.getByText('10 current − 3 removed = 7 total')).toBeVisible();
  await dialog.getByRole('button', { name: 'Remove Stock', exact: true }).click();
  await expect(dialog).toHaveCount(0); expect(product.stockQuantity).toBe(7);
  await page.getByRole('button', { name: 'Update stock for Stock camera' }).click();
  await dialog.getByLabel('Units to add', { exact: true }).fill('5');
  await expect(dialog.getByText('7 current + 5 added = 12 total')).toBeVisible();
  await dialog.getByRole('button', { name: 'Add Stock', exact: true }).click();
  await expect(dialog).toHaveCount(0); expect(product.stockQuantity).toBe(12);
  expect(requests).toEqual([{ quantity: 3, operation: 'remove' }, { quantity: 5, operation: 'add' }]);
});

test('POS displays the original subtotal and discount separately from GST and total', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin'); await page.goto('/admin/pos');
  await page.getByRole('button', { name: /E2E Product E2E-001/ }).click();
  await page.getByLabel('E2E Product quantity', { exact: true }).fill('2');
  await page.getByLabel('Unit price (₹)', { exact: true }).fill('2900');
  await page.getByLabel('Discount (%)', { exact: true }).fill('20');
  const breakdown = page.locator('dl').first();
  await expect(breakdown).toContainText('Item subtotal (incl. GST)₹5,800.00');
  await expect(breakdown).toContainText('Discount−₹1,160.00');
  await expect(breakdown).toContainText('Taxable amount after discount₹3,932.20');
  await expect(breakdown).toContainText('Total₹4,640.00');
});
