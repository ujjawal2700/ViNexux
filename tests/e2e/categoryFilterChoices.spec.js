import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';
const root = '507f1f77bcf86cd799439011', main = '507f1f77bcf86cd799439012', sub = '507f1f77bcf86cd799439013';
for (const [route, title, target] of [['header', 'Header', root], ['main', 'Main', main], ['sub', 'Sub', sub]]) {
  test(`${title} category editing has no legacy filter builder and preserves stored definitions`, async ({ page }) => {
    await mockApi(page); await seedBrowserSession(page, 'admin');
    const definitions = [{ key: 'storage_capacity', label: 'Storage Capacity', inputType: 'multi-select', options: ['32 GB'], isFilterable: true }];
    const categories = [
      { _id: root, name: 'Storage', slug: 'storage', parentId: null, isActive: true, filterDefinitions: definitions },
      { _id: main, name: 'Memory', slug: 'memory', parentId: root, isActive: true, filterDefinitions: definitions },
      { _id: sub, name: 'Micro SD', slug: 'micro-sd', parentId: main, isActive: true, filterDefinitions: definitions },
    ];
    let saved;
    await page.route('**/api/admin/categories**', route => {
      if (route.request().method() === 'PUT') {
        saved = route.request().postDataJSON(); const category = categories.find(item => item._id === target); Object.assign(category, saved);
        return route.fulfill({ json: { success: true, data: category } });
      }
      return route.fulfill({ json: { success: true, data: { categories } } });
    });
    await page.goto(`/admin/categories/${route}`);
    await page.getByTitle(`Edit ${title} Category`, { exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByLabel(/^Available Choices/)).toHaveCount(0);
    await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
    await expect.poll(() => saved).toBeTruthy();
    expect(saved).not.toHaveProperty('filterDefinitions');
    expect(categories.find(item => item._id === target).filterDefinitions).toEqual(definitions);
  });
}
