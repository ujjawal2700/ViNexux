import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';

test('Product Catalog has a dedicated header positioning section with persistent assignment order', async ({ page }, testInfo) => {
  await mockApi(page);
  await seedBrowserSession(page, 'admin');
  let sequence = 0;
  let failSave = false;
  const categories = ['Cameras', 'Networking', 'Storage'].map((name, index) => ({
    _id: String(index + 1).padStart(24, '0'), name, isActive: true, parentId: null, productPriority: null, productPositionSequence: null,
  }));
  await page.route('**/api/admin/products/positioning**', async route => {
    if (route.request().method() === 'PUT') {
      if (failSave) return route.fulfill({ status: 500, json: { success: false, message: 'Save failed. Please retry.' } });
      const category = categories.find(row => route.request().url().endsWith(row._id));
      const { productPriority } = route.request().postDataJSON();
      if (category.productPriority !== productPriority) {
        category.productPriority = productPriority;
        category.productPositionSequence = productPriority === null ? null : ++sequence;
      }
      return route.fulfill({ json: { success: true, data: category } });
    }
    return route.fulfill({ json: { success: true, data: { categories } } });
  });
  await page.goto('/admin/products');
  await page.getByRole('button', { name: 'Product Positioning', exact: true }).click();
  await expect(page).toHaveURL('/admin/products/positioning');
  await expect(page.getByRole('heading', { name: 'Product Positioning', exact: true })).toBeVisible();
  const list = page.getByRole('list', { name: 'Header category product order' });
  const names = () => list.getByRole('heading').allTextContents();
  const save = async (name, value) => {
    await page.getByRole('spinbutton', { name: `Position for ${name}`, exact: true }).fill(value);
    await page.getByRole('button', { name: `Save position for ${name}`, exact: true }).click();
    await expect(page.getByRole('status')).toHaveText(`${name} product position saved.`);
  };
  await expect(list.getByRole('listitem')).toHaveCount(3);
  await save('Networking', '1');
  await save('Cameras', '1');
  expect(await names()).toEqual(['Networking', 'Cameras', 'Storage']);
  await save('Networking', '1');
  expect(sequence).toBe(2);
  await page.reload();
  await expect(list.getByRole('heading').first()).toHaveText('Networking');
  await expect(page.getByRole('spinbutton', { name: 'Position for Cameras', exact: true })).toHaveValue('1');
  await save('Networking', '2');
  expect(await names()).toEqual(['Cameras', 'Networking', 'Storage']);
  await save('Networking', '1');
  expect(await names()).toEqual(['Cameras', 'Networking', 'Storage']);
  await save('Cameras', '0');
  await save('Cameras', '');
  expect(categories[0].productPriority).toBeNull();
  expect(await names()).toEqual(['Networking', 'Cameras', 'Storage']);
  failSave = true;
  await page.getByRole('spinbutton', { name: 'Position for Storage', exact: true }).fill('0');
  await page.getByRole('button', { name: 'Save position for Storage', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Save failed');
  expect(await names()).toEqual(['Networking', 'Cameras', 'Storage']);
  await page.screenshot({ path: testInfo.outputPath('positioning-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: testInfo.outputPath('positioning-mobile.png'), fullPage: true });
});
