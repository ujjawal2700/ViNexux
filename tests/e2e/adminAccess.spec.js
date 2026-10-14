import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';

const roleId = '507f1f77bcf86cd799439021';
const employeeId = '507f1f77bcf86cd799439022';
const logId = '507f1f77bcf86cd799439023';
test('super admin builds a custom role, creates an employee and inspects the change logbook', async ({ page }, testInfo) => {
  test.setTimeout(60000);
  await mockApi(page); await seedBrowserSession(page, 'admin');
  const roles = [], employees = [];
  await page.route('**/api/admin/access/**', async route => {
    const request = route.request(), url = new URL(request.url());
    let data;
    if (url.pathname.endsWith('/self')) data = { access: { role: 'admin', isEmployee: false, isSuperAdmin: true } };
    else if (url.pathname.endsWith('/roles')) {
      if (request.method() === 'POST') roles.push({ ...request.postDataJSON(), _id: roleId });
      data = { roles, role: roles[0] };
    } else if (url.pathname.endsWith('/employees')) {
      if (request.method() === 'POST') {
        const { password, ...body } = request.postDataJSON();
        expect(password).toBe('Employee-pass-2026');
        employees.push({ ...body, _id: employeeId, accessRoleId: { _id: roleId, name: roles[0].name, isActive: true } });
      }
      data = { employees, total: employees.length, page: 1, pages: 1 };
    } else {
      const log = { _id: logId, actor: { id: employeeId, name: 'Asha Singh', email: 'asha@example.test', roleName: 'Warehouse team' },
        entity: 'Product', operation: 'updateOne', method: 'POST', path: '/api/admin/products/test/stock', section: 'products', status: 'applied',
        createdAt: '2026-10-13T05:30:00.000Z', requestId: 'test-audit-request', ip: '127.0.0.1',
        location: { status: 'available', latitude: 26.912434, longitude: 75.787271, accuracy: 12, capturedAt: '2026-10-13T05:29:58.000Z' },
        documents: [{ id: 'product-01', before: { stockQuantity: 10 }, after: { stockQuantity: 12 }, changes: [{ field: 'stockQuantity', before: 10, after: 12 }] }],
      };
      data = url.pathname.endsWith('/logs') ? { logs: [log], total: 1, page: 1, pages: 1 } : { log };
    }
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto('/admin/access');
  await page.getByRole('tab', { name: 'Role studio' }).click();
  await page.getByRole('button', { name: 'Create role', exact: true }).click();
  const modal = page.getByRole('dialog');
  await modal.getByLabel('Role name', { exact: true }).fill('Warehouse team');
  await modal.getByLabel('Description', { exact: true }).fill('Maintain product inventory and view reports.');
  await modal.getByLabel('Products & inventory', { exact: true }).selectOption('both');
  await modal.getByLabel('Analytics reports', { exact: true }).selectOption('read');
  await modal.getByLabel('B2C enquiries', { exact: true }).selectOption('read');
  await modal.getByLabel('B2B enquiries', { exact: true }).selectOption('none');
  await modal.screenshot({ path: testInfo.outputPath('role-studio.png') });
  await modal.getByRole('button', { name: 'Save role', exact: true }).click();
  await expect(modal).toHaveCount(0);
  expect(roles[0].permissions.products).toEqual({ read: true, write: true });
  expect(roles[0].permissions['enquiries-dealers']).toEqual({ read: false, write: false });
  await page.getByRole('tab', { name: 'Employees', exact: true }).click();
  await page.getByRole('button', { name: 'Add employee', exact: true }).click();
  await modal.getByLabel('Employee name', { exact: true }).fill('Asha Singh');
  await modal.getByLabel('Email address', { exact: true }).fill('asha@example.test');
  await modal.getByLabel('Phone number', { exact: true }).fill('9888888888');
  await modal.getByLabel('Password', { exact: true }).fill('Employee-pass-2026');
  await modal.getByLabel('Assigned role', { exact: true }).selectOption(roleId);
  await modal.getByRole('button', { name: 'Save employee', exact: true }).click();
  await expect(modal).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Asha Singh', exact: true })).toBeVisible();
  await page.locator('main').screenshot({ path: testInfo.outputPath('team-desktop.png') });
  await page.goto('/admin/logbook');
  await expect(page.getByText('Asha Singh', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Inspect changes' }).click();
  await expect(modal.getByRole('heading', { name: 'stockQuantity' })).toBeVisible();
  await expect(modal.getByText(/browser-reported/)).toBeVisible();
  await expect(modal.getByRole('link', { name: '26.912434, 75.787271' })).toHaveAttribute('href', 'https://www.google.com/maps?q=26.912434,75.787271');
  await modal.screenshot({ path: testInfo.outputPath('logbook-detail.png') });
  await page.getByRole('button', { name: 'Close modal' }).click();
  await expect(modal).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(async () => { const box = await page.locator('aside').boundingBox(); return box.x + box.width; }).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.locator('main').screenshot({ path: testInfo.outputPath('logbook-mobile.png') });
});

test('employee navigation is permission-scoped and protected sections cannot be opened directly', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  const employee = { _id: employeeId, id: employeeId, fullName: 'Asha Singh', email: 'asha@example.test', role: 'admin',
    isEmployee: true, accessRoleName: 'Catalog viewer', accessRoleActive: true, permissions: { products: { read: true, write: false } } };
  await page.route('**/api/auth/refresh-token', route => route.fulfill({ json: { success: true, data: { accessToken: 'employee-token', refreshToken: 'employee-refresh', user: employee } } }));
  await page.route('**/api/admin/access/self', route => route.fulfill({ json: { success: true, data: { access: employee } } }));
  let categoryRequests = 0;
  await page.route('**/api/admin/categories?*', route => {
    categoryRequests++;
    return route.fulfill({ status: 403, json: { success: false, message: 'Your role does not have read access to this section.' } });
  });
  await page.goto('/admin/products');
  await expect(page.getByText('Read-only access', { exact: false })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'E2E Product' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Failed to load product catalog' })).toHaveCount(0);
  expect(categoryRequests).toBe(0);
  await expect(page.getByRole('link', { name: 'Product Catalog', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Team & Access', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Super Admin Logbook', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Dealer Verification', exact: true })).toHaveCount(0);
  await page.goto('/admin/logbook');
  await expect(page.getByRole('heading', { name: 'This section is outside your role' })).toBeVisible();
  await page.goto('/admin/access');
  await expect(page.getByRole('heading', { name: 'This section is outside your role' })).toBeVisible();
});

test('role deletion lists assigned employees and succeeds only after reassignment', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  const backupRoleId = '507f1f77bcf86cd799439024';
  let roles = [{ _id: roleId, name: 'Warehouse team', isActive: true, permissions: {} }, { _id: backupRoleId, name: 'POS operator', isActive: true, permissions: {} }];
  const employee = { _id: employeeId, fullName: 'Asha Singh', email: 'asha@example.test', phone: '9888888888', accountStatus: 'active', accessRoleId: roleId };
  let deletions = 0;
  await page.route('**/api/admin/access/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    let data;
    if (path.endsWith('/self')) data = { access: { role: 'admin', isEmployee: false } };
    else if (path.endsWith('/assignments')) data = { employees: employee.accessRoleId === roleId ? [employee] : [] };
    else if (request.method() === 'DELETE') { deletions++; roles = roles.filter(role => role._id !== roleId); data = { deleted: true }; }
    else if (path.endsWith('/roles')) data = { roles };
    else if (request.method() === 'PUT') { Object.assign(employee, request.postDataJSON()); data = { employee }; }
    else data = { employees: [{ ...employee, accessRoleId: roles.find(role => role._id === employee.accessRoleId) }], total: 1, page: 1, pages: 1 };
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto('/admin/access');
  await page.getByRole('tab', { name: 'Role studio' }).click();
  await page.getByRole('button', { name: 'Delete role Warehouse team' }).click();
  let dialog = page.getByRole('dialog', { name: 'This role is assigned to employees' });
  await expect(dialog.getByText('Asha Singh', { exact: true })).toBeVisible();
  await expect(dialog.getByText(/First change their role to delete this role/)).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Delete role', exact: true })).toHaveCount(0);
  expect(deletions).toBe(0);
  await dialog.getByRole('button', { name: 'Change role' }).click();
  dialog = page.getByRole('dialog', { name: 'Edit employee' });
  await dialog.getByLabel('Assigned role', { exact: true }).selectOption(backupRoleId);
  await dialog.getByRole('button', { name: 'Save employee' }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: 'Delete role Warehouse team' }).click();
  dialog = page.getByRole('dialog', { name: 'Delete role', exact: true });
  await expect(dialog.getByText(/No employees are assigned/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Delete role', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Warehouse team', exact: true })).toHaveCount(0);
  await expect(page.getByText('Role deleted.', { exact: true })).toBeVisible();
  expect(deletions).toBe(1);
});

test('POS employee sidebar hides empty groups and search expands matching accessible sections', async ({ page }, testInfo) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  const employee = { id: employeeId, fullName: 'Asha Singh', role: 'admin', isEmployee: true, accessRoleActive: true,
    accessRoleName: 'POS operator', permissions: { pos: { read: true, write: true } } };
  await page.route('**/api/auth/refresh-token', route => route.fulfill({ json: { success: true, data: { accessToken: 'employee-token', refreshToken: 'employee-refresh', user: employee } } }));
  await page.route('**/api/admin/access/self', route => route.fulfill({ json: { success: true, data: { access: employee } } }));
  await page.goto('/admin/pos');
  const sidebar = page.locator('aside');
  await expect(sidebar.getByRole('region', { name: 'Sales & Enquiries' })).toBeVisible();
  for (const name of ['Website & Content', 'Catalog & Inventory', 'People & Access', 'Overview']) await expect(sidebar.getByRole('region', { name, exact: true })).toHaveCount(0);
  await sidebar.getByRole('button', { name: 'Sales & Enquiries', exact: true }).click();
  await expect(sidebar.getByRole('link', { name: 'Offline POS Billing' })).toHaveCount(0);
  await sidebar.getByRole('textbox', { name: 'Search sidebar sections' }).fill('billing');
  await expect(sidebar.getByRole('link', { name: 'Offline POS Billing' })).toBeVisible();
  await sidebar.getByRole('textbox', { name: 'Search sidebar sections' }).fill('cms');
  await expect(sidebar.getByText('No accessible sections match your search.')).toBeVisible();
  await expect(sidebar.getByRole('region')).toHaveCount(0);
  await sidebar.getByRole('button', { name: 'Clear sidebar search' }).click();
  await sidebar.getByRole('button', { name: 'Sales & Enquiries', exact: true }).click();
  await sidebar.screenshot({ path: testInfo.outputPath('pos-sidebar.png') });
});

test('read-only employee receives a write-access popup and the mutation is not sent', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  const employee = { id: employeeId, fullName: 'Asha Singh', role: 'admin', isEmployee: true, accessRoleActive: true,
    permissions: { products: { read: true, write: false } } };
  await page.route('**/api/auth/refresh-token', route => route.fulfill({ json: { success: true, data: { accessToken: 'employee-token', refreshToken: 'employee-refresh', user: employee } } }));
  await page.route('**/api/admin/access/self', route => route.fulfill({ json: { success: true, data: { access: employee } } }));
  await page.route('**/api/admin/products/507f1f77bcf86cd799439011', route => route.fulfill({ json: { success: true, data: { _id: '507f1f77bcf86cd799439011', name: 'E2E Product', stockQuantity: 10 } } }));
  let mutations = 0;
  page.on('request', request => { if (request.method() === 'POST' && request.url().endsWith('/stock')) mutations++; });
  await page.goto('/admin/products');
  await page.getByRole('button', { name: 'Update stock for E2E Product' }).click();
  const stock = page.getByRole('dialog', { name: 'Update Stock', exact: true });
  await stock.getByRole('spinbutton', { name: 'Units to add' }).fill('2');
  await stock.getByRole('button', { name: 'Add Stock', exact: true }).click();
  const notice = page.getByRole('dialog', { name: 'Write access required' });
  await expect(notice.getByText("You don't have write access to this section.", { exact: true })).toBeVisible();
  expect(mutations).toBe(0);
  await notice.getByRole('button', { name: 'Got it' }).click();
  await expect(notice).toHaveCount(0);
});


test('optional category lookup failure does not hide a successfully loaded catalog', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  await page.route('**/api/admin/categories?*', route => route.fulfill({ status: 500, json: { success: false, message: 'Category lookup unavailable' } }));
  await page.goto('/admin/products');
  await expect(page.getByRole('row').filter({ hasText: 'E2E Product' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Failed to load product catalog' })).toHaveCount(0);
  await expect(page.getByText('Electronics', { exact: true })).toBeVisible();
});
