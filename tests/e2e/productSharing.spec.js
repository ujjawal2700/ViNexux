import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';
const id = '507f1f77bcf86cd799439011';
const product = { _id: id, name: 'HONEYLINK 3MP Wi-Fi Robot Pan Tilt Camera', modelNumber: 'W127', sku: 'CAM-1', stockQuantity: 10, standardPrice: 1500, isActive: true, images: [], specifications: [] };
async function setup(page, { native = true, copyFails = false, shareFails = false } = {}) {
  await mockApi(page); await seedBrowserSession(page, 'storefront');
  await page.route(`**/api/products/${id}`, route => route.fulfill({ json: { success: true, data: product } }));
  await page.addInitScript(({ native, copyFails, shareFails }) => {
    window.copiedTexts = []; window.sharedProducts = [];
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { if (copyFails) throw new DOMException('Clipboard denied', 'NotAllowedError'); window.copiedTexts.push(text); } } });
    Object.defineProperty(navigator, 'share', { configurable: true, value: native ? async data => { window.sharedProducts.push(data); if (shareFails) throw new DOMException('Cancelled', 'AbortError'); } : undefined });
    document.execCommand = () => false;
  }, { native, copyFails, shareFails });
  await page.goto(`/products/${id}?utm_source=test`);
  await expect(page.getByRole('heading', { name: product.name, exact: true })).toBeVisible();
}
test('Share Product copies the public link and invokes device sharing without price or customer details', async ({ page }) => {
  await setup(page);
  await page.getByRole('button', { name: 'Share Product', exact: true }).click();
  await expect(page.getByText('Product shared and link copied!', { exact: true })).toBeVisible();
  const result = await page.evaluate(() => ({ copied: window.copiedTexts, shared: window.sharedProducts }));
  expect(result.copied).toHaveLength(1); expect(result.shared).toEqual([{ title: product.name, url: result.copied[0] }]);
  expect(new URL(result.copied[0]).pathname).toBe(`/products/${id}`); expect(new URL(result.copied[0]).search).toBe('');
});
test('without native sharing the product link is copied for pasting into another app', async ({ page }) => {
  await setup(page, { native: false }); await page.getByRole('button', { name: 'Share Product', exact: true }).click();
  await expect(page.getByText('Product link copied. Paste it into any app to share.', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.copiedTexts.length)).toBe(1);
});
test('Copy Name and Copy Link report success only after the clipboard write succeeds', async ({ page }) => {
  await setup(page);
  await page.getByRole('button', { name: 'Copy Product Name', exact: true }).click();
  await expect(page.getByText('Product name copied to clipboard!', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Copy Product Link', exact: true }).click();
  await expect(page.getByText('Product link copied to clipboard!', { exact: true })).toBeVisible();
  expect((await page.evaluate(() => window.copiedTexts))[0]).toBe(product.name);
});
test('blocked clipboard never shows a false copied state and cancelled sharing remains usable', async ({ page }) => {
  await setup(page, { copyFails: true, shareFails: true });
  const copy = page.getByRole('button', { name: 'Copy Product Link', exact: true });
  await copy.click(); await expect(page.getByText('Could not copy the link. Please copy the product address from your browser.', { exact: true })).toBeVisible();
  await expect(copy).toContainText('Copy Link');
  const share = page.getByRole('button', { name: 'Share Product', exact: true }); await share.click(); await expect(share).toBeEnabled();
  expect(await page.evaluate(() => window.copiedTexts)).toEqual([]);
});
test('all four labelled actions stay on one line at desktop, tablet and mobile widths', async ({ page }, testInfo) => {
  await setup(page);
  const actions = page.getByRole('group', { name: 'Product actions', exact: true });
  for (const width of [1920, 1440, 1280, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const buttons = actions.getByRole('button'); await expect(buttons).toHaveCount(4);
    const boxes = await buttons.evaluateAll(elements => elements.map(element => { const box = element.getBoundingClientRect(); return { top: box.top, right: box.right, left: box.left, clipped: element.scrollWidth > element.clientWidth + 1 }; }));
    expect(Math.max(...boxes.map(box => box.top)) - Math.min(...boxes.map(box => box.top))).toBeLessThan(2);
    expect(boxes.every(box => !box.clipped && box.left >= 0 && box.right <= width)).toBe(true);
    expect(await actions.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    if (width === 1440 || width === 390) await actions.screenshot({ path: testInfo.outputPath(`product-actions-${width}.png`) });
  }
});
