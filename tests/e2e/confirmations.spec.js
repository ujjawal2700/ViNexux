import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';
import { presetConfig } from '../../shared/seasonalThemes.js';

const id = '507f1f77bcf86cd799439011';
test('theme confirmation has Cancel and Confirm actions and never opens a native browser dialog', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  let stored, mutations = 0, nativeDialogs = 0;
  page.on('dialog', async dialog => { nativeDialogs++; await dialog.dismiss(); });
  await page.route('**/api/admin/cms/themes**', route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (request.method() !== 'GET') {
      mutations++;
      if (path.endsWith('/themes')) stored = { ...request.postDataJSON(), _id: id, revision: 0 };
      else if (path.endsWith('/publish')) stored = { ...stored, published: stored.draft, revision: stored.revision + 1 };
    }
    return route.fulfill({ json: { success: true, data: path.endsWith('/themes') && request.method() === 'GET'
      ? { themes: stored ? [stored] : [], active: null } : { theme: stored } } });
  });
  await page.goto('/admin/cms/themes/new');
  await page.getByRole('button', { name: 'Apply to store', exact: true }).click();
  const popup = page.getByRole('dialog');
  await expect(popup.getByRole('heading', { name: 'Apply theme?' })).toBeVisible();
  expect(mutations).toBe(0);
  await popup.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(popup).toHaveCount(0); expect(mutations).toBe(0);
  await page.getByRole('button', { name: 'Apply to store', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(popup).toHaveCount(0); expect(mutations).toBe(0);
  await page.getByRole('button', { name: 'Apply to store', exact: true }).click();
  await popup.getByRole('button', { name: 'Apply theme', exact: true }).click();
  await expect.poll(() => mutations).toBe(3);
  expect(nativeDialogs).toBe(0);
});

test('unsaved theme edits recover after reload and use an in-app discard confirmation', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  let nativeDialogs = 0;
  page.on('dialog', async dialog => { nativeDialogs++; await dialog.dismiss(); });
  await page.route('**/api/admin/cms/themes**', route => route.fulfill({ json: { success: true, data: {
    themes: [], active: null, theme: { _id: id, name: 'Theme recovery', preset: 'diwali', draft: presetConfig('diwali'), revision: 0, schedule: { enabled: false, startAt: null, endAt: null, priority: 0 } },
  } } }));
  await page.goto(`/admin/cms/themes/${id}`);
  await page.getByLabel('Announcement', { exact: true }).fill('Keep these unsaved edits');
  await page.reload();
  await expect(page.getByLabel('Announcement', { exact: true })).toHaveValue('Keep these unsaved edits');
  await page.getByRole('button', { name: 'New theme', exact: true }).click();
  const popup = page.getByRole('dialog');
  await expect(popup.getByRole('heading', { name: 'Discard unsaved changes?' })).toBeVisible();
  await popup.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByLabel('Announcement', { exact: true })).toHaveValue('Keep these unsaved edits');
  await page.getByRole('button', { name: 'New theme', exact: true }).click();
  await popup.getByRole('button', { name: 'Discard changes', exact: true }).click();
  await expect(page).toHaveURL('/admin/cms/themes/new');
  await expect(page.getByLabel('Announcement', { exact: true })).toHaveValue(presetConfig('diwali').announcement);
  expect(nativeDialogs).toBe(0);
});

test('POS keeps the unfinished bill and its retry key when refreshing without browser prompts', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  let nativeDialogs = 0;
  page.on('dialog', async dialog => { nativeDialogs++; await dialog.dismiss(); });
  await page.goto('/admin/pos');
  await page.getByRole('button', { name: /E2E Product E2E-001/ }).click();
  await page.getByLabel('Discount (%)', { exact: true }).fill('10');
  const stored = () => page.evaluate(() => JSON.parse(sessionStorage.getItem('vinexus-pos-draft:507f1f77bcf86cd799439011')));
  await expect.poll(async () => (await stored())?.draft.items[0].discountPercent).toBe(10);
  const requestId = (await stored()).requestId;
  await page.reload();
  await expect(page.getByLabel('Discount (%)', { exact: true })).toHaveValue('10');
  expect((await stored()).requestId).toBe(requestId);
  expect(nativeDialogs).toBe(0);
});
