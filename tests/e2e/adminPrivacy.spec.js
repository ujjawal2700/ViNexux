import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';
const guard = page => page.locator('dialog[aria-labelledby="admin-privacy-title"]');
async function setup(page, { configured = true, locked = false, authenticated = true } = {}) {
  const state = { configured, locked, pin: '012345', failed: false, requests: [], challenge: 'a'.repeat(64) };
  const attach = async target => {
    await mockApi(target); await seedBrowserSession(target, authenticated ? 'admin' : 'guest');
    await target.route('**/api/auth/admin-privacy/**', route => {
      const request = route.request(), path = new URL(request.url()).pathname.split('/').slice(-2).join('/'), body = request.postDataJSON();
      state.requests.push({ path, body });
      const reply = data => route.fulfill({ json: { success: true, data } });
      const reject = (message, status = 400, code = 'VALIDATION_ERROR') => route.fulfill({ status, json: { success: false, message, error: { code } } });
      if (path.endsWith('/status')) return state.failed ? route.fulfill({ status: 503, json: { success: false } }) : reply({ configured: state.configured, locked: state.locked });
      if (path.endsWith('/lock')) { state.locked = true; return reply({ locked: true }); }
      if (path.endsWith('/unlock')) {
        if (body.pin !== state.pin) return reject('Incorrect privacy PIN.');
        state.locked = false; return reply({ configured: true, locked: false });
      }
      if (path.endsWith('/pin')) {
        if (body.password !== 'Password123!') return reject('The administrator password is incorrect.', 401, 'INVALID_CREDENTIALS');
        if (state.configured && body.currentPin !== state.pin) return reject('Incorrect privacy PIN.');
        state.configured = true; state.pin = body.newPin; state.locked = false; return reply({ configured: true, locked: false });
      }
      if (path.endsWith('/request')) {
        if (body.password !== 'Password123!') return reject('The administrator password is incorrect.', 401, 'INVALID_CREDENTIALS');
        return reply({ challengeToken: state.challenge, maskedPhone: '••••••3211', expiresAt: new Date(Date.now() + 300000).toISOString() });
      }
      if (body.otp !== '123456') return reject('Invalid or expired PIN reset OTP.');
      state.pin = body.newPin; state.configured = true; state.locked = path.startsWith('recovery/');
      return reply({ configured: true, locked: state.locked });
    });
  };
  await attach(page); return { state, attach };
}
const unlock = async (page, pin = '012345') => {
  await guard(page).getByLabel('Privacy PIN', { exact: true }).fill(pin);
  await guard(page).getByRole('button', { name: 'Unlock admin panel', exact: true }).click();
};

