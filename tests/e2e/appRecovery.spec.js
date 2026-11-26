import { test, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { mockApi, seedBrowserSession } from './mockApi.js';
const preview = process.env.PLAYWRIGHT_PREVIEW === '1';

test('application-level failures use a recovery screen outside auth providers', async ({ page }, testInfo) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  const fault = preview ? '**/assets/AdminLayout-*.js' : '**/src/layouts/AdminLayout.jsx*';
  await page.route(fault, route => route.fulfill({ contentType: 'application/javascript', body: 'export default function AdminLayout() { throw new Error("useAuth must be used within an AuthProvider"); }' }));
  await page.goto('/admin/dashboard');
  await expect(page.getByRole('heading', { name: 'This page ran into a problem' })).toBeVisible();
  await expect(page.getByText('Unexpected Application Error!', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Hey developer', { exact: false })).toHaveCount(0);
  await expect(page.getByText('Page: /admin/dashboard')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Go back', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('application-error-recovery.png') });
  await page.getByText('Error details', { exact: true }).click();
  await expect(page.getByText('useAuth must be used within an AuthProvider', { exact: true })).toBeVisible();
  await page.unroute(fault); await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Lock admin panel (F8)' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('vinexus_admin_refresh_token'))).toBe('admin-refresh');
});

test('a genuinely missing auth provider also gets the router recovery screen', async ({ page }) => {
  test.skip(preview, 'This development regression replaces the unbundled root App module.');
  await mockApi(page); await seedBrowserSession(page, 'admin');
  await page.route('**/src/App.jsx*', route => route.fulfill({ contentType: 'application/javascript', body: 'import ProtectedRoute from "/src/routes/ProtectedRoute.jsx"; export default ProtectedRoute;' }));
  await page.goto('/admin/dashboard');
  await expect(page.getByRole('heading', { name: 'This page ran into a problem' })).toBeVisible();
  await page.getByText('Error details', { exact: true }).click();
  await expect(page.getByText('useAuth must be used within an AuthProvider', { exact: true })).toBeVisible();
});

test('editing the auth provider during development preserves context and the open bill draft', async ({ page }) => {
  test.skip(preview, 'Hot reload is specific to the development server.');
  await mockApi(page); await seedBrowserSession(page, 'admin');
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/admin/pos');
  await page.getByRole('button', { name: /E2E Product E2E-001/ }).click();
  await page.getByRole('button', { name: /Add customer details/ }).click();
  await page.getByRole('dialog').getByLabel('Customer name *', { exact: true }).fill('Preserved hot reload draft');
  const file = new URL('../../frontend/src/context/AuthContext.jsx', import.meta.url);
  const marker = '\n// Auth provider hot-reload regression fixture\n';
  const original = await readFile(file, 'utf8');
  try {
    const updated = page.waitForResponse(response => new URL(response.url()).pathname === '/src/context/AuthContext.jsx' && new URL(response.url()).searchParams.has('t'));
    await writeFile(file, original + marker); await updated;
    await expect(page.getByRole('dialog').getByLabel('Customer name *', { exact: true })).toHaveValue('Preserved hot reload draft');
    await expect(page.getByRole('heading', { name: 'This page ran into a problem' })).toHaveCount(0);
    expect(errors).toEqual([]);
  } finally {
    const current = await readFile(file, 'utf8');
    if (current.includes(marker)) await writeFile(file, current.replace(marker, ''));
  }
});
