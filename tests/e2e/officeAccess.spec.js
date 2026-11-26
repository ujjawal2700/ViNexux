import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';
import { DEFAULT_WORK_SCHEDULE, employeeWorkWindow } from '../../shared/employeeWorkSchedule.js';
const id = '507f1f77bcf86cd799439011', roleId = '507f1f77bcf86cd799439021', employeeId = '507f1f77bcf86cd799439022';

test('dealer verification date filters send inclusive IST dates and can be cleared', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin'); const queries = [];
  await page.route('**/api/admin/dealers?*', route => {
    queries.push(Object.fromEntries(new URL(route.request().url()).searchParams));
    return route.fulfill({ json: { success: true, data: { dealers: [], pagination: { total: 0, totalPages: 1 } } } });
  });
  await page.goto('/admin/dealers');
  await page.getByLabel('Verification from date').fill('2026-11-24'); await page.getByLabel('Verification to date').fill('2026-11-26');
  await expect.poll(() => queries.at(-1)).toMatchObject({ from: '2026-11-24', to: '2026-11-26', page: '1' });
  await page.getByRole('button', { name: 'Clear dates', exact: true }).click();
  await expect.poll(() => queries.at(-1)?.from).toBeUndefined(); await expect.poll(() => queries.at(-1)?.to).toBeUndefined();
});

test('active sessions identify separate super admins and link every user type to their own profile', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  const people = [
    { _id: id, fullName: 'First Owner', role: 'admin' },
    { _id: '507f1f77bcf86cd799439012', fullName: 'Second Owner', role: 'admin' },
    { _id: '507f1f77bcf86cd799439013', fullName: 'Dealer Buyer', role: 'dealer' },
    { _id: '507f1f77bcf86cd799439014', fullName: 'Retail Buyer', role: 'customer' },
    { _id: employeeId, fullName: 'Office Teammate', role: 'admin', isEmployee: true },
  ];
  await page.route('**/api/admin/sessions?*', route => route.fulfill({ json: { success: true, data: { sessions: people.map((user, index) => ({ _id: `session-${index}`, sessionId: `session-${index}`, userId: user, userType: user.role, isActive: true, createdAt: new Date().toISOString(), lastActiveAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 3600000).toISOString() })), pagination: { total: 5, totalPages: 1 } } } }));
  await page.route(`**/api/admin/super-admins/${id}`, route => route.fulfill({ json: { success: true, data: { user: { ...people[0], email: 'owner@example.test', phone: '9876543210', accountStatus: 'active', createdAt: new Date().toISOString() } } } }));
  await page.goto('/admin/sessions');
  const paths = [`/admin/super-admins/${id}`, '/admin/super-admins/507f1f77bcf86cd799439012', '/admin/dealer-accounts/507f1f77bcf86cd799439013', '/admin/customers/507f1f77bcf86cd799439014', `/admin/access/employees/${employeeId}`];
  for (let i = 0; i < people.length; i++) {
    await expect(page.getByRole('link', { name: people[i].fullName, exact: true })).toHaveAttribute('href', paths[i]);
    await expect(page.getByRole('row').filter({ hasText: people[i].fullName })).toContainText(people[i].role === 'admin' ? people[i].isEmployee ? 'Employee' : 'Super admin' : people[i].role === 'dealer' ? 'Dealer' : 'Customer');
  }
  await page.getByRole('link', { name: 'First Owner', exact: true }).click();
  await expect(page).toHaveURL(`/admin/super-admins/${id}`); await expect(page.getByRole('heading', { name: 'Super admin profile', exact: true })).toBeVisible(); await expect(page.getByText('First Owner', { exact: true })).toBeVisible();
});

async function synchronizeGeolocationClock(page) {
  // Browser-native positions use real time; these two tests run days ahead.
  await page.addInitScript(() => {
    for (const method of ['getCurrentPosition', 'watchPosition']) {
      const native = navigator.geolocation[method].bind(navigator.geolocation);
      navigator.geolocation[method] = (ok, error, options) => native(value => ok({ coords: value.coords, timestamp: Date.now() }), error, options);
    }
  });
}

