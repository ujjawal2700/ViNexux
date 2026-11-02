import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';
const id = number => number.toString(16).padStart(24, '0');
const categories = [
  { _id: id(1), name: 'CCTV', slug: 'cctv', parentId: null },
  { _id: id(2), name: 'Networking', slug: 'networking', parentId: null },
  { _id: id(3), name: 'IP Cameras', slug: 'ip-cameras', parentId: id(1) },
  { _id: id(4), name: 'Switches', slug: 'switches', parentId: id(2) },
  { _id: id(5), name: 'Bullet', slug: 'bullet', parentId: id(3) },
  { _id: id(6), name: 'Dome', slug: 'dome', parentId: id(3) },
  { _id: id(7), name: 'PoE Switches', slug: 'poe-switches', parentId: id(4) },
];
const camera = (number, name, category, brand, resolution, power) => ({ _id: id(number), name, sku: `SKU-${number}`, modelNumber: `MODEL-${number}`, categoryId: category, isActive: true, stockQuantity: 10, standardPrice: 100, images: [], specifications: [{ key: 'Brand', value: brand }, ...(resolution ? [{ key: 'Resolution', value: resolution }] : []), { key: 'Power', value: power }] });
const products = [camera(20, 'Camera Bullet', id(5), 'ACME', '4 MP', 'PoE'), camera(21, 'Camera Dome 8MP', id(6), 'ACME', '8 MP', 'PoE'), camera(22, 'Camera Dome 4MP', id(6), 'BETA', '4 MP', '12V'), camera(23, 'Camera Network Switch', id(7), 'BETA', '', 'PoE')];
const ancestry = product => {
  const result = []; let current = categories.find(category => category._id === product.categoryId);
  while (current) { result.push(current._id, current.slug); current = categories.find(category => category._id === current.parentId); }
  return result;
};
const checkbox = (page, name) => page.getByRole('checkbox', { name, exact: true }).filter({ visible: true });
async function select(page, name, checked = true) {
  const input = checkbox(page, name);
  if (await input.isChecked() !== checked) await input.click();
  if (checked) await expect(input).toBeChecked(); else await expect(input).not.toBeChecked();
}
const capacity = id(400), small = id(401), large = id(402), connectivity = id(410), usb = id(411), wireless = id(412);
const assigned = { [small]: [id(20), id(22)], [large]: [id(21)], [usb]: [id(20), id(21)], [wireless]: [id(22), id(23)] };
async function setup(page, rows = products, transformFacets = facets => facets) {
  await mockApi(page); await seedBrowserSession(page, 'storefront'); const calls = [];
  await page.route('**/api/categories**', route => route.fulfill({ json: { success: true, data: { categories, categoryTree: categories } } }));
  await page.route('**/api/products?**', route => {
    const params = new URL(route.request().url()).searchParams;
    // Header suggestions share this endpoint; record paginated catalog requests only.
    if (params.has('page')) calls.push(Object.fromEntries(params));
    const selected = JSON.parse(params.get('customFilters') || '{}');
    const resolvedBrand = rows.map(product => product.specifications[0].value).find(name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === params.get('brandSlug')) || null;
    const context = rows.filter(product => !params.get('search') || product.name.toLowerCase().includes(params.get('search').toLowerCase()));
    const filtered = context.filter(product => {
      for (const key of ['headerCategory', 'mainCategory', 'subCategory', 'categoryId', 'category']) if (params.get(key) && !params.get(key).split(',').some(value => ancestry(product).includes(value))) return false;
      if (params.get('brand') && !params.get('brand').split(',').includes(product.specifications[0].value)) return false;
      if (params.get('brandSlug') && !params.get('brand') && product.specifications[0].value !== resolvedBrand) return false;
      return Object.values(selected).every(options => options.some(option => (assigned[option] || []).includes(product.assignmentId || product._id)));
    });
    const count = option => context.filter(product => (assigned[option] || []).includes(product.assignmentId || product._id)).length;
    const facets = {
      categories: categories.map(category => ({ ...category, count: context.filter(product => ancestry(product).includes(category._id)).length })),
      brands: [...new Set(context.map(product => product.specifications[0].value))].map(name => ({ name, count: 1 })),
      // Legacy API data must never create automatic storefront groups.
      specs: [{ key: 'Resolution', label: 'Resolution', values: [{ val: '4 MP', count: 3 }] }, { key: 'Unconfigured', label: 'Unconfigured', values: [{ val: 'Automatic', count: 1 }] }],
      availability: [{ status: 'in-stock', count: context.length }],
      customFilters: [
        { _id: capacity, name: 'Capacity', type: 'checkbox', options: [{ _id: small, label: '64 GB', count: count(small) }, { _id: large, label: '128 GB', count: count(large) }] },
        { _id: connectivity, name: 'Connection', type: 'select', options: [{ _id: usb, label: 'USB', count: count(usb) }, { _id: wireless, label: 'Wireless', count: count(wireless) }] },
      ],
    };
    const pageNumber = Number(params.get('page') || 1), limit = Number(params.get('limit') || 28);
    return route.fulfill({ json: { success: true, data: { resolvedBrand, products: filtered.slice((pageNumber - 1) * limit, pageNumber * limit), pagination: { page: pageNumber, limit, total: filtered.length, totalPages: Math.ceil(filtered.length / limit) }, ...(params.get('includeFacets') === 'false' ? {} : { facets: transformFacets(facets) }) } } });
  }); return calls;
}
const names = page => page.locator('main').getByRole('heading', { level: 3 });