test('F8 immediately hides admin details and requires the PIN after Escape, navigation and reload', async ({ page }, testInfo) => {
  await setup(page); await page.goto('/admin/dashboard');
  await expect(page.getByRole('button', { name: 'Lock admin panel (F8)' })).toBeVisible();
  await page.keyboard.press('F8');
  await expect(guard(page)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Admin Dashboard', exact: true })).toHaveCount(0);
  await page.keyboard.press('Escape'); await expect(guard(page)).toBeVisible();
  await expect(page.locator('[data-admin-privacy-workspace]')).toHaveCSS('filter', 'blur(24px)');
  await expect(page.locator('[data-admin-privacy-workspace]')).toHaveCSS('visibility', 'visible');
  await page.screenshot({ path: testInfo.outputPath('privacy-locked.png') });
  await unlock(page, '111111'); await expect(guard(page).getByRole('alert')).toContainText('Incorrect privacy PIN');
  await page.goto('/admin/pos'); await expect(guard(page)).toBeVisible();
  await page.reload(); await expect(guard(page)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Offline POS Billing', exact: true })).toHaveCount(0);
  await unlock(page); await expect(guard(page)).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Offline POS Billing', exact: true })).toBeVisible();
});

test('lock preserves the current POS draft and works while another dialog is open', async ({ page }) => {
  await setup(page); await page.goto('/admin/pos');
  await page.getByRole('button', { name: /E2E Product E2E-001/ }).click();
  await page.getByRole('button', { name: /Add customer details/ }).click();
  await page.getByRole('dialog').getByLabel('Customer name *', { exact: true }).fill('Unfinished private customer');
  await page.keyboard.press('F8'); await expect(guard(page)).toBeVisible();
  await unlock(page); await expect(guard(page)).toHaveCount(0);
  await expect(page.getByRole('dialog').getByLabel('Customer name *', { exact: true })).toHaveValue('Unfinished private customer');
});

test('privacy locking and unlocking synchronize between tabs', async ({ page, context }) => {
  const { attach } = await setup(page);
  const other = await context.newPage(); await attach(other);
  await page.goto('/admin/dashboard'); await other.goto('/admin/dashboard');
  await page.getByRole('button', { name: 'Lock admin panel (F8)' }).click();
  await expect(guard(other)).toBeVisible();
  await unlock(page); await expect(guard(page)).toHaveCount(0); await expect(guard(other)).toHaveCount(0);
});

test('super admin sets and changes a separate six-digit PIN in profile settings', async ({ page }) => {
  const { state } = await setup(page, { configured: false }); await page.goto('/admin/profile');
  const settings = page.getByRole('region', { name: 'Admin privacy lock settings' });
  await settings.getByRole('button', { name: 'Set privacy PIN', exact: true }).click();
  await settings.getByLabel('Administrator password').fill('Password123!');
  await settings.getByLabel('New six-digit PIN').fill('000123'); await settings.getByLabel('Confirm new PIN').fill('000123');
  await settings.getByRole('button', { name: 'Set privacy PIN', exact: true }).last().click();
  await expect(settings.getByRole('status')).toContainText('Privacy PIN updated'); expect(state.pin).toBe('000123');
  await settings.getByRole('button', { name: 'Change privacy PIN', exact: true }).click();
  await settings.getByLabel('Administrator password').fill('Password123!'); await settings.getByLabel('Current privacy PIN').fill('000123');
  await settings.getByLabel('New six-digit PIN').fill('654321'); await settings.getByLabel('Confirm new PIN').fill('654321');
  await settings.getByRole('button', { name: 'Change privacy PIN', exact: true }).last().click();
  await expect.poll(() => state.pin).toBe('654321');
});

for (const fromLock of [false, true]) test(`forgot PIN from ${fromLock ? 'locked panel' : 'profile'} uses password and phone OTP without email`, async ({ page }) => {
  const { state } = await setup(page); await page.goto('/admin/profile');
  const scope = fromLock ? guard(page) : page.getByRole('region', { name: 'Admin privacy lock settings' });
  if (fromLock) { await expect(page.getByRole('button', { name: 'Lock admin panel (F8)' })).toBeVisible(); await page.keyboard.press('F8'); await expect(guard(page)).toBeVisible(); }
  await scope.getByRole('button', { name: 'Forgot privacy PIN?', exact: true }).click();
  await expect(scope.getByLabel('Super admin email')).toHaveCount(0);
  await scope.getByLabel('Administrator password').fill('Password123!');
  await scope.getByRole('button', { name: 'Send PIN reset OTP', exact: true }).click();
  await expect.poll(() => state.requests.find(entry => entry.path === 'reset/request')?.body).toEqual({ password: 'Password123!' });
  await scope.getByLabel('SMS verification OTP').fill('123456'); await scope.getByLabel('New six-digit PIN').fill('234567'); await scope.getByLabel('Confirm new PIN').fill('234567');
  await scope.getByRole('button', { name: 'Verify OTP & reset PIN', exact: true }).click();
  await expect.poll(() => state.pin).toBe('234567'); await expect(guard(page)).toHaveCount(0);
});

test('login-screen PIN recovery requires email and password before phone OTP and does not sign in', async ({ page }) => {
  const { state } = await setup(page, { authenticated: false }); await page.goto('/admin/login');
  await page.getByRole('button', { name: 'Forgot privacy PIN?', exact: true }).click();
  const modal = page.getByRole('dialog');
  await modal.getByLabel('Super admin email').fill('admin@example.com'); await modal.getByLabel('Administrator password').fill('Password123!');
  await modal.getByRole('button', { name: 'Send PIN reset OTP', exact: true }).click();
  await expect.poll(() => state.requests.find(entry => entry.path === 'recovery/request')?.body).toEqual({ email: 'admin@example.com', password: 'Password123!' });
  await modal.getByLabel('SMS verification OTP').fill('000000'); await modal.getByLabel('New six-digit PIN').fill('123123'); await modal.getByLabel('Confirm new PIN').fill('123123');
  await modal.getByRole('button', { name: 'Verify OTP & reset PIN', exact: true }).click();
  await expect(modal.getByRole('alert')).toContainText('Invalid or expired');
  await modal.getByLabel('SMS verification OTP').fill('123456'); await modal.getByRole('button', { name: 'Verify OTP & reset PIN', exact: true }).click();
  await expect(modal.getByRole('status')).toContainText('Privacy PIN reset successfully'); await expect(page).toHaveURL(/\/admin\/login$/);
});

test('admin details remain hidden when initial lock status cannot be verified', async ({ page }) => {
  const { state } = await setup(page); state.failed = true;
  await page.goto('/admin/dashboard'); await expect(guard(page)).toBeVisible();
  await expect(guard(page).getByRole('alert')).toContainText('Unable to verify');
  await expect(page.getByRole('link', { name: 'Admin Dashboard', exact: true })).toHaveCount(0);
  state.failed = false; await guard(page).getByRole('button', { name: 'Retry connection', exact: true }).click();
  await expect(guard(page)).toHaveCount(0);
});


test('privacy lock fits a phone screen and supports first-time PIN setup while locked', async ({ page }) => {
  const { state } = await setup(page, { configured: false });
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/admin/profile');
  await page.getByRole('button', { name: 'Lock admin panel (F8)' }).click();
  await expect(guard(page)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await guard(page).getByLabel('Administrator password').fill('Password123!');
  await guard(page).getByLabel('New six-digit PIN').fill('001122'); await guard(page).getByLabel('Confirm new PIN').fill('001122');
  await guard(page).getByRole('button', { name: 'Set privacy PIN', exact: true }).click();
  await expect(guard(page)).toHaveCount(0); expect(state.pin).toBe('001122');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('employee accounts do not see super-admin PIN controls', async ({ page }) => {
  const { state } = await setup(page);
  const employee = { _id: '507f1f77bcf86cd799439011', role: 'admin', isEmployee: true, accessRoleActive: true, fullName: 'Employee', permissions: {} };
  for (const path of ['**/api/auth/refresh-token', '**/api/auth/me']) await page.route(path, route => route.fulfill({ json: { success: true, data: { accessToken: 'employee-token', user: employee } } }));
  await page.goto('/admin/profile'); await expect(page.getByRole('heading', { name: 'Admin Settings & Profile' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Admin privacy lock settings' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Lock admin panel (F8)' })).toHaveCount(0);
  await page.keyboard.press('F8'); await expect(guard(page)).toHaveCount(0); expect(state.requests).toHaveLength(0);
});


test('incorrect profile password does not refresh or discard the administrator session', async ({ page }) => {
  await setup(page, { configured: false }); let refreshes = 0;
  page.on('request', request => { if (new URL(request.url()).pathname.endsWith('/auth/refresh-token')) refreshes++; });
  await page.goto('/admin/profile');
  const settings = page.getByRole('region', { name: 'Admin privacy lock settings' });
  await settings.getByRole('button', { name: 'Set privacy PIN', exact: true }).click();
  const initialRefreshes = refreshes;
  await settings.getByLabel('Administrator password').fill('WrongPassword!');
  await settings.getByLabel('New six-digit PIN').fill('456456'); await settings.getByLabel('Confirm new PIN').fill('456456');
  await settings.getByRole('button', { name: 'Set privacy PIN', exact: true }).last().click();
  await expect(settings.getByRole('alert')).toContainText('password is incorrect');
  expect(refreshes).toBe(initialRefreshes); await expect(page).toHaveURL(/\/admin\/profile$/);
  await settings.getByLabel('Administrator password').fill('Password123!');
  await settings.getByRole('button', { name: 'Set privacy PIN', exact: true }).last().click();
  await expect(settings.getByRole('status')).toContainText('Privacy PIN updated');
});


test('a late status response cannot relock a successfully unlocked panel', async ({ page }) => {
  await setup(page, { locked: true }); await page.goto('/admin/dashboard');
  await expect(guard(page).getByLabel('Privacy PIN', { exact: true })).toBeVisible();
  let release, waiting = false;
  await page.route('**/api/auth/admin-privacy/status', async route => {
    waiting = true; await new Promise(resolve => { release = resolve; });
    return route.fulfill({ json: { success: true, data: { configured: true, locked: true } } });
  });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect.poll(() => waiting).toBe(true);
  await unlock(page); await expect(guard(page)).toHaveCount(0);
  const response = page.waitForResponse('**/api/auth/admin-privacy/status'); release(); await response;
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect(guard(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Lock admin panel (F8)' })).toBeVisible();
});
