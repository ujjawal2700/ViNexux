import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';

for (const effect of ['left-to-right', 'right-to-left', 'top-to-bottom', 'bottom-to-top']) {
  test(`${effect} keeps both images opaque and touching throughout the swipe`, async ({ page }) => {
    await mockApi(page);
    await seedBrowserSession(page, 'storefront');
    await page.route('**/swipe-test/*.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="900" height="600" fill="#800020"/></svg>' }));
    await page.route('**/api/content/banner-grid', route => route.fulfill({ json: { success: true, data: { grid: {
      configured: true, sections: Array.from({ length: 4 }, (_, section) => ({ transition: effect, images: [0, 1].map(i => ({ _id: `${section}-${i}`, url: `/swipe-test/${i}.svg`, fit: 'cover' })) })),
    } } } }));
    await page.goto('/');
    const tile = page.locator('.bento-banner-tile-1');
    await expect(tile.locator('img').first()).toBeVisible();
    await expect(tile.locator('.is-entering')).toHaveCount(0);
    await tile.getByRole('button', { name: 'Next image in section 1', exact: true }).click();
    const frames = await tile.evaluate(el => {
      const incoming = el.querySelector('.is-entering');
      const outgoing = el.querySelector('.is-leaving');
      const animations = [incoming, outgoing].map(node => node.getAnimations()[0]);
      return [60, 300, 540].map(time => {
        animations.forEach(animation => { animation.pause(); animation.currentTime = time; });
        const a = incoming.getBoundingClientRect(), b = outgoing.getBoundingClientRect();
        const horizontal = incoming.className.includes('left-to-right') || incoming.className.includes('right-to-left');
        return {
          incomingOpacity: getComputedStyle(incoming).opacity,
          outgoingOpacity: getComputedStyle(outgoing).opacity,
          seam: horizontal ? Math.min(Math.abs(a.right - b.left), Math.abs(b.right - a.left)) : Math.min(Math.abs(a.bottom - b.top), Math.abs(b.bottom - a.top)),
        };
      });
    });
    for (const frame of frames) {
      expect(frame.incomingOpacity).toBe('1');
      expect(frame.outgoingOpacity).toBe('1');
      expect(frame.seam).toBeLessThan(1);
    }
    await tile.evaluate(el => el.querySelectorAll('.bento-banner-slide').forEach(node => node.getAnimations().forEach(animation => animation.finish())));
    await expect(tile.locator('.is-leaving')).toHaveCount(0);
    await tile.getByRole('button', { name: 'Previous image in section 1', exact: true }).click();
    await expect(tile.locator('img.is-active')).toHaveAttribute('src', '/swipe-test/0.svg');
  });
}
