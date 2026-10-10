import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jY9kAAAAASUVORK5CYII=', 'base64');
const emptyGrid = () => ({ revision: 0, configured: false, sections: Array.from({ length: 4 }, () => ({ images: [] })) });
const artwork = (section, n) => `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600"><defs><linearGradient id="g"><stop stop-color="${['#143049', '#234b47', '#542a48', '#493823'][section]}"/><stop offset="1" stop-color="#101c29"/></linearGradient></defs><rect width="900" height="600" fill="url(#g)"/><circle cx="750" cy="140" r="200" fill="white" opacity=".07"/><circle cx="710" cy="450" r="140" fill="white" opacity=".08"/><text x="60" y="220" font-family="sans-serif" font-size="22" fill="#ffffff" opacity=".65">VINEXUS COLLECTIONS</text><text x="60" y="290" font-family="sans-serif" font-size="48" fill="#ffffff">${['Security solutions', 'Network essentials', 'New arrivals', 'Smart accessories'][section]}</text><text x="60" y="345" font-family="sans-serif" font-size="22" fill="#ffffff" opacity=".8">Banner ${n + 1}</text></svg>`;

test('admin uploads three images per section, edits and replaces; independent bento carousels render', async ({ page }, testInfo) => {
  test.setTimeout(60000);
  await page.clock.install(); await mockApi(page); await seedBrowserSession(page, 'admin');
  let grid = emptyGrid(), counter = 0;
  await page.route('**/bento-test/*.svg', route => {
    const [section, n] = new URL(route.request().url()).pathname.split('/').at(-1).replace('.svg', '').split('-').map(Number);
    return route.fulfill({ contentType: 'image/svg+xml', body: artwork(section, n) });
  });
  await page.route('**/api/content/banner-grid', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: { grid } }) }));
  await page.route('**/api/admin/cms/banner-grid**', async route => {
    const request = route.request(), parts = new URL(request.url()).pathname.split('/');
    if (request.method() !== 'GET') {
      const section = Number(parts[5]), images = grid.sections[section].images, id = parts[7];
      if (request.method() === 'PUT' && !id) grid.sections[section].transition = request.postDataJSON().transition;
      else if (request.method() === 'POST') {
        if (id) images.find(i => i._id === id).url = `/bento-test/${section}-9.svg`;
        else images.push({ _id: String(++counter).padStart(24, '0'), url: `/bento-test/${section}-${images.length}.svg`, title: '', link: '', fit: 'cover' });
        grid.configured = true;
      } else if (request.method() === 'PUT') Object.assign(images.find(i => i._id === id), request.postDataJSON());
      else grid.sections[section].images = images.filter(i => i._id !== id);
      grid.revision++;
    }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: { grid } }) });
  });
  await page.goto('/admin/cms/banners');
  await expect(page.getByRole('heading', { name: 'Homepage bento grid', exact: true })).toBeVisible();
  const files = n => Array.from({ length: n }, (_, i) => ({ name: `banner-${i}.png`, mimeType: 'image/png', buffer: png }));
  for (let section = 0; section < 4; section++) {
    await page.getByLabel(`Upload images for section ${section + 1}`, { exact: true }).setInputFiles(files(section === 0 ? 3 : section === 1 ? 2 : 1));
    await page.getByRole('button', { name: /^Upload \d banners?$/ }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const panel = page.getByRole('group', { name: `Manage banner section ${section + 1}`, exact: true });
    await expect(panel.getByText(`${section === 0 ? 3 : section === 1 ? 2 : 1}/3 images`, { exact: true })).toBeVisible();
  }
  await expect(page.getByLabel('Upload images for section 1', { exact: true })).toBeDisabled();
  const firstPanel = page.locator('[aria-label="Manage banner section 1"]');
  await firstPanel.getByLabel('Banner caption', { exact: true }).first().fill('Explore security');
  await firstPanel.getByLabel('Banner destination', { exact: true }).first().fill('/products');
  await firstPanel.getByRole('button', { name: 'Save banner details', exact: true }).first().click();
  await expect(page.getByRole('status').filter({ hasText: 'Homepage banner grid updated.' })).toBeVisible();
  await firstPanel.getByLabel('Replace banner image', { exact: true }).first().setInputFiles(files(1));
  await page.getByRole('button', { name: 'Upload 1 banner', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(firstPanel.locator('img').first()).toHaveAttribute('src', '/bento-test/0-9.svg');
  await firstPanel.getByRole('button', { name: 'Preview / crop & adjust', exact: true }).first().click();
  const crop = page.getByRole('dialog');
  await crop.getByLabel('Zoom', { exact: true }).focus(); await page.keyboard.press('End');
  await crop.getByLabel('Horizontal position', { exact: true }).focus(); await page.keyboard.press('Home');
  await crop.getByLabel('Vertical position', { exact: true }).focus(); await page.keyboard.press('End');
  await expect(crop.locator('[data-preview-section="1"] img')).toHaveCSS('object-position', '0% 100%');
  await expect(crop.locator('[data-preview-section="1"] img')).toHaveCSS('transform', 'matrix(3, 0, 0, 3, 0, 0)');
  await crop.getByRole('button', { name: 'Mobile preview', exact: true }).click();
  await crop.screenshot({ path: testInfo.outputPath('banner-crop-mobile-preview.png') });
  await crop.getByRole('button', { name: 'Save crop & adjustments', exact: true }).click();
  await expect(crop).toHaveCount(0);
  expect(grid.sections[0].images[0].zoom).toBe(3);
  expect(grid.sections[0].images[0].positionX).toBe(0);
  await firstPanel.getByRole('button', { name: 'Preview / crop & adjust', exact: true }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Reset crop', exact: true }).click();
  await expect(page.getByRole('dialog').getByLabel('Zoom', { exact: true })).toHaveValue('1');
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(grid.sections[0].images[0].zoom).toBe(3);
  await firstPanel.getByLabel('Transition effect for section 1').selectOption('left-to-right');
  await expect(firstPanel.getByLabel('Transition effect for section 1')).toHaveValue('left-to-right');
  const secondPanel = page.getByRole('group', { name: 'Manage banner section 2', exact: true });
  await secondPanel.getByLabel('Transition effect for section 2').selectOption('blur');
  await expect(secondPanel.getByLabel('Transition effect for section 2')).toHaveValue('blur');
  await page.goto('/'); await page.mouse.move(0, 0);
  await expect(page.locator('.bento-banner-tile-1 .bento-banner-slide.is-current')).toHaveClass(/effect-left-to-right/);
  await expect(page.locator('.bento-banner-tile-2 .bento-banner-slide.is-current')).toHaveClass(/effect-blur/);

  const hero = page.getByRole('region', { name: 'Featured collections', exact: true });
  await expect(hero.locator('.bento-banner-tile')).toHaveCount(4);
  await expect(hero.locator('.bento-banner-tile-1 .is-active')).toHaveAttribute('src', '/bento-test/0-9.svg');
  await expect(hero.locator('.bento-banner-tile-1 img').first()).toHaveCSS('object-position', '0% 100%');
  await page.clock.fastForward(6500);
  await expect(hero.locator('.bento-banner-tile-1 .is-active')).toHaveAttribute('src', '/bento-test/0-1.svg');
  await expect(hero.locator('.bento-banner-tile-2 .is-active')).toHaveAttribute('src', '/bento-test/1-1.svg');
  const firstTile = hero.locator('.bento-banner-tile-1');
  await expect(firstTile.locator('.bento-banner-controls button')).toHaveCount(2);
  await expect(firstTile.locator('.bento-banner-controls')).not.toContainText(/\d/);
  await firstTile.hover();
  await page.clock.fastForward(12000);
  await expect(firstTile.locator('.is-active')).toHaveAttribute('src', '/bento-test/0-1.svg');
  await firstTile.getByRole('button', { name: 'Next image in section 1', exact: true }).click();
  await expect(firstTile.locator('.is-active')).toHaveAttribute('src', '/bento-test/0-2.svg');
  await page.mouse.move(0, 0);
  await hero.screenshot({ path: testInfo.outputPath('bento-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  const tiles = await hero.locator('.bento-banner-tile').all();
  const boxes = await Promise.all(tiles.map(t => t.boundingBox()));
  expect(Math.abs(boxes[0].y - boxes[1].y)).toBeLessThan(2);
  expect(boxes[2].y).toBeGreaterThan(boxes[0].y);
  expect(boxes[1].x).toBeGreaterThan(boxes[0].x);
  expect(await hero.evaluate(el => el.scrollWidth)).toBeLessThanOrEqual(390);
  await expect(tiles[0]).toHaveCSS('border-radius', '8px');
  await hero.screenshot({ path: testInfo.outputPath('bento-mobile.png') });
});

test('homepage ignores legacy CMS banners and displays four empty collection tiles', async ({ page }) => {
  await page.clock.install(); await page.emulateMedia({ reducedMotion: 'reduce' });
  await mockApi(page); await seedBrowserSession(page, 'storefront');
  let legacyBannerRequests = 0;
  await page.route('**/api/content/banners', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: { banners: Array.from({ length: 8 }, (_, i) => ({ _id: String(i), image: { url: `/theme-assets/holi/header.svg?image=${i}` }, isActive: true })) } }) }));
  page.on('request', request => { if (new URL(request.url()).pathname.endsWith('/api/content/banners')) legacyBannerRequests++; });
  await page.goto('/');
  const hero = page.locator('.hero-bento-grid');
  await expect(hero.locator('.bento-banner-tile')).toHaveCount(4);
  await expect(hero.locator('img')).toHaveCount(0);
  await expect(hero.getByText('Explore our range', { exact: true })).toBeVisible();
  await expect(hero.getByLabel('Next image in section 1')).toHaveCount(0);
  expect(legacyBannerRequests).toBe(0);
});
