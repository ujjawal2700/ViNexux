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
async function setup(page, rows = products) {
  await mockApi(page); await seedBrowserSession(page, 'storefront');
  const calls = [];
  await page.route('**/api/categories**', route => route.fulfill({ json: { success: true, data: { categories, categoryTree: categories } } }));
  await page.route('**/api/products?**', route => {
    const params = new URL(route.request().url()).searchParams; calls.push(Object.fromEntries(params));
    const specs = JSON.parse(params.get('specs') || '{}');
    const resolvedBrand = rows.map(product => product.specifications[0].value).find(name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === params.get('brandSlug')) || (params.get('brandSlug') === 'tplink-special' ? 'TP-LINK' : null);
    const filtered = rows.filter(product => {
      if (params.get('search') && !product.name.toLowerCase().includes(params.get('search').toLowerCase())) return false;
      for (const key of ['headerCategory', 'mainCategory', 'subCategory', 'categoryId', 'category']) if (params.get(key) && !params.get(key).split(',').some(value => ancestry(product).includes(value))) return false;
      if (params.get('brand') && !params.get('brand').split(',').includes(product.specifications[0].value)) return false;
      if (params.get('brandSlug') && !params.get('brand') && product.specifications[0].value !== resolvedBrand) return false;
      if (params.get('availability') === 'none') return false;
      return Object.entries(specs).every(([key, values]) => !values.length || product.specifications.some(spec => spec.key.toLowerCase() === key.toLowerCase() && values.includes(spec.value)));
    });
    const pageNumber = Number(params.get('page') || 1), limit = Number(params.get('limit') || 28);
    const facets = {
      categories: categories.map(category => ({ ...category, level: category.parentId ? [id(1), id(2)].includes(category.parentId) ? 2 : 3 : 1, count: params.has('headerCategory') && category._id === id(2) ? 0 : rows.filter(product => ancestry(product).includes(category._id)).length, availableCount: 1 })),
      brands: [...new Set(rows.map(product => product.specifications[0].value))].map(name => ({ name, count: 1 })),
      specs: [{ key: 'Resolution', label: 'Resolution', values: [{ val: '4 MP', count: 2 }, { val: '8 MP', count: 1 }] }, { key: 'Power', label: 'Power', values: [{ val: 'PoE', count: 3 }, { val: '12V', count: 1 }] }],
      availability: [{ status: 'in-stock', count: rows.length }],
    };
    return route.fulfill({ json: { success: true, data: { resolvedBrand, products: filtered.slice((pageNumber - 1) * limit, pageNumber * limit), pagination: { page: pageNumber, limit, total: filtered.length, totalPages: Math.ceil(filtered.length / limit) }, ...(params.get('includeFacets') === 'false' ? {} : { facets }) } } });
  });
  return calls;
}
const names = page => page.locator('main').getByRole('heading', { level: 3 });

test('search supports header/main/subcategory unions and keeps every other filter visible', async ({ page }) => {
  await setup(page); await page.goto('/search?search=Camera');
  await expect(names(page)).toHaveCount(4);
  await expect(checkbox(page, 'Resolution: 4 MP')).toBeVisible();
  await select(page, 'Header categories: CCTV'); await expect(names(page)).toHaveCount(3);
  await expect(checkbox(page, 'Header categories: Networking')).toBeVisible();
  await expect(checkbox(page, 'Main categories: Switches (Networking)')).toBeVisible();
  await select(page, 'Header categories: Networking'); await expect(names(page)).toHaveCount(4);
  await select(page, 'Main categories: IP Cameras (CCTV)'); await expect(names(page)).toHaveCount(3);
  await select(page, 'Main categories: Switches (Networking)'); await expect(names(page)).toHaveCount(4);
  await select(page, 'Subcategories: Bullet (IP Cameras)'); await expect(names(page)).toHaveCount(1);
  await select(page, 'Subcategories: Dome (IP Cameras)'); await expect(names(page)).toHaveCount(3);
  await expect(checkbox(page, 'Resolution: 8 MP')).toBeVisible();
  await select(page, 'Resolution: 4 MP'); await expect(names(page)).toHaveCount(2);
  await select(page, 'Resolution: 8 MP'); await expect(names(page)).toHaveCount(3);
  await select(page, 'Power: PoE'); await expect(names(page)).toHaveCount(2);
  await select(page, 'Brand: ACME'); await expect(names(page)).toHaveCount(2);
  await expect(checkbox(page, 'Brand: BETA')).toBeVisible();
  await select(page, 'Brand: BETA');
  await expect.poll(() => new URL(page.url()).searchParams.get('brand')).toBe('ACME,BETA');
  await page.reload();
  await expect(checkbox(page, 'Resolution: 8 MP')).toBeChecked();
  await expect(checkbox(page, 'Power: PoE')).toBeChecked();
  await expect(checkbox(page, 'Subcategories: Dome (IP Cameras)')).toBeChecked();
  await expect(names(page)).toHaveCount(2);
});