for (const mobile of [false, true]) test(`${mobile ? 'mobile' : 'desktop'} editing and repeating a header search clears every selected filter`, async ({ page }) => {
  if (mobile) await page.setViewportSize({ width: 390, height: 844 });
  const calls = await setup(page);
  const filteredUrl = '/search?' + new URLSearchParams({ search: 'Camera', brand: 'ACME', headerCategory: id(1), mainCategory: id(3), subCategory: id(5), customFilters: JSON.stringify({ [capacity]: [small], [connectivity]: [usb] }), specs: '{}', availability: 'in-stock', minPrice: '1', maxPrice: '1000', page: '1' });
  const input = page.locator('input[aria-label="Search products"]:visible').first();
  const assertCleared = async search => {
    await expect.poll(() => Object.fromEntries(new URL(page.url()).searchParams)).toEqual({ search });
    await expect(names(page)).toHaveCount(search === 'Dome' ? 2 : 4);
    expect(calls.at(-1).brand).toBeUndefined();
    expect(calls.at(-1).headerCategory).toBeUndefined();
    expect(calls.at(-1).mainCategory).toBeUndefined();
    expect(calls.at(-1).customFilters).toBeUndefined();
    if (mobile) await page.getByRole('button', { name: 'Filters', exact: true }).click();
    for (const label of ['Brand: ACME', 'Categories: CCTV', 'Main categories: IP Cameras', 'Capacity: 64 GB']) await expect(checkbox(page, label)).not.toBeChecked();
    await expect(page.getByRole('combobox', { name: 'Connection', exact: true }).filter({ visible: true })).toHaveValue('');
    if (mobile) await page.getByRole('button', { name: 'Close drawer', exact: true }).click();
  };
  await page.goto(filteredUrl); await expect(names(page)).toHaveCount(1);
  // Repeating the same query via the button must clear filters without an input edit.
  await expect(input).toHaveValue('Camera');
  await page.getByRole('button', { name: mobile ? 'Search products' : 'Search', exact: true }).click();
  await assertCleared('Camera');
  await page.goto(filteredUrl); await expect(names(page)).toHaveCount(1);
  await input.fill('Dome');
  // Editing clears selections before the new query is submitted.
  await assertCleared('Camera');
  await input.press('Enter'); await assertCleared('Dome');
  // Selections remain usable and persist until the next header search.
  if (mobile) await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await select(page, 'Capacity: 64 GB'); await expect(names(page)).toHaveCount(1);
  if (mobile) await page.getByRole('button', { name: 'Close drawer', exact: true }).click();
  await input.press('Enter'); await assertCleared('Dome');
  // A search button press also clears filters when there is no search text.
  await page.goto('/products?brand=ACME'); await expect(names(page)).toHaveCount(2);
  await page.getByRole('button', { name: mobile ? 'Search products' : 'Search', exact: true }).click();
  await expect(page).toHaveURL(/\/search$/); await expect(names(page)).toHaveCount(4);
});

for (const path of ['/cctv', '/brands/acme']) test(`header search leaves ${path} to search the entire catalog`, async ({ page }) => {
  await setup(page);
  await page.goto(path + '?' + new URLSearchParams({ search: 'Camera', customFilters: JSON.stringify({ [capacity]: [small] }) }));
  await expect(names(page)).toHaveCount(path === '/cctv' ? 2 : 1);
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page).toHaveURL(/\/search\?search=Camera$/);
  await expect(names(page)).toHaveCount(4);
});

