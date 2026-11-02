import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';
const url = 'https://docs.google.com/spreadsheets/d/product-sheet-test-123456789/edit#gid=15';
const disconnected = { configured: true, serviceAccountEmail: 'product-sync@example.test', connected: false, defaultSpreadsheetId: '', lastResult: null };
async function setup(page, initial = disconnected, failSync = false) {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  let state = { ...initial }; const calls = [];
  await page.route('**/api/admin/products/google-sheet**', async route => {
    const req = route.request();
    if (req.method() === 'POST') {
      calls.push({ path: new URL(req.url()).pathname, body: req.postDataJSON() });
      if (req.url().endsWith('/initialize')) state = { ...state, connected: true, spreadsheetUrl: url, sheetTitle: 'ViNexus Products', lastResult: { exported: 23 } };
      else {
        if (failSync) return route.fulfill({ status: 502, json: { success: false, message: 'Google Sheets could not be reached. Retry Sync Products.' } });
        state = { ...state, lastSyncedAt: '2026-11-02T11:00:00Z', lastResult: { created: 1, updated: 2, unchanged: 20, appended: 0, failed: 1, errors: [{ row: 4, sku: 'CAM-2', message: 'Stock Quantity must be a non-negative whole number.' }] } };
      }
    }
    return route.fulfill({ json: { success: true, data: { ...state, ...(req.url().endsWith('/sync') ? { result: state.lastResult } : {}) } } });
  });
  return calls;
}

test('catalogue offers a Google Sheet workflow that initializes once, syncs and reports row errors', async ({ page }, testInfo) => {
  const calls = await setup(page);
  await page.goto('/admin/products');
  await page.getByRole('navigation', { name: 'Product management options' }).getByRole('button', { name: 'Google Sheet', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Manage Products via Google Sheet' })).toBeVisible();
  await expect(page.getByText('product-sync@example.test', { exact: true })).toBeVisible();
  await page.getByLabel('Google Sheet URL or spreadsheet ID').fill(url);
  await page.getByRole('button', { name: 'Create Product Sheet', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Open Google Sheet' })).toHaveAttribute('href', url);
  expect(calls[0].body).toEqual({ spreadsheetUrl: url });
  await page.getByRole('button', { name: 'Sync Products', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Sync results' })).toContainText('Stock Quantity must be a non-negative whole number.');
  await expect(page.getByRole('status')).toContainText('1 row to fix');
  expect(calls).toHaveLength(2);
  await page.screenshot({ path: testInfo.outputPath('product-sheet-results.png'), fullPage: true });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Create Product Sheet', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Open Google Sheet' })).toHaveAttribute('href', url);
});

test('missing credentials explain setup and prevent a fake successful sheet creation', async ({ page }) => {
  const calls = await setup(page, { ...disconnected, configured: false, serviceAccountEmail: '' });
  await page.goto('/admin/products/google-sheet');
  await expect(page.getByRole('heading', { name: 'Google Sheets setup needed' })).toBeVisible();
  await page.getByLabel('Google Sheet URL or spreadsheet ID').fill(url);
  await expect(page.getByRole('button', { name: 'Create Product Sheet', exact: true })).toBeDisabled();
  expect(calls).toHaveLength(0);
});

test('failed sync preserves the connection and enables retry', async ({ page }) => {
  await setup(page, { ...disconnected, connected: true, spreadsheetUrl: url, sheetTitle: 'ViNexus Products' }, true);
  await page.goto('/admin/products/google-sheet');
  await page.getByRole('button', { name: 'Sync Products', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Google Sheets could not be reached');
  await expect(page.getByRole('button', { name: 'Sync Products', exact: true })).toBeEnabled();
  await expect(page.getByRole('link', { name: 'Open Google Sheet' })).toHaveAttribute('href', url);
});
