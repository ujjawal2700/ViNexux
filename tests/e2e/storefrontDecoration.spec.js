import { test, expect } from '@playwright/test';
import { mockApi } from './mockApi.js';
import { presetConfig } from '../../shared/seasonalThemes.js';

for (const width of [1440, 768, 390]) {
  test(`portrait banner is 3:4 with aligned horizontal banner at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 }); await mockApi(page);
    await page.route('**/api/content/theme', route => route.fulfill({ json: { success: true, data: { theme: { config: { ...presetConfig('diwali'), announcement: 'Welcome to ViNexus' } } } } }));
    await page.goto('/');
    const first = page.locator('.bento-banner-tile-1'), second = page.locator('.bento-banner-tile-2');
    await expect(second).toBeVisible();
    const a = await first.boundingBox(), b = await second.boundingBox();
    expect(Math.abs(b.width / b.height - 3 / 4)).toBeLessThan(.005);
    expect(Math.abs(a.height - b.height)).toBeLessThan(1);
    expect(Math.abs(a.y - b.y)).toBeLessThan(1);
    expect(a.width).toBeGreaterThan(b.width * 2.8);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator('.announcement-message')).toHaveText('Welcome to ViNexus');
    await page.screenshot({ path: testInfo.outputPath(`storefront-top-${width}.png`) });
    expect(await page.locator('.announcement-sparkles').first().evaluate(el => getComputedStyle(el).animationName)).toBe('announcement-twinkle');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await page.locator('.announcement-sparkles').first().evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  });
}
