import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';
const svg = { name: 'admin-crud.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect width="24" height="24"/></svg>') };
const header = { _id: '507f1f77bcf86cd799439021', name: 'CCTV', slug: 'cctv', parentId: null, isActive: true };
const main = { _id: '507f1f77bcf86cd799439022', name: 'IP Cameras', slug: 'ip-cameras', parentId: header._id, isActive: true };
const employee = async (page, section) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  const user = { _id: '507f1f77bcf86cd799439011', role: 'admin', isEmployee: true, accessRoleActive: true, permissions: { [section]: { read: true, write: true } } };
  await page.route('**/api/auth/refresh-token', route => route.fulfill({ json: { success: true, data: { user, accessToken: 'crud-employee', refreshToken: 'crud-refresh' } } }));
  await page.route('**/api/admin/access/self', route => route.fulfill({ json: { success: true, data: { access: user } } }));
  await page.route('**/api/admin/upload/**', route => route.fulfill({ status: 403, json: { message: 'Shared uploads are not permitted.' } }));
};

for (const level of ['header', 'main', 'sub']) test(`category-only employee creates ${level} category with an image and sees its save notice`, async ({ page }) => {
  await employee(page, 'categories'); let payload, uploads = 0; const categories = [header, main];
  await page.route('**/api/admin/categories**', route => {
    const request = route.request();
    if (new URL(request.url()).pathname.endsWith('/image')) {
      expect(request.headers()['content-type']).toMatch(/^multipart\/form-data/); uploads++;
      return route.fulfill({ json: { success: true, data: { url: 'https://cdn.example.test/category.webp', publicId: 'vinexus/categories/test' } } });
    }
    if (request.method() === 'POST') { payload = request.postDataJSON(); categories.push({ ...payload, _id: '507f1f77bcf86cd799439023' }); }
    return route.fulfill({ json: { success: true, data: request.method() === 'GET' ? { categories, pagination: { total: categories.length, page: 1, pages: 1 } } : categories.at(-1) } });
  });
  await page.goto(`/admin/categories/${level}`);
  await page.getByRole('button', { name: level === 'header' ? 'Add Header Department' : level === 'main' ? 'Add Main Category' : 'Add Sub Category', exact: true }).first().click();
  const dialog = page.getByRole('dialog');
  if (level !== 'header') {
    await dialog.getByRole('button', { name: level === 'main' ? 'Select a Header Department...' : 'Select a Main Category...', exact: true }).click();
    await page.getByRole('menuitem', { name: level === 'main' ? 'CCTV (Department)' : 'IP Cameras (under CCTV)', exact: true }).click();
  }
  const placeholder = level === 'header' ? 'e.g. Desktop Computers, Laptops, Security Systems' : level === 'main' ? 'e.g. Gaming Desktops, CCTV Cameras, Network Switches' : 'e.g. Dome Cameras, Bullet Cameras, PTZ Cameras';
  await dialog.getByPlaceholder(placeholder).fill(`Test ${level}`);
  await dialog.locator('input[type=file]').setInputFiles(svg);
  await dialog.getByRole('button', { name: level === 'header' ? 'Create Header Category' : level === 'main' ? 'Create Main Category' : 'Create Subcategory', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(payload.image).toBe('https://cdn.example.test/category.webp'); expect(uploads).toBe(1);
  await expect(page.getByRole('alert')).toContainText(/successfully|created/i);
  await page.getByRole('button', { name: 'Dismiss notification' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('promo-only employee creates an image banner, sees errors, and cleans up an upload after a failed create', async ({ page }) => {
  await employee(page, 'promotional-banners'); let attempts = 0, cleaned = false; const promos = [];
  await page.route('**/api/admin/cms/promotional-banners**', route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (path.endsWith('/images')) {
      if (request.method() === 'DELETE') { cleaned = true; return route.fulfill({ json: { success: true, data: {} } }); }
      expect(request.headers()['content-type']).toMatch(/^multipart\/form-data/);
      return route.fulfill({ json: { success: true, data: { url: 'https://cdn.example.test/promo.webp', publicId: 'vinexus/promotional-banners/test' } } });
    }
    if (request.method() === 'POST') {
      if (++attempts === 1) return route.fulfill({ status: 400, json: { message: 'Please check the campaign title.' } });
      promos.push({ ...request.postDataJSON(), _id: '507f1f77bcf86cd799439033' });
    }
    return route.fulfill({ json: { success: true, data: request.method() === 'GET' ? { promotionalBanners: promos, promoBanners: promos, pagination: { page: 1, pages: 1, total: promos.length } } : { promoBanner: promos[0] } } });
  });
  await page.goto('/admin/cms/promotional-banners');
  await page.getByRole('button', { name: 'Add Promo Banner', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByPlaceholder('e.g. Festival Wholesale Discount Offer').fill('Test Promotion');
  await dialog.locator('input[type=file]').setInputFiles(svg);
  await dialog.getByRole('button', { name: 'Create Banner', exact: true }).click();
  await expect(dialog.getByText('Please check the campaign title.', { exact: true })).toBeVisible();
  expect(cleaned).toBe(true);
  await dialog.getByRole('button', { name: 'Create Banner', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('alert')).toContainText('Promotional banner created!');
  expect(promos[0].image.publicId).toBe('vinexus/promotional-banners/test');
});

test('static page editor completes create/read/update/delete and displays the result of each action', async ({ page }) => {
  await employee(page, 'pages'); let pages = [];
  await page.route('**/api/admin/cms/pages**', route => {
    const request = route.request(), method = request.method();
    if (method === 'POST') pages.push({ ...request.postDataJSON(), _id: '507f1f77bcf86cd799439044' });
    if (method === 'PUT') pages[0] = { ...pages[0], ...request.postDataJSON() };
    if (method === 'DELETE') pages = [];
    return route.fulfill({ json: { success: true, data: method === 'GET' ? { pages, pagination: { page: 1, total: pages.length, totalPages: 1 } } : { page: pages[0] } } });
  });
  await page.goto('/admin/cms/pages');
  await page.getByRole('button', { name: 'Create New Page', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByPlaceholder('e.g. Privacy Policy, Terms & Conditions, About Us').fill('CRUD Test Page');
  await dialog.getByPlaceholder('e.g. privacy-policy, terms-and-conditions').fill('crud-test-page');
  await dialog.getByPlaceholder('Enter page paragraphs, clauses, and sections...').fill('<p>Original content</p>');
  await dialog.getByRole('button', { name: 'Publish Page to Website', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const row = page.getByRole('row').filter({ hasText: 'CRUD Test Page' });
  await expect(row).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('created and published successfully');
  await row.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(dialog.getByPlaceholder('Enter page paragraphs, clauses, and sections...')).toHaveValue('<p>Original content</p>');
  await dialog.getByPlaceholder('Enter page paragraphs, clauses, and sections...').fill('<p>Updated content</p>');
  await dialog.getByRole('button', { name: 'Update & Save Changes', exact: true }).click();
  await expect(dialog).toHaveCount(0); expect(pages[0].content).toBe('<p>Updated content</p>');
  await expect(page.getByRole('alert')).toContainText('updated and published successfully');
  await row.getByRole('button', { name: 'Delete Page', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete Page', exact: true }).click();
  await expect(row).toHaveCount(0);
  await expect(page.getByRole('alert')).toContainText('Static CMS page deleted!'); expect(pages).toEqual([]);
});
