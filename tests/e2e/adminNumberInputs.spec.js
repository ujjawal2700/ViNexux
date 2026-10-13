import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';

test.beforeEach(async ({ page }) => {
  await mockApi(page);
  await seedBrowserSession(page, 'admin');
});

test('POS zero values can be replaced directly, cleared and edited as decimals', async ({ page }) => {
  await page.goto('/admin/pos');
  await page.getByRole('button', { name: /E2E Product E2E-001/ }).click();
  const price = page.getByLabel('Unit price (₹)', { exact: true });
  await price.fill('0');
  await price.blur();
  await expect(price).toHaveValue('0');
  await price.click();
  await expect(price).toHaveValue('');
  await price.pressSequentially('12');
  await expect(price).toHaveValue('12');
  await price.blur();
  await expect(price).toHaveValue('12');

  await price.fill('');
  await expect(price).toHaveValue('');
  await price.pressSequentially('0.5');
  await expect(price).toHaveValue('0.5');
  await price.blur();
  await expect(price).toHaveValue('0.5');

  await price.fill('0012.50');
  await expect(price).toHaveValue('12.50');
  await price.blur();
  await expect(price).toHaveValue('12.5');

  const discount = page.getByLabel('Discount (%)', { exact: true });
  await discount.click();
  await discount.pressSequentially('5');
  await expect(discount).toHaveValue('5');
  await discount.fill('101');
  await discount.blur();
  await expect(discount).toHaveValue('100');

  const quantity = page.getByLabel('E2E Product quantity', { exact: true });
  await quantity.fill('');
  await expect(quantity).toHaveValue('');
  await quantity.pressSequentially('2');
  await quantity.blur();
  await expect(quantity).toHaveValue('2');
  await page.getByRole('button', { name: 'Increase E2E Product quantity', exact: true }).click();
  await expect(quantity).toHaveValue('3');
});

test('shared number fields in admin portal dialogs use the same editing behavior', async ({ page }) => {
  await page.goto('/admin/brands');
  await page.getByRole('button', { name: 'Add Brand', exact: true }).click();
  const sort = page.getByRole('dialog').locator('input[type="number"]');
  await expect(sort).toHaveValue('0');
  await sort.click();
  await expect(sort).toHaveValue('');
  await sort.pressSequentially('12');
  await expect(sort).toHaveValue('12');
  await sort.fill('0008');
  await expect(sort).toHaveValue('8');
  await sort.blur();
  await expect(sort).toHaveValue('8');
});

test('native theme number fields keep a blank edit instead of restoring zero on each keystroke', async ({ page }) => {
  await page.goto('/admin/cms/themes/507f1f77bcf86cd799439011');
  await page.getByText('Schedule for later', { exact: true }).click();
  const priority = page.getByLabel('Priority (0–100)', { exact: true });
  await expect(priority).toHaveValue('0');
  await priority.click();
  await priority.pressSequentially('12');
  await expect(priority).toHaveValue('12');
  await priority.fill('');
  await expect(priority).toHaveValue('');
  await priority.blur();
  await expect(priority).toHaveValue('0');
});
