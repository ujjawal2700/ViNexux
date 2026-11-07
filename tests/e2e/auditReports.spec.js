import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';

const id = '507f1f77bcf86cd799439011';
const log = { _id: id, actor: { name: 'Asha Singh', email: 'asha@example.test', roleName: 'Catalog editor' }, entity: 'Product', operation: 'updateOne', status: 'applied', section: 'products', createdAt: '2026-11-07T07:30:00Z', documents: [{ id, before: { name: 'Ethernet Cable', modelNumber: 'CAT6' }, after: { name: 'Ethernet Cable', modelNumber: 'CAT6' }, changes: [{ field: 'standardPrice', before: 150, after: 175 }, { field: 'variants', before: [{ _id: 'v1', name: '5m', stockQuantity: 5 }], after: [{ _id: 'v1', name: '5m', stockQuantity: 10 }] }] }] };

test('logbook explains who changed each product and exports the same date and daily-time filters', async ({ page }, testInfo) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  const exports = [], queries = []; let fail = false;
  await page.route('**/api/admin/access/logs**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/export')) {
      exports.push(Object.fromEntries(url.searchParams));
      if (fail) return route.fulfill({ status: 413, json: { success: false, message: 'Narrow your filters to export this report.' } });
      return route.fulfill({ contentType: url.searchParams.get('format') === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', body: Buffer.from('test-download') });
    }
    if (url.pathname.endsWith(`/${id}`)) return route.fulfill({ json: { success: true, data: { log } } });
    queries.push(Object.fromEntries(url.searchParams));
    return route.fulfill({ json: { success: true, data: { logs: [log], total: 26, pages: 2, page: 1 } } });
  });
  await page.goto('/admin/logbook');
  await expect(page.getByText('Updated Ethernet Cable (CAT6)', { exact: true })).toBeVisible();
  await expect(page.getByText('Asha Singh', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Inspect changes', exact: true }).click();
  const modal = page.getByRole('dialog');
  await expect(modal.getByRole('heading', { name: 'Retail price', exact: true })).toBeVisible();
  await expect(modal).toContainText('INR 150'); await expect(modal).toContainText('INR 175');
  await expect(modal).toContainText('Variants / 5m / Stock quantity');
  await expect(modal.locator('pre')).toHaveCount(0);
  await expect(modal).not.toContainText('updateOne');
  await modal.screenshot({ path: testInfo.outputPath('readable-change-details.png') });
  await page.getByRole('button', { name: 'Close modal' }).click();
  await page.getByLabel('From date (IST)', { exact: true }).fill('2026-11-07');
  await page.getByLabel('To date (IST)', { exact: true }).fill('2026-11-07');
  await page.getByLabel('Time from (IST)', { exact: true }).fill('12:00');
  await page.getByLabel('Time to (IST)', { exact: true }).fill('18:00');
  await page.getByPlaceholder('Person, product, model, SKU or account').fill('Ethernet');
  await expect(page.getByRole('button', { name: 'Export PDF', exact: true })).toBeEnabled();
  await expect.poll(() => queries.at(-1)?.endTime).toBe('18:00');
  const filters = { from: '2026-11-06T18:30:00.000Z', to: '2026-11-07T18:29:59.999Z', startTime: '12:00', endTime: '18:00', search: 'Ethernet' };
  expect(queries.at(-1)).toMatchObject(filters);
  for (const [format, name] of [['pdf', 'Export PDF'], ['xlsx', 'Export Excel']]) {
    const downloaded = page.waitForEvent('download');
    await page.getByRole('button', { name, exact: true }).click();
    expect((await downloaded).suggestedFilename()).toMatch(new RegExp(`\\.${format}$`));
    expect(exports.at(-1)).toEqual({ ...filters, format });
  }
  fail = true; await page.getByRole('button', { name: 'Export PDF', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Narrow your filters');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: testInfo.outputPath('mobile-logbook-filters.png'), fullPage: true });
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await expect(page.getByLabel('Time from (IST)', { exact: true })).toHaveValue('');
});

test('bulk log rows stay compact and a click anywhere or Enter fetches details only once', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin'); let inspected = 0;
  const bulk = { ...log, documents: Array.from({ length: 91 }, (_, i) => ({ ...log.documents[0], id: `product-${i}`, before: { name: `Camera ${i}` }, after: { name: `Camera ${i}` } })) };
  await page.route('**/api/admin/access/logs**', route => {
    const detail = new URL(route.request().url()).pathname.endsWith(`/${id}`);
    if (detail) inspected++;
    return route.fulfill({ json: { success: true, data: detail ? { log: bulk } : { logs: [bulk], total: 1, pages: 1 } } });
  });
  await page.goto('/admin/logbook');
  const row = page.getByRole('button', { name: 'Inspect Updated 91 product records by Asha Singh', exact: true });
  await expect(row).toContainText('Updated 91 product records');
  expect((await row.innerText()).length).toBeLessThan(350);
  await expect(row).not.toContainText('Camera 90'); expect(inspected).toBe(0);
  await row.click(); await expect(page.getByRole('dialog')).toBeVisible(); expect(inspected).toBe(1);
  await page.getByRole('button', { name: 'Close modal' }).click();
  await row.focus(); await row.press('Enter'); await expect(page.getByRole('dialog')).toBeVisible(); expect(inspected).toBe(2);
});
