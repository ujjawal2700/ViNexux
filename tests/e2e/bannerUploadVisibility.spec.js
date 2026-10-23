import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';

const file = { name: 'banner.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400"><rect width="1200" height="400" fill="red"/></svg>') };

for (const viewport of [{ width: 1600, height: 720 }, { width: 390, height: 844 }]) test(`banner upload and replacement keep the admin viewport visible at ${viewport.width}px`, async ({ page }, testInfo) => {
  await page.setViewportSize(viewport);
  await mockApi(page); await seedBrowserSession(page, 'admin');
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const grid = { revision: 0, configured: true, sections: Array.from({ length: 2 }, (_, section) => ({ transition: 'fade', images: Array.from({ length: 3 }, (_, index) => ({ _id: `${section}${index}`.padStart(24, '0'), url: '/upload-test/banner.svg', title: '', fit: 'cover' })) })) };
  await page.route('**/upload-test/banner.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: file.buffer }));
  await page.route('**/api/admin/cms/banner-grid**', async route => {
    if (route.request().method() === 'POST') {
      if (new URL(route.request().url()).pathname.endsWith('/images')) grid.sections[0].images.push({ _id: String(grid.revision + 10).padStart(24, '0'), url: '/upload-test/banner.svg', fit: 'cover' });
      grid.revision++;
    }
    await route.fulfill({ json: { success: true, data: { grid } } });
  });
  await page.goto('/admin/cms/banners');
  const panel = page.getByRole('group', { name: 'Manage banner section 1', exact: true });
  for (let i = 0; i < 2; i++) {
    const input = page.getByLabel('Upload images for section 1', { exact: true });
    const chooser = page.waitForEvent('filechooser');
    await input.locator('..').click();
    await (await chooser).setFiles(file);
    await page.getByRole('dialog').getByRole('button', { name: 'Upload 1 banner', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(panel.getByText(`${4 + i}/5 images`, { exact: true })).toBeVisible();
    const state = await page.evaluate(() => ({ windowY: window.scrollY, root: document.querySelector('#root').scrollTop, panel: document.querySelector('.admin-panel').scrollTop, main: document.querySelector('main').getBoundingClientRect().toJSON() }));
    await page.screenshot({ path: testInfo.outputPath(`after-upload-${i}.png`) });
    expect(errors).toEqual([]);
    expect(state.windowY).toBe(0);
    expect(state.panel).toBe(0);
    await expect(page.getByRole('button', { name: 'Refresh entire panel' })).toBeInViewport();
  }
  const replacement = panel.getByLabel('Replace banner image', { exact: true }).first();
  const chooser = page.waitForEvent('filechooser');
  await replacement.locator('..').click();
  await (await chooser).setFiles(file);
  await page.getByRole('dialog').getByRole('button', { name: 'Upload 1 banner', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Refresh entire panel' })).toBeInViewport();
  expect(await page.locator('.admin-panel').evaluate(el => el.scrollTop)).toBe(0);
  expect(errors).toEqual([]);
});
