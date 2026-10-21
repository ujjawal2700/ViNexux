import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';
const id = '507f1f77bcf86cd799439011';
const templateId = '507f1f77bcf86cd799439022';
const cameraTemplate = { _id: templateId, name: 'PoE Camera', description: 'Bullet and dome cameras', revision: 0, specifications: [{ key: 'Resolution', value: '4 MP' }, { key: 'Power', value: 'PoE' }] };
async function setup(page, initial = []) {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  let templates = structuredClone(initial); const updates = []; let creates = 0;
  const product = { _id: id, name: 'Existing Camera', sku: 'CAM-1', modelNumber: '', brandId: null, stockQuantity: 20, isActive: true, images: [{ url: 'https://cdn.example.test/camera.webp', publicId: 'camera' }], specifications: [{ key: 'Resolution', value: '8 MP' }] };
  await page.route(`**/api/admin/products/${id}`, route => {
    if (route.request().method() === 'PUT') { const body = route.request().postDataJSON(); updates.push(body); Object.assign(product, body); }
    return route.fulfill({ json: { success: true, data: product } });
  });
  await page.route('**/api/admin/products/specification-templates**', route => {
    const url = new URL(route.request().url()); const method = route.request().method();
    if (method === 'GET') {
      const search = (url.searchParams.get('search') || '').toLowerCase();
      return route.fulfill({ json: { success: true, data: { templates: templates.filter(row => `${row.name} ${row.description}`.toLowerCase().includes(search)), pagination: { page: 1, totalPages: 1 } } } });
    }
    if (method === 'POST') { const row = { _id: `${templateId.slice(0, -1)}${++creates}`, revision: 0, ...route.request().postDataJSON() }; templates.push(row); return route.fulfill({ status: 201, json: { success: true, data: { template: row } } }); }
    const selected = templates.find(row => row._id === url.pathname.split('/').at(-1));
    if (method === 'PUT') { Object.assign(selected, route.request().postDataJSON(), { revision: selected.revision + 1 }); return route.fulfill({ json: { success: true, data: { template: selected } } }); }
    templates = templates.filter(row => row !== selected); return route.fulfill({ json: { success: true, data: { deleted: true } } });
  });
  return { product, updates, templates: () => templates };
}
async function openSpecs(page, path = `/admin/products/${id}`) {
  await page.goto(path); await page.getByRole('button', { name: /^Specifications Technical/ }).click();
  return page.getByRole('region', { name: 'Specification templates', exact: true });
}

test('admin creates a reusable template, searches it, applies it, edits a copied value and saves the product', async ({ page }) => {
  const state = await setup(page);
  const templates = await openSpecs(page);
  await templates.getByRole('button', { name: 'New template', exact: true }).click();
  const editor = templates.getByRole('region', { name: 'Template editor' });
  await editor.getByRole('button', { name: 'Save template', exact: true }).click();
  await expect(editor.getByLabel('Template name', { exact: true })).toBeFocused();
  await editor.getByLabel('Template name', { exact: true }).fill('PoE Camera');
  await editor.getByLabel('Template specification 1 name', { exact: true }).fill('Resolution');
  await editor.getByLabel('Template specification 1 value', { exact: true }).fill('4 MP');
  await editor.getByRole('button', { name: 'Add template specification' }).click();
  await editor.getByLabel('Template specification 2 name', { exact: true }).fill('Power');
  await editor.getByLabel('Template specification 2 value', { exact: true }).fill('PoE');
  await editor.getByRole('button', { name: 'Save template', exact: true }).click();
  await expect(editor).toHaveCount(0);
  expect(state.updates).toHaveLength(0);
  await templates.getByLabel('Search specification templates', { exact: true }).fill('Camera');
  await templates.getByRole('button', { name: 'Apply PoE Camera', exact: true }).click();
  await expect(page.getByLabel('Specification 1 value', { exact: true })).toHaveValue('8 MP');
  await page.getByLabel('Specification 2 value', { exact: true }).fill('12V');
  await page.getByRole('button', { name: 'Save & Publish', exact: true }).click();
  await expect.poll(() => state.updates).toEqual([{ specifications: [{ key: 'Resolution', value: '8 MP' }, { key: 'Power', value: '12V' }] }]);
  expect(state.templates()[0].specifications[1].value).toBe('PoE');
  await page.reload(); await page.getByRole('button', { name: /^Specifications Technical/ }).click();
  await expect(page.getByLabel('Specification 2 value', { exact: true })).toHaveValue('12V');
});

test('templates work on new products and can be edited/deleted without changing previously saved product specifications', async ({ page }) => {
  const state = await setup(page, [cameraTemplate, { ...cameraTemplate, _id: '507f1f77bcf86cd799439033', name: '12V Adapter', specifications: [{ key: 'Voltage', value: '12V' }] }]);
  let templates = await openSpecs(page, '/admin/products/new');
  await templates.getByLabel('Search specification templates', { exact: true }).fill('Adapter');
  await expect(templates.getByRole('button', { name: 'Apply PoE Camera', exact: true })).toHaveCount(0);
  await templates.getByRole('button', { name: 'Apply 12V Adapter', exact: true }).click();
  await expect(page.getByLabel('Specification 1 value', { exact: true })).toHaveValue('12V');
  await templates.getByRole('button', { name: 'Undo template application' }).click();
  await expect(page.getByLabel('Specification 1 value', { exact: true })).toHaveCount(0);
  templates = await openSpecs(page);
  await templates.getByRole('button', { name: 'Edit PoE Camera', exact: true }).click();
  const editor = templates.getByRole('region', { name: 'Template editor' });
  await editor.getByLabel('Template specification 1 value', { exact: true }).fill('5 MP');
  await editor.getByRole('button', { name: 'Save template', exact: true }).click();
  await expect(editor).toHaveCount(0);
  expect(state.product.specifications).toEqual([{ key: 'Resolution', value: '8 MP' }]);
  await templates.getByRole('button', { name: 'Delete PoE Camera', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete template', exact: true }).click();
  await expect(templates.getByRole('button', { name: 'Apply PoE Camera', exact: true })).toHaveCount(0);
  expect(state.product.specifications).toEqual([{ key: 'Resolution', value: '8 MP' }]);
});

test('an existing product can become a template and product share metadata includes basic specs', async ({ page }) => {
  const state = await setup(page);
  const templates = await openSpecs(page);
  await templates.getByRole('button', { name: 'Save current specs as template' }).click();
  const editor = templates.getByRole('region', { name: 'Template editor' });
  await expect(editor.getByLabel('Template specification 1 value', { exact: true })).toHaveValue('8 MP');
  await editor.getByLabel('Template name', { exact: true }).fill('8MP Outdoor');
  await editor.getByRole('button', { name: 'Save template', exact: true }).click();
  await expect.poll(() => state.templates().map(row => row.name)).toEqual(['8MP Outdoor']);
  await page.route(`**/api/products/${id}`, route => route.fulfill({ json: { success: true, data: state.product } }));
  await page.goto(`/products/${id}`);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /Existing Camera/);
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', 'Resolution: 8 MP');
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute('content', 'Existing Camera');
});