test('super admin manages weekday hours per role and privately reveals the employee daily password', async ({ page }, testInfo) => {
  await page.clock.install({ time: new Date('2026-11-30T10:00:00+05:30') });
  await synchronizeGeolocationClock(page);
  await mockApi(page); await seedBrowserSession(page, 'admin');
  const role = { _id: roleId, name: 'Office team', description: '', isActive: true, permissions: {}, workSchedule: structuredClone(DEFAULT_WORK_SCHEDULE) }; let saved;
  const employee = { _id: employeeId, fullName: 'Asha Office', email: 'asha@example.test', phone: '9876543210', accountStatus: 'active' };
  await page.route('**/api/admin/access/**', route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    let data;
    if (path.endsWith('/self')) data = { access: { role: 'admin', isEmployee: false } };
    else if (path.endsWith('/daily-password')) data = { managed: true, available: true, password: 'AshaUniqueDaily-123456', window: employeeWorkWindow(role.workSchedule, new Date('2026-11-30T10:00:00+05:30')) };
    else if (path.endsWith(`/roles/${roleId}`)) { saved = request.postDataJSON(); Object.assign(role, saved); data = { role }; }
    else if (path.endsWith('/roles')) data = { roles: [role] };
    else data = { employees: [{ ...employee, accessRoleId: role }], total: 1, page: 1, pages: 1 };
    return route.fulfill({ json: { success: true, data } });
  });
  await page.goto('/admin/access'); await page.getByRole('tab', { name: 'Role studio' }).click();
  await page.getByRole('button', { name: 'Edit role & timetable', exact: true }).click();
  const editor = page.getByRole('dialog');
  await editor.getByLabel('Enable scheduled employee access', { exact: true }).check();
  await editor.getByLabel('saturday shift ends', { exact: true }).fill('16:00');
  await expect(editor.getByText('Login window: 09:00–19:20 IST', { exact: true }).first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('role-weekly-timetable.png') });
  await editor.getByRole('button', { name: 'Save role', exact: true }).click();
  await expect.poll(() => saved?.workSchedule?.days?.saturday?.end).toBe('16:00');
  expect(saved.workSchedule.days.monday.end).toBe('19:00'); expect(saved.workSchedule.days.sunday.enabled).toBe(false);
  await page.getByRole('tab', { name: 'Employees', exact: true }).click();
  await page.getByRole('button', { name: 'Reveal today’s password', exact: true }).click();
  const passwordDialog = page.getByRole('dialog');
  await expect(passwordDialog.getByLabel('Employee daily password')).toHaveText('AshaUniqueDaily-123456');
  await expect(passwordDialog).toContainText('Only super admins');
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain('AshaUniqueDaily-123456');
  await passwordDialog.getByRole('button', { name: 'Close modal', exact: true }).click();
  await expect(page.getByText('AshaUniqueDaily-123456', { exact: true })).toHaveCount(0);
});

