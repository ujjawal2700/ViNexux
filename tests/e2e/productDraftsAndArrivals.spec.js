import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';
const id = '507f1f77bcf86cd799439011';

test('admin can create a completely empty draft and reopen it without generated identifiers in the fields', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  let saved; const writes = [];
  await page.route('**/api/admin/products**', route => {
    const req = route.request();
    if (req.method() === 'POST') {
      saved = { ...req.postDataJSON(), _id: id, sku: `__DRAFT__${id}`, modelNumber: `__DRAFT__${id}` };
      writes.push(req.postDataJSON());
    }
    if (req.method() === 'PUT') { Object.assign(saved, req.postDataJSON()); writes.push(req.postDataJSON()); }
    return route.fulfill({ json: { success: true, data: saved || {} } });
  });
  await page.goto('/admin/products/new');
  await page.getByRole('button', { name: 'Save Draft', exact: true }).first().click();
  await expect.poll(() => writes.length).toBe(2);
  expect(writes.every(body => body.isActive === false)).toBe(true);
  expect(writes[0]).toMatchObject({ name: '', sku: '', modelNumber: '', brandId: null, images: [], categoryId: null });
  // Simulate the private identifiers supplied by the real persistence layer.
  saved.sku = `__DRAFT__${id}`; saved.modelNumber = `__DRAFT__${id}`;
  await page.goto(`/admin/products/${id}`);
  await expect(page.locator('#field-name input')).toHaveValue('');
  await expect(page.locator('#field-sku input')).toHaveValue('');
  await expect(page.locator('#field-modelNumber input')).toHaveValue('');
  await page.getByRole('button', { name: 'Save & Publish', exact: true }).click();
  await expect(page.locator('#field-name')).toContainText('Product Title is required.');
  expect(writes).toHaveLength(2);
});

test('admin can save an existing product as an incomplete draft', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  const product = { _id: id, name: 'Camera', sku: 'CAM-1', modelNumber: 'CAM-1', isActive: true, images: [] };
  let update;
  await page.route(`**/api/admin/products/${id}`, route => {
    if (route.request().method() === 'PUT') { update = route.request().postDataJSON(); Object.assign(product, update); }
    return route.fulfill({ json: { success: true, data: product } });
  });
  await page.goto(`/admin/products/${id}`);
  await page.locator('#field-name input').fill('');
  await page.getByRole('button', { name: 'Save Draft', exact: true }).first().click();
  await expect.poll(() => update).toEqual({ name: '', isActive: false });
  await page.reload();
  await expect(page.locator('#field-name input')).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Save Draft', exact: true }).first()).toBeVisible();
});

test('new arrival checkbox saves immediately and survives catalog reload', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  const product = { _id: id, name: 'Selected Camera', sku: 'CAM-1', isActive: true, images: [] };
  const updates = [];
  await page.route('**/api/admin/products**', route => {
    if (route.request().method() === 'PUT') {
      updates.push(route.request().postDataJSON()); Object.assign(product, updates.at(-1));
      return route.fulfill({ json: { success: true, data: product } });
    }
    return route.fulfill({ json: { success: true, data: { products: [product], pagination: { page: 1, total: 1, totalPages: 1 } } } });
  });
  await page.goto('/admin/products');
  const checkbox = page.getByRole('checkbox', { name: 'New arrival: Selected Camera', exact: true });
  await checkbox.check();
  await expect.poll(() => updates).toEqual([{ isNewArrival: true }]);
  await page.reload(); await expect(checkbox).toBeChecked();
  await checkbox.uncheck();
  await expect.poll(() => product.isNewArrival).toBe(false);
});

test('New Arrivals loads all selected pages, excludes automatic additions and auto slides', async ({ page }) => {
  await page.clock.install(); await mockApi(page); await seedBrowserSession(page, 'storefront');
  const selected = Array.from({ length: 101 }, (_, index) => ({ _id: String(index + 1).padStart(24, '0'), name: `Selected Product ${index + 1}`, modelNumber: `MODEL-${index + 1}`, standardPrice: 1500, stockQuantity: 10, isActive: true, isNewArrival: true, images: [] }));
  const pages = [];
  await page.route('**/api/products?*', route => {
    const query = new URL(route.request().url()).searchParams;
    const isArrival = query.get('isNewArrival') === 'true';
    const current = Number(query.get('page') || 1);
    if (isArrival) pages.push(current);
    return route.fulfill({ json: { success: true, data: {
      products: isArrival ? selected.slice((current - 1) * 100, current * 100) : [],
      pagination: { total: isArrival ? 101 : 0, totalPages: isArrival ? 2 : 0 },
    } } });
  });
  await page.goto('/');
  const section = page.getByRole('region', { name: 'New arrival products', exact: true });
  await expect(section.getByRole('heading', { name: 'New Arrivals', exact: true })).toBeVisible();
  await expect(section.locator('.trending-group').first().locator('.theme-product-card')).toHaveCount(101);
  expect([...new Set(pages)]).toEqual([1, 2]);
  await expect(section.locator('.trending-group').first().locator('.theme-product-card').last().getByRole('heading')).toHaveText('Selected Product 101');
  const firstCard = section.locator('.trending-group').first().locator('.theme-product-card').first();
  await expect(firstCard).toContainText('Model Number: MODEL-1');
  await expect(firstCard).toContainText('₹1,500');
  await expect(firstCard).toContainText('In Stock');
  await expect(firstCard.getByRole('button', { name: 'Add to cart', exact: true })).toBeEnabled();
  await expect(section.locator('.trending-caption')).toHaveCount(0);
  const track = section.locator('.trending-track');
  await page.mouse.move(0, 0); await page.clock.runFor(100);
  const start = await track.evaluate(el => el.scrollLeft);
  await page.clock.runFor(700);
  expect(await track.evaluate(el => el.scrollLeft)).toBeGreaterThan(start);
  await track.focus();
  const paused = await track.evaluate(el => el.scrollLeft);
  await page.clock.runFor(300);
  expect(await track.evaluate(el => el.scrollLeft)).toBe(paused);
});

test('New Arrivals stays empty when no products are selected', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'storefront');
  await page.route('**/api/products?*', route => {
    const query = new URL(route.request().url()).searchParams;
    const selectedSection = query.has('isTrending') || query.has('isNewArrival');
    return route.fulfill({ json: { success: true, data: { products: selectedSection ? [] : [{ _id: id, name: 'Newest unselected product', images: [] }], pagination: { totalPages: 1 } } } });
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'All Products', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'New arrival products', exact: true })).toHaveCount(0);
});
