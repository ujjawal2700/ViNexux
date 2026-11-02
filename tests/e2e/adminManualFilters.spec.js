import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';
const id = '507f1f77bcf86cd799439011', small = '507f1f77bcf86cd799439012';
const product = { _id: '507f1f77bcf86cd799439013', name: '64 GB Card', sku: 'CARD-64', isActive: true, images: [] };

test('admin creates a capacity filter, selects products, saves and reopens its assignments', async ({ page }, testInfo) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  let saved = null, payload;
  await page.route('**/api/admin/filters**', route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (path.endsWith('/products')) return route.fulfill({ json: { success: true, data: { products: [product], pagination: { page: 1, total: 1, totalPages: 1 } } } });
    if (request.method() === 'POST' || request.method() === 'PUT') {
      payload = request.postDataJSON(); saved = { ...payload, _id: id, options: payload.options.map((option, index) => ({ _id: option.id || String(index + 18).padStart(24, '0'), label: option.label, products: option.productIds.includes(product._id) ? [product] : [] })) };
    }
    if (request.method() === 'DELETE') { saved = null; return route.fulfill({ json: { success: true, data: { deleted: true } } }); }
    return route.fulfill({ json: { success: true, data: path === '/api/admin/filters' && request.method() === 'GET' ? { filters: saved ? [saved] : [] } : saved } });
  });
  await page.goto('/admin/filters');
  await expect(page.getByRole('heading', { name: 'Filters', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'New Filter', exact: true }).click();
  await page.getByLabel('Filter name', { exact: true }).fill('Capacity');
  await page.getByLabel('Option 1 label').fill('64 GB');
  await page.getByRole('button', { name: 'Assign products to 64 GB', exact: true }).click();
  const picker = page.getByRole('dialog', { name: 'Assign products to 64 GB', exact: true });
  await picker.getByRole('checkbox', { name: 'Assign 64 GB Card', exact: true }).check();
  await picker.getByRole('button', { name: 'Done · 1 selected', exact: true }).click();
  await page.getByRole('button', { name: 'Add Option', exact: true }).click();
  await page.getByLabel('Option 2 label').fill('128 GB');
  await page.getByRole('button', { name: 'Save Filter', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Filter saved.');
  expect(payload).toMatchObject({ name: 'Capacity', type: 'checkbox', options: [{ label: '64 GB', productIds: [product._id] }, { label: '128 GB', productIds: [] }] });
  await page.reload();
  await page.getByRole('region', { name: 'Saved filters' }).getByRole('button', { name: 'Edit filter Capacity', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Filter options' })).toContainText('1 product assigned');
  await page.screenshot({ path: testInfo.outputPath('filter-manager.png'), fullPage: true });
  await page.getByLabel('Filter display type').selectOption('select');
  await page.getByRole('button', { name: 'Save Filter', exact: true }).click();
  await expect.poll(() => payload.type).toBe('select');
  await page.getByRole('button', { name: 'Delete filter Capacity', exact: true }).click();
  await page.getByRole('dialog', { name: 'Delete Filter', exact: true }).getByRole('button', { name: 'Delete Filter', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Filter deleted.');
});

for (const width of [1440, 390]) test(`filter library and editor stay manageable with many filters and options at ${width}px`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
  await mockApi(page); await seedBrowserSession(page, 'admin');
  const filters = Array.from({ length: 40 }, (_, index) => ({
    _id: String(index + 100).padStart(24, '0'), name: index === 0 ? 'Capacity' : `Filter ${String(index).padStart(2, '0')}`,
    type: ['checkbox', 'radio', 'select'][index % 3], isActive: index % 2 === 0, sortOrder: index,
    options: Array.from({ length: index === 0 ? 40 : 3 }, (_, optionIndex) => ({ _id: String(index * 100 + optionIndex + 1000).padStart(24, '0'), label: index === 0 ? `${(optionIndex + 1) * 64} GB` : `Choice ${index}-${optionIndex}`, productCount: 12, products: [] })),
  }));
  await page.route('**/api/admin/filters**', route => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill({ json: { success: true, data: path === '/api/admin/filters' ? { filters } : filters.find(filter => path.endsWith(filter._id)) } });
  });
  await page.goto('/admin/filters');
  const library = page.getByRole('region', { name: 'Saved filters' });
  await expect(library.getByRole('article')).toHaveCount(12);
  await expect(library).toContainText('40 items');
  await page.screenshot({ path: testInfo.outputPath(`filter-library-${width}.png`), fullPage: true });
  await library.getByRole('button', { name: 'Next Page', exact: true }).click();
  await expect(library.getByRole('button', { name: 'Edit filter Filter 12', exact: true })).toBeVisible();
  await page.getByLabel('Search filters', { exact: true }).fill('2560 GB');
  await expect(library.getByRole('article')).toHaveCount(1);
  await expect(library.getByRole('button', { name: 'Edit filter Capacity', exact: true })).toBeVisible();
  await page.getByLabel('Filter visibility').selectOption('hidden');
  await expect(page.getByRole('heading', { name: 'No matching filters' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear search and visibility', exact: true }).click();
  await page.getByLabel('Filter visibility').selectOption('hidden');
  await expect(library.getByRole('article')).toHaveCount(12);
  await expect(library.getByRole('button', { name: 'Edit filter Capacity', exact: true })).toHaveCount(0);
  await page.getByLabel('Filter visibility').selectOption('all');
  await page.getByLabel('Sort filters').selectOption('options');
  await expect(library.getByRole('article').first()).toHaveAccessibleName('Filter Capacity');
  await library.getByRole('button', { name: 'Edit filter Capacity', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Filter options' }).getByRole('textbox')).toHaveCount(41);
  await page.getByLabel('Find an option', { exact: true }).fill('2560');
  await expect(page.getByLabel('Option 40 label', { exact: true })).toHaveValue('2560 GB');
  await expect(page.getByLabel('Option 1 label', { exact: true })).toHaveCount(0);
  await page.getByLabel('Option 40 label', { exact: true }).fill('2 TB');
  await expect(page.getByLabel('Option 40 label', { exact: true })).toBeFocused();
  await expect(page.getByLabel('Option 40 label', { exact: true })).toHaveValue('2 TB');
  await page.getByLabel('Find an option', { exact: true }).fill('');
  await page.screenshot({ path: testInfo.outputPath(`filter-editor-${width}.png`), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Add Option', exact: true }).click();
  await expect(page.getByLabel('Option 41 label', { exact: true })).toBeFocused();
  await page.getByLabel('Option 41 label', { exact: true }).fill('4 TB');
  await page.getByLabel('Filter name', { exact: true }).fill('Storage capacity');
  await page.getByRole('button', { name: 'Back to filters', exact: true }).click();
  const discard = page.getByRole('dialog', { name: 'Discard unsaved changes?', exact: true });
  await discard.getByRole('button', { name: 'Keep editing', exact: true }).click();
  await expect(page.getByLabel('Filter name', { exact: true })).toHaveValue('Storage capacity');
  await page.getByRole('button', { name: 'Back to filters', exact: true }).click();
  await discard.getByRole('button', { name: 'Discard changes', exact: true }).click();
  await expect(library).toBeVisible();
});

test('product form keeps specifications but removes category-specific filter fields', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  const category = { _id: id, name: 'Storage', slug: 'storage', parentId: null, filterDefinitions: [{ key: 'Capacity', label: 'Legacy Capacity', isRequired: true, inputType: 'select', options: ['64 GB'] }] };
  await page.route('**/api/admin/categories**', route => route.fulfill({ json: { success: true, data: { categories: [category] } } }));
  await page.route(`**/api/admin/products/${product._id}`, route => route.fulfill({ json: { success: true, data: { ...product, categoryId: category, categoryIds: [category], specifications: [{ key: 'Capacity', value: '64 GB' }] } } }));
  await page.goto(`/admin/products/${product._id}`);
  await page.getByRole('button', { name: /^Specifications/ }).click();
  await expect(page.getByRole('heading', { name: 'Category-Specific Specifications', exact: true })).toHaveCount(0);
  await expect(page.getByText('Technical Specifications (1)', { exact: true })).toBeVisible();
  await expect(page.locator('#field-spec-row-0 input').first()).toHaveValue('Capacity');
});