test('mandatory location blocks admin restore until permission is granted', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin'); let refreshes = 0;
  page.on('request', request => { if (new URL(request.url()).pathname.endsWith('/auth/refresh-token')) refreshes++; });
  await page.addInitScript(() => {
    navigator.geolocation.getCurrentPosition = (_ok, fail) => fail({ code: 1 });
    navigator.geolocation.watchPosition = (_ok, fail) => { setTimeout(() => fail({ code: 1 }), 0); return 1; };
  });
  await page.goto('/admin/dashboard');
  await expect(page.getByRole('heading', { name: 'Location access required', exact: true })).toBeVisible();
  expect(refreshes).toBe(0); await expect(page.getByRole('link', { name: 'Admin Dashboard', exact: true })).toHaveCount(0);
  await page.evaluate(() => {
    const position = () => ({ coords: { latitude: 25.18, longitude: 75.85, accuracy: 10 }, timestamp: Date.now() });
    navigator.geolocation.getCurrentPosition = ok => ok(position()); navigator.geolocation.watchPosition = ok => { ok(position()); return 2; };
  });
  await page.getByRole('button', { name: 'Enable location', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Lock admin panel (F8)' })).toBeVisible(); expect(refreshes).toBeGreaterThan(0);
});

test('revoking location hides the workspace and restoring it preserves an open draft', async ({ page, context }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin'); await page.goto('/admin/pos');
  await page.getByRole('button', { name: /E2E Product E2E-001/ }).click();
  await page.getByRole('button', { name: /Add customer details/ }).click();
  await page.getByRole('dialog').getByLabel('Customer name *', { exact: true }).fill('Keep my office draft');
  await context.clearPermissions();
  const gate = page.getByRole('dialog', { name: 'Mandatory admin location', exact: true });
  await expect(gate).toBeVisible();
  await context.grantPermissions(['geolocation']);
  // Granting permission now recovers automatically without another Enable click.
  await expect(gate).toHaveCount(0);
  await expect(page.getByRole('dialog').getByLabel('Customer name *', { exact: true })).toHaveValue('Keep my office draft');
});

test('employee warning appears at 6:45 PM and the portal signs out at 7:20 PM even while idle', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-30T18:40:00+05:30') });
  await synchronizeGeolocationClock(page);
  await mockApi(page); await seedBrowserSession(page, 'admin');
  const schedule = { ...structuredClone(DEFAULT_WORK_SCHEDULE), enabled: true }, work = employeeWorkWindow(schedule, new Date('2026-11-30T18:40:00+05:30'));
  const employee = { _id: id, role: 'admin', isEmployee: true, accessRoleActive: true, accessRoleName: 'Office team', fullName: 'Office Employee', workSchedule: schedule, employeeWorkWindow: work, permissions: {} };
  for (const path of ['**/api/auth/refresh-token', '**/api/auth/me']) await page.route(path, route => {
    return route.fulfill({ json: { success: true, data: { accessToken: 'employee-token', user: employee } } });
  });
  await page.route('**/api/admin/access/self', route => route.fulfill({ json: { success: true, data: { access: employee } } }));
  await page.goto('/admin/profile'); await expect(page.getByRole('heading', { name: 'Admin Settings & Profile' })).toBeVisible();
  await expect(page.getByText('Your working session is ending', { exact: true })).toHaveCount(0);
  await page.clock.setSystemTime(new Date('2026-11-30T18:45:00+05:30')); await page.clock.runFor(1100);
  await expect(page.getByRole('alert').filter({ hasText: 'Your working session is ending' })).toContainText(/7:20/i);
  // Future refresh attempts are rejected after expiry instead of re-seeding a mock session on navigation.
  await page.route('**/api/auth/refresh-token', route => route.fulfill({ status: 401, json: { success: false, message: 'Session ended.' } }));
  await page.clock.setSystemTime(new Date('2026-11-30T19:20:00+05:30')); await page.clock.runFor(1100);
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByPlaceholder('Enter Email Address or Phone Number')).toBeVisible();
});

test('a temporary location watch timeout does not reopen the enable-location screen', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  await page.addInitScript(() => {
    const fix = () => ({ coords: { latitude: 25.18, longitude: 75.85, accuracy: 20 }, timestamp: Date.now() });
    navigator.geolocation.getCurrentPosition = ok => ok(fix());
    navigator.geolocation.watchPosition = (ok, error) => { window.officeWatchError = error; setTimeout(() => ok(fix()), 0); return 1; };
  });
  await page.goto('/admin/dashboard');
  await expect(page.getByRole('button', { name: 'Lock admin panel (F8)' })).toBeVisible();
  await page.evaluate(() => window.officeWatchError({ code: 3 }));
  await expect(page.getByRole('dialog', { name: 'Mandatory admin location', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: /Offline POS billing/i }).first().click();
  await expect(page.getByRole('heading', { name: 'Offline POS Billing', exact: true })).toBeVisible();
});