test('only brands, categories, main categories and manually configured groups are displayed', async ({ page }) => {
  const calls = await setup(page); await page.goto('/search?search=Camera&specs=%7B%22Resolution%22%3A%5B%224%20MP%22%5D%7D&availability=none&minPrice=9999');
  await expect(names(page)).toHaveCount(4);
  await expect(checkbox(page, 'Brand: ACME')).toBeVisible();
  await expect(checkbox(page, 'Categories: CCTV')).toBeVisible();
  await expect(checkbox(page, 'Main categories: IP Cameras')).toBeVisible();
  await expect(checkbox(page, 'Capacity: 64 GB')).toBeVisible();
  for (const name of ['Resolution: 4 MP', 'Unconfigured: Automatic', 'Availability: In Stock', 'Subcategories: Bullet']) await expect(checkbox(page, name)).toHaveCount(0);
  expect(calls.at(-1).specs).toBeUndefined(); expect(calls.at(-1).availability).toBeUndefined(); expect(calls.at(-1).minPrice).toBeUndefined();
});

test('checkbox options use unions and independent custom groups narrow results', async ({ page }) => {
  await setup(page); await page.goto('/products');
  await select(page, 'Capacity: 64 GB'); await expect(names(page)).toHaveCount(2);
  await select(page, 'Capacity: 128 GB'); await expect(names(page)).toHaveCount(3);
  await page.getByRole('combobox', { name: 'Connection', exact: true }).filter({ visible: true }).selectOption(usb);
  await expect(names(page)).toHaveCount(2);
  await select(page, 'Brand: ACME'); await expect(names(page)).toHaveCount(2);
  await page.reload();
  await expect(checkbox(page, 'Capacity: 64 GB')).toBeChecked();
  await expect(checkbox(page, 'Capacity: 128 GB')).toBeChecked();
  await expect(page.getByRole('combobox', { name: 'Connection', exact: true }).filter({ visible: true })).toHaveValue(usb);
  await page.getByRole('button', { name: 'Clear Capacity', exact: true }).filter({ visible: true }).click();
  await expect(checkbox(page, 'Capacity: 64 GB')).not.toBeChecked();
});

test('category unions remain available with main category selections', async ({ page }) => {
  await setup(page); await page.goto('/products');
  await select(page, 'Categories: CCTV'); await expect(names(page)).toHaveCount(3);
  await select(page, 'Categories: Networking'); await expect(names(page)).toHaveCount(4);
  await select(page, 'Main categories: IP Cameras'); await expect(names(page)).toHaveCount(3);
  await select(page, 'Main categories: Switches'); await expect(names(page)).toHaveCount(4);
});

test('zero results retain native and configured filters for recovery', async ({ page }) => {
  await setup(page); await page.goto('/products');
  await select(page, 'Main categories: Switches'); await expect(names(page)).toHaveCount(1);
  await select(page, 'Capacity: 64 GB');
  await expect(page.getByRole('heading', { name: 'No Products Found', exact: true })).toBeVisible();
  await expect(checkbox(page, 'Main categories: IP Cameras')).toBeVisible();
  await select(page, 'Main categories: IP Cameras'); await expect(names(page)).toHaveCount(2);
  await page.getByRole('button', { name: 'Reset', exact: true }).filter({ visible: true }).click();
  await expect(names(page)).toHaveCount(4);
});

test('category-route selections preserve search, brands and manual filters through navigation', async ({ page }) => {
  await setup(page); await page.goto('/cctv?search=Camera&brand=ACME&customFilters=' + encodeURIComponent(JSON.stringify({ [capacity]: [small] })));
  await expect(names(page)).toHaveCount(1);
  await select(page, 'Main categories: IP Cameras');
  await expect(page).toHaveURL(/\/products\?/);
  await expect(checkbox(page, 'Capacity: 64 GB')).toBeChecked();
  await expect(checkbox(page, 'Brand: ACME')).toBeChecked();
  expect(new URL(page.url()).searchParams.get('search')).toBe('Camera');
  await page.goBack(); await expect(page).toHaveURL(/\/cctv\?/);
  await expect(checkbox(page, 'Capacity: 64 GB')).toBeChecked();
});

