import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';
const id = number => number.toString(16).padStart(24, '0');
const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="white"/><rect x="8" y="8" width="8" height="8"/></svg>');
const camera = (number, fields = {}) => ({ _id: id(number), name: `Camera ${number}`, sku: `CAM-${number}`, modelNumber: `MODEL-${number}`, isActive: true, stockQuantity: 10, standardPrice: 100, dealerPrice: 90, images: [], specifications: [], ...fields });
async function preferences(page) {
  await page.addInitScript(() => localStorage.setItem('vinexus_storage_choices_v1', JSON.stringify({ preferences: true })));
}
test('admin reorders technical specifications by dragging and keyboard buttons; saved order reaches the storefront', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  const product = camera(1, { specifications: [{ key: 'Resolution', value: '4 MP' }, { key: 'Power', value: 'PoE' }, { key: 'Brand', value: 'Acme' }], brandId: { _id: id(99), name: 'Acme' } });
  await page.route(`**/api/admin/products/${id(1)}`, async route => {
    if (route.request().method() === 'PUT') Object.assign(product, route.request().postDataJSON());
    await route.fulfill({ json: { success: true, data: product } });
  });
  await page.route(`**/api/products/${id(1)}`, route => route.fulfill({ json: { success: true, data: product } }));
  await page.goto(`/admin/products/${id(1)}`);
  await page.getByRole('button', { name: /^Specifications Technical/ }).click();
  const order = page.getByRole('region', { name: 'Specification display order' });
  await order.getByRole('listitem', { name: 'Brand: Acme' }).dragTo(order.getByRole('listitem', { name: 'Resolution: 4 MP' }));
  await expect(order.getByRole('listitem').first()).toHaveAttribute('draggable', 'true');
  await expect(order.getByRole('listitem').first()).toContainText('Brand');
  await order.getByRole('button', { name: 'Move Power up' }).click();
  await page.getByRole('button', { name: 'Save & Publish', exact: true }).click();
  await expect.poll(() => product.specifications.map(spec => spec.key)).toEqual(['Brand', 'Power', 'Resolution']);
  await page.reload(); await page.getByRole('button', { name: /^Specifications Technical/ }).click();
  await expect(order.getByRole('listitem').nth(1)).toContainText('Power');
  await page.goto(`/products/${id(1)}`);
  await expect(page.locator('section').filter({ has: page.getByRole('heading', { name: 'Specifications', exact: true }) }).locator('tbody tr td:first-child')).toHaveText(['Brand', 'Power', 'Resolution']);
});
test('related products include sibling categories under the header and expose every results page', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'storefront');
  const categories = [{ _id: id(90), name: 'IP Cameras', slug: 'ip-cameras', parentId: null }, { _id: id(91), name: 'WiFi', slug: 'wifi', parentId: id(90) }, { _id: id(92), name: 'Dome', slug: 'dome', parentId: id(90) }];
  const product = camera(1, { categoryId: categories[1] }); const requested = [];
  await page.route('**/api/categories**', route => route.fulfill({ json: { success: true, data: { categories, categoryTree: categories } } }));
  await page.route('**/api/products**', route => {
    const url = new URL(route.request().url());
    if (url.pathname === `/api/products/${id(1)}`) return route.fulfill({ json: { success: true, data: product } });
    if (url.pathname !== '/api/products' || !url.searchParams.has('categoryId')) return route.fallback();
    requested.push(url.searchParams.get('categoryId'));
    const pageNumber = Number(url.searchParams.get('page'));
    const rows = pageNumber === 1 ? [product, ...Array.from({ length: 11 }, (_, index) => camera(index + 2, { categoryId: categories[1] }))] : [camera(13, { categoryId: categories[2] })];
    return route.fulfill({ json: { success: true, data: { products: rows, pagination: { page: pageNumber, totalPages: 2 } } } });
  });
  await page.goto(`/products/${id(1)}`);
  const related = page.getByRole('region', { name: 'Related products', exact: true });
  await expect(related.getByRole('heading', { level: 3 })).toHaveCount(11);
  await related.getByRole('button', { name: 'Show more related products' }).click();
  await expect(related.getByRole('heading', { level: 3 })).toHaveCount(12);
  await expect(related.getByRole('heading', { name: 'Camera 13', exact: true })).toBeVisible();
  await expect(related.getByRole('link', { name: 'Show all in IP Cameras' })).toHaveAttribute('href', '/ip-cameras');
  expect(requested.every(value => value === id(90))).toBe(true);
});
test('recently viewed products keep visit order, fetch current data, and persist ten IDs only', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'storefront'); await preferences(page);
  await page.addInitScript(ids => { if (!localStorage.getItem('vinexus_recently_viewed')) localStorage.setItem('vinexus_recently_viewed', JSON.stringify(ids)); }, Array.from({ length: 10 }, (_, index) => id(10 - index)));
  await page.route(/\/api\/products\/[a-f\d]{24}$/, route => {
    const value = parseInt(new URL(route.request().url()).pathname.split('/').at(-1), 16);
    return route.fulfill({ json: { success: true, data: camera(value) } });
  });
  await page.goto(`/products/${id(11)}`);
  const recent = page.getByRole('region', { name: 'Recently viewed products' });
  await expect(recent.getByRole('heading', { level: 3 })).toHaveText(Array.from({ length: 10 }, (_, index) => `Camera ${10 - index}`));
  await page.goto(`/products/${id(12)}`);
  await expect(recent.getByRole('heading', { level: 3 }).first()).toHaveText('Camera 11');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vinexus_recently_viewed')))).toEqual(Array.from({ length: 10 }, (_, index) => id(12 - index)));
});
for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) test(`Enter submits search and six recent queries are reusable at ${viewport.width}px`, async ({ page }) => {
  await page.setViewportSize(viewport); await mockApi(page); await seedBrowserSession(page, 'storefront'); await preferences(page);
  await page.goto('/search?search=old&page=4');
  const input = page.locator('input[aria-label="Search products"]:visible').first();
  for (const query of ['Camera', 'NVR', 'Switch', 'Router', 'SSD', 'RAM', 'WiFi']) {
    await input.fill(query); await input.press('Enter');
    await expect.poll(() => new URL(page.url()).searchParams.get('search')).toBe(query);
    expect(new URL(page.url()).searchParams.has('page')).toBe(false);
  }
  await input.fill(''); await page.getByRole('button', { name: viewport.width < 640 ? 'Search products' : 'Search', exact: true }).click();
  const history = page.getByRole('region', { name: 'Recent searches' }).filter({ visible: true });
  await expect(history.getByRole('button')).toHaveText(['WiFi', 'RAM', 'SSD', 'Router', 'Switch', 'NVR']);
  await history.getByRole('button', { name: 'Router', exact: true }).focus(); await page.keyboard.press('Enter');
  await expect.poll(() => new URL(page.url()).searchParams.get('search')).toBe('Router');
  await page.reload(); await input.click();
  await expect(history.getByRole('button').first()).toHaveText('Router');
});
test('footer-only employees can upload an SVG QR without shared upload permission', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  const employee = { _id: id(50), role: 'admin', isEmployee: true, accessRoleActive: true, permissions: { 'footer-content': { read: true, write: true } } };
  await page.route('**/api/auth/refresh-token', route => route.fulfill({ json: { success: true, data: { user: employee, accessToken: 'employee-token', refreshToken: 'employee-refresh' } } }));
  await page.route('**/api/admin/access/self', route => route.fulfill({ json: { success: true, data: { access: employee } } }));
  await page.route('**/api/admin/cms/footer-content', route => route.fulfill({ json: { success: true, data: { footer: { bankAccounts: [{ accountName: 'Company', bankName: 'Bank', qrCodeUrl: '' }] } } } }));
  let uploaded = false;
  await page.route('**/api/admin/cms/footer-content/images/bank-qr', route => {
    expect(route.request().headers()['content-type']).toMatch(/^multipart\/form-data/); uploaded = true;
    return route.fulfill({ json: { success: true, data: { url: 'https://example.com/qr.webp', publicId: 'vinexus/bank-qr/test' } } });
  });
  await page.goto('/admin/cms/footer-content');
  await page.getByLabel('Upload bank QR image 1').setInputFiles({ name: 'qr.svg', mimeType: 'image/svg+xml', buffer: svg });
  await expect(page.getByRole('img', { name: 'Bank QR Code' })).toHaveAttribute('src', 'https://example.com/qr.webp');
  expect(uploaded).toBe(true);
});