test('zero results keep filters available and can be recovered without resetting everything', async ({ page }) => {
  await setup(page); await page.goto('/search?search=Camera');
  await select(page, 'Header categories: Networking'); await expect(names(page)).toHaveCount(1);
  await select(page, 'Resolution: 4 MP');
  await expect(page.getByRole('heading', { name: 'No Products Found', exact: true })).toBeVisible();
  await expect(checkbox(page, 'Resolution: 8 MP')).toBeVisible();
  await expect(checkbox(page, 'Header categories: CCTV')).toBeVisible();
  await expect(checkbox(page, 'Brand: ACME')).toBeVisible();
  await select(page, 'Header categories: CCTV'); await expect(names(page)).toHaveCount(2);
  await select(page, 'Resolution: 4 MP', false); await expect(names(page)).toHaveCount(4);
});

test('category-route filtering preserves search, brands and specs when adding a child selection', async ({ page }) => {
  await setup(page); await page.goto('/cctv?search=Camera&brand=ACME&specs=' + encodeURIComponent(JSON.stringify({ Resolution: ['4 MP'] })));
  await expect(names(page)).toHaveCount(1);
  await expect(checkbox(page, 'Header categories: CCTV')).toBeChecked();
  await select(page, 'Subcategories: Bullet (IP Cameras)');
  await expect(page).toHaveURL(/\/products\?/);
  await expect(checkbox(page, 'Brand: ACME')).toBeChecked();
  await expect(checkbox(page, 'Resolution: 4 MP')).toBeChecked();
  expect(new URL(page.url()).searchParams.get('search')).toBe('Camera');
  await page.goBack();
  await expect(page).toHaveURL(/\/cctv\?/);
  await expect(checkbox(page, 'Resolution: 4 MP')).toBeChecked();
});

test('unchecking all availability statuses shows zero results while keeping options', async ({ page }) => {
  await setup(page); await page.goto('/products');
  for (const name of ['In Stock', 'Low Stock', 'On Order', 'Out of Stock']) await select(page, `Availability: ${name}`, false);
  await expect(page.getByRole('heading', { name: 'No Products Found', exact: true })).toBeVisible();
  await expect(checkbox(page, 'Header categories: CCTV')).toBeVisible();
  await select(page, 'Availability: In Stock'); await expect(names(page)).toHaveCount(4);
});

test('pagination reuses facets and selecting a filter returns to page one', async ({ page }) => {
  const rows = Array.from({ length: 32 }, (_, index) => ({ ...products[index % 4], _id: id(50 + index), name: `Camera ${index}` }));
  const calls = await setup(page, rows); await page.goto('/search?search=Camera');
  await expect(names(page)).toHaveCount(28);
  await page.getByRole('button', { name: 'Next Page', exact: true }).click(); await expect(names(page)).toHaveCount(4);
  expect(calls.at(-1).includeFacets).toBe('false');
  await select(page, 'Resolution: 4 MP'); await expect(names(page)).toHaveCount(16);
  expect(calls.at(-1).page).toBe('1'); expect(calls.at(-1).includeFacets).toBeUndefined();
});

test('mobile drawer supports multiple selections, stays open and retains them on reopening', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await setup(page); await page.goto('/search?search=Camera');
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await select(page, 'Header categories: CCTV');
  await select(page, 'Subcategories: Bullet (IP Cameras)');
  await select(page, 'Subcategories: Dome (IP Cameras)');
  await select(page, 'Resolution: 4 MP');
  await expect(page.getByRole('heading', { name: 'Filter Products', exact: true })).toBeVisible();
  await expect(checkbox(page, 'Resolution: 8 MP')).toBeVisible();
  await page.getByRole('button', { name: 'Close drawer', exact: true }).click();
  await expect(names(page)).toHaveCount(2);
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await expect(checkbox(page, 'Resolution: 4 MP')).toBeChecked();
});

test('custom brand routes preserve the real name and punctuation when combining selections', async ({ page }) => {
  const rows = products.map(product => ({ ...product, specifications: product.specifications.map(spec => spec.key === 'Brand' && spec.value === 'ACME' ? { ...spec, value: 'TP-LINK' } : spec) }));
  await setup(page, rows); await page.goto('/brands/tplink-special?search=Camera');
  await expect(names(page)).toHaveCount(2);
  await expect(checkbox(page, 'Brand: TP-LINK')).toBeChecked();
  await select(page, 'Brand: BETA');
  await expect(names(page)).toHaveCount(4);
  expect(new URL(page.url()).searchParams.get('brand')).toBe('TP-LINK,BETA');
});