test('pagination reuses facets and manual selection returns to page one', async ({ page }) => {
  const rows = Array.from({ length: 32 }, (_, index) => ({ ...products[index % 4], assignmentId: products[index % 4]._id, _id: id(50 + index), name: `Camera ${index}` }));
  const calls = await setup(page, rows); await page.goto('/search?search=Camera');
  await expect(names(page)).toHaveCount(28);
  await page.getByRole('button', { name: 'Next Page', exact: true }).click(); await expect(names(page)).toHaveCount(4);
  expect(calls.at(-1).includeFacets).toBe('false');
  await select(page, 'Capacity: 64 GB'); await expect(names(page)).toHaveCount(16);
  expect(calls.at(-1).page).toBe('1'); expect(calls.at(-1).includeFacets).toBeUndefined();
});

for (const mobile of [false, true]) test(`${mobile ? 'mobile' : 'desktop'} hides unconfigured groups and retains manual assignments`, async ({ page }) => {
  if (mobile) await page.setViewportSize({ width: 390, height: 844 });
  await setup(page); await page.goto('/products');
  if (mobile) await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await expect(checkbox(page, 'Categories: CCTV')).toBeVisible();
  await expect(checkbox(page, 'Main categories: IP Cameras')).toBeVisible();
  await expect(checkbox(page, 'Subcategories: Bullet')).toHaveCount(0);
  await expect(checkbox(page, 'Resolution: 4 MP')).toHaveCount(0);
  await expect(checkbox(page, 'Availability: In Stock')).toHaveCount(0);
  await select(page, 'Capacity: 128 GB');
  if (mobile) { await page.getByRole('button', { name: 'Close drawer', exact: true }).click(); await expect(names(page)).toHaveCount(1); await page.getByRole('button', { name: 'Filters', exact: true }).click(); }
  await expect(checkbox(page, 'Capacity: 128 GB')).toBeChecked();
});

for (const mobile of [false, true]) test(`${mobile ? 'mobile' : 'desktop'} radio groups allow one choice and an explicit clear action`, async ({ page }) => {
  if (mobile) await page.setViewportSize({ width: 390, height: 844 });
  await setup(page, products, facets => ({ ...facets, customFilters: facets.customFilters.map(filter => filter._id === connectivity ? { ...filter, type: 'radio' } : filter) }));
  await page.goto('/products');
  if (mobile) await page.getByRole('button', { name: 'Filters', exact: true }).click();
  const radio = label => page.getByRole('radio', { name: `Connection: ${label}`, exact: true }).filter({ visible: true });
  await radio('USB').click(); await expect(radio('USB')).toBeChecked(); await expect(names(page)).toHaveCount(2);
  await radio('Wireless').click(); await expect(radio('Wireless')).toBeChecked(); await expect(radio('USB')).not.toBeChecked(); await expect(names(page)).toHaveCount(2);
  await page.getByRole('button', { name: 'Clear Connection', exact: true }).filter({ visible: true }).click();
  await expect(names(page)).toHaveCount(4);
});

test('no custom definitions means no inferred specification or availability filters', async ({ page }) => {
  await setup(page, products, facets => ({ ...facets, customFilters: [] })); await page.goto('/products');
  await expect(checkbox(page, 'Brand: ACME')).toBeVisible(); await expect(checkbox(page, 'Categories: CCTV')).toBeVisible();
  await expect(checkbox(page, 'Main categories: IP Cameras')).toBeVisible();
  for (const name of ['Resolution: 4 MP', 'Capacity: 64 GB', 'Availability: In Stock', 'Subcategories: Dome']) await expect(checkbox(page, name)).toHaveCount(0);
});

test('custom brand routes preserve real brand names when combining selections', async ({ page }) => {
  const rows = products.map(product => ({ ...product, specifications: product.specifications.map(spec => spec.key === 'Brand' && spec.value === 'ACME' ? { ...spec, value: 'TP-LINK' } : spec) }));
  await setup(page, rows); await page.goto('/brands/tp-link?search=Camera');
  await expect(names(page)).toHaveCount(2);
  await expect(checkbox(page, 'Brand: TP-LINK')).toBeChecked(); await select(page, 'Brand: BETA'); await expect(names(page)).toHaveCount(4);
  expect(new URL(page.url()).searchParams.get('brand')).toBe('TP-LINK,BETA');
});
