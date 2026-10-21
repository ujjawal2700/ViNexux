import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';

test('category choices retain typed commas and save separate values across reload', async ({ page }) => {
  await mockApi(page);
  await seedBrowserSession(page, 'admin');
  const category = {
    _id: '507f1f77bcf86cd799439011', name: 'Storage', slug: 'storage', parentId: null, isActive: true,
    filterDefinitions: [{ key: 'storage_capacity', label: 'Storage Capacity', inputType: 'multi-select', options: ['32 GB'], isFilterable: true }],
  };
  let saved;
  await page.route('**/api/admin/categories**', route => {
    if (route.request().method() === 'PUT') {
      saved = route.request().postDataJSON();
      Object.assign(category, saved);
      return route.fulfill({ json: { success: true, data: category } });
    }
    return route.fulfill({ json: { success: true, data: { categories: [category] } } });
  });
  await page.goto('/admin/categories/header');
  await page.getByTitle('Edit Header Category', { exact: true }).click();
  const choices = page.getByRole('dialog').getByLabel(/^Available Choices/);
  await expect(page.getByRole('dialog').locator('input').first()).toBeFocused();
  await choices.fill('32 GB');
  await choices.pressSequentially(',');
  await expect(choices).toHaveValue('32 GB,');
  await choices.pressSequentially(' 64 GB, 128 GB,');
  await expect(choices).toHaveValue('32 GB, 64 GB, 128 GB,');
  await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
  await expect.poll(() => saved?.filterDefinitions[0].options).toEqual(['32 GB', '64 GB', '128 GB']);
  await page.reload();
  await page.getByTitle('Edit Header Category', { exact: true }).click();
  await expect(choices).toHaveValue('32 GB, 64 GB, 128 GB');
  // Pasting, empty entries and surrounding spaces normalize when leaving the field.
  await choices.fill('16 GB, , 32 GB,  64 GB, ');
  await choices.press('Tab');
  await expect(choices).toHaveValue('16 GB, 32 GB, 64 GB');
  await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
  await expect.poll(() => saved?.filterDefinitions[0].options).toEqual(['16 GB', '32 GB', '64 GB']);
});
