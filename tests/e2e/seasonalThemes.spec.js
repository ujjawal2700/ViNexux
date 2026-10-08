import { test, expect } from '@playwright/test';
import { mockApi, seedBrowserSession } from './mockApi.js';
import { presetConfig } from '../../shared/seasonalThemes.js';

test('festival presets load matching artwork and restore bundled images', async ({ page }, testInfo) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  await page.route('**/api/admin/cms/themes**', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: { themes: [], active: { id: null, config: presetConfig() } } }) }));
  await page.goto('/admin/cms/themes/new');
  const preview = page.frameLocator('iframe');
  for (const key of ['diwali', 'holi', 'eid', 'christmas', 'independence', 'republic', 'raksha', 'default']) {
    await page.getByLabel('Preset', { exact: true }).selectOption(key);
    const config = presetConfig(key);
    if (key === 'default') {
      await expect(preview.locator('.theme-decoration-asset')).toHaveCount(0);
    } else {
      for (const slot of ['header', 'background', 'footer']) await expect(page.getByAltText(`${slot} decoration`)).toHaveAttribute('src', config.assets[slot].url);
      await expect(preview.locator('.theme-decoration-header img')).toHaveAttribute('src', config.assets.header.url);
      await expect(preview.locator('.theme-decoration-header img')).toHaveJSProperty('naturalWidth', key === 'diwali' ? 2172 : 1440);
      await expect(preview.locator('.theme-announcement')).toHaveText(config.announcement);
    }
  }
  await page.getByLabel('Preset', { exact: true }).selectOption('holi');
  await page.getByRole('button', { name: 'Remove from draft', exact: true }).first().click();
  await expect(page.getByAltText('header decoration')).toHaveCount(0);
  await page.getByRole('button', { name: 'Restore preset artwork', exact: true }).click();
  await expect(page.getByAltText('header decoration')).toHaveAttribute('src', '/theme-assets/holi/header.svg');
  await page.getByRole('button', { name: 'Mobile', exact: true }).click();
  await expect(preview.locator('.theme-decoration-header img')).toHaveJSProperty('naturalWidth', 1440);
  await page.screenshot({ path: testInfo.outputPath('holi-preset-mobile-preview.png'), fullPage: true });
});

test('admin edits an isolated festival preview, saves, publishes and activates', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  const id = '507f1f77bcf86cd799439011';
  let stored = null; let active = { id: null, name: 'Store default', config: presetConfig(), nextChangeAt: null };
  await page.route('**/api/admin/cms/themes**', async route => {
    const req = route.request(), path = new URL(req.url()).pathname; const body = req.postDataJSON();
    let data;
    if (path.endsWith('/themes')) {
      if (req.method() === 'POST') { stored = { ...body, _id: id, history: [] }; data = { theme: stored }; }
      else data = { themes: stored ? [stored] : [], active };
    } else if (path.endsWith('/publish')) { stored.published = structuredClone(stored.draft); stored.revision++; data = { theme: stored }; }
    else if (path.endsWith('/activate')) { active = { id, name: stored.name, config: stored.published, nextChangeAt: null }; data = { theme: stored, active }; }
    else if (path.endsWith('/reset')) { active = { id: null, name: 'Store default', config: presetConfig(), nextChangeAt: null }; data = { active }; }
    else { if (req.method() === 'PUT') stored = { ...stored, ...body, revision: stored.revision + 1 }; data = { theme: stored }; }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
  });
  await page.route('**/api/content/theme', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: { theme: active } }) }));
  await page.goto('/admin/cms/themes/new');
  await expect(page.getByRole('heading', { name: 'Seasonal Themes', exact: true })).toBeVisible();
  const preview = page.frameLocator('iframe[title="Seasonal theme storefront preview"]');
  await expect(preview.locator('.storefront-theme[data-theme]')).toHaveAttribute('data-theme', 'preview');
  await expect(preview.locator('.storefront-theme footer').first()).toHaveCSS('background-color', 'rgb(255, 244, 223)');
  await page.getByLabel('Announcement', { exact: true }).fill('Happy Diwali!');
  await expect(preview.locator('.theme-announcement')).toHaveText('Happy Diwali!');
  await page.getByRole('button', { name: 'Mobile', exact: true }).click();
  await expect(page.locator('iframe')).toHaveCSS('width', '390px');
  await page.getByRole('button', { name: 'Playful celebration', exact: true }).click();
  await expect(preview.locator('.storefront-theme[data-theme]')).toHaveAttribute('data-style-buttons', 'pill');
  await expect(preview.locator('.theme-product-card').first()).toHaveCSS('border-radius', '22px');
  await page.getByLabel('Decoration placement', { exact: true }).selectOption('footer');
  await expect(preview.locator('.theme-decoration-header')).toHaveCount(0);
  await expect(preview.locator('.theme-decoration-footer')).toHaveCount(1);
  await page.getByLabel('Navigation style', { exact: true }).selectOption('gradient');
  await page.getByLabel('Font family', { exact: true }).selectOption('serif');
  await expect(preview.locator('.storefront-theme[data-theme]')).toHaveCSS('font-family', /Georgia/);
  await page.getByRole('button', { name: /Save draft/ }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/cms/themes/${id}$`));
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Publish draft', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Activate now', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Activate now', exact: true }).click();
  await expect(page.getByText('Live: Diwali campaign.', { exact: false })).toBeVisible();
  await page.goto('/');
  await expect(page.locator('.storefront-theme[data-theme]')).toHaveAttribute('data-theme', id);
  await expect(page.locator('.theme-announcement')).toHaveText('Happy Diwali!');
  await expect(page.locator('.storefront-theme[data-theme]')).toHaveAttribute('data-style-buttons', 'pill');
  await expect(page.locator('.theme-product-card').first()).toHaveCSS('border-radius', '22px');
  expect(stored.published.styles.navigation).toBe('gradient');
  expect(stored.published.styles.decorationPlacement).toBe('footer');
  await expect(page.locator('.theme-decoration-header')).toHaveCount(0);
});

test('public theme failure falls back to original black footer', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'storefront');
  await page.route('**/api/content/theme', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Unavailable' }) }));
  await page.goto('/');
  await expect(page.locator('.storefront-theme[data-theme]')).toHaveAttribute('data-theme', 'default');
  await expect(page.locator('footer').first()).toHaveCSS('background-color', 'rgb(17, 17, 17)');
});

test('new campaigns upload all three images immediately and apply without a separate save step', async ({ page }) => {
  await mockApi(page); await seedBrowserSession(page, 'admin');
  const id = '507f1f77bcf86cd799439011'; let stored = null;
  let active = { id: null, name: 'Store default', config: presetConfig(), nextChangeAt: null };
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jY9kAAAAASUVORK5CYII=', 'base64');
  await page.route('**/theme-test/*.png', route => route.fulfill({ contentType: 'image/png', body: png }));
  await page.route('**/api/admin/cms/themes**', async route => {
    const req = route.request(), path = new URL(req.url()).pathname; let data;
    if (path.includes('/assets/')) { const slot = path.split('/').at(-1); data = { asset: { url: `/theme-test/${slot}.png`, publicId: `themes/${slot}` } }; }
    else if (path.endsWith('/themes') && req.method() === 'GET') data = { themes: stored ? [stored] : [], active };
    else if (path.endsWith('/themes')) { stored = { ...req.postDataJSON(), _id: id, history: [] }; data = { theme: stored }; }
    else if (path.endsWith('/publish')) { stored.published = structuredClone(stored.draft); stored.revision++; data = { theme: stored }; }
    else if (path.endsWith('/activate')) { active = { id, name: stored.name, config: stored.published, nextChangeAt: null }; data = { theme: stored }; }
    else { if (req.method() === 'PUT') stored = { ...stored, ...req.postDataJSON(), revision: stored.revision + 1 }; data = { theme: stored }; }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
  });
  await page.route('**/api/content/theme', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: { theme: active } }) }));
  await page.goto('/admin/cms/themes/new');
  for (const slot of ['header', 'background', 'footer']) {
    const input = page.getByLabel(`Upload ${slot} image`, { exact: true });
    await expect(input).toBeEnabled();
    await input.setInputFiles({ name: `${slot}.png`, mimeType: 'image/png', buffer: png });
    await expect(page.getByAltText(`${slot} decoration`)).toHaveAttribute('src', `/theme-test/${slot}.png`);
    await expect(page.getByRole('button', { name: 'Apply to store', exact: true })).toBeEnabled();
  }
  const preview = page.frameLocator('iframe');
  await expect(preview.locator('.theme-decoration-header img')).toHaveAttribute('src', '/theme-test/header.png');
  await expect(preview.locator('.theme-decoration-footer img')).toHaveAttribute('src', '/theme-test/footer.png');
  await page.getByLabel('Announcement', { exact: true }).fill('Festival images ready');
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Apply to store', exact: true }).click();
  await expect(page.getByText('Live: Diwali campaign.', { exact: false })).toBeVisible();
  expect(Object.keys(stored.published.assets).sort()).toEqual(['background', 'footer', 'header']);
  expect(stored.published.announcement).toBe('Festival images ready');
  await page.goto('/products');
  await expect(page.locator('.storefront-theme[data-theme]')).toHaveAttribute('data-theme', id);
  await expect(page.locator('.storefront-theme[data-theme] > main')).toHaveCSS('background-image', /theme-test\/background\.png/);
  await expect(page.locator('.theme-decoration-header img')).toHaveCSS('object-fit', 'contain');
});

for (const width of [320, 390]) {
  test(`mobile footer is compact and does not overflow at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await mockApi(page); await seedBrowserSession(page, 'storefront');
    const footer = { companyName: 'Vi Nexus', companyDescription: 'We offer Networking and CCTV related products.', address: '1162, Dadwara, Kota, Rajasthan 324002', email: 'vinexus2024@example.com', phone: '8003923316', whatsappNumbers: [{ label: 'Sales and customer support', number: '9530033299' }], socialLinks: [{ label: 'Instagram', url: 'https://example.com' }], quickLinks: [{ label: 'Location', url: '/location' }], bankAccounts: [{ accountName: 'VI NEXUS', accountNumber: '50200121980367', ifscCode: 'HDFC0000167', branch: 'KOTA-RAJASTHAN', upiId: '8003923316@hdfc' }] };
    await page.route('**/api/content/footer-content', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: { footer } }) }));
    await page.route('**/api/content/theme', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: { theme: { id: 'diwali', config: presetConfig('diwali'), nextChangeAt: null } } }) }));
    await page.goto('/');
    const section = page.locator('.store-footer');
    await expect(section.locator('h4').first()).toHaveCSS('font-size', '16px');
    await expect(section.locator('.footer-contact')).toBeVisible();
    const about = await section.locator('.footer-about').boundingBox(), info = await section.locator('.footer-information').boundingBox();
    expect(Math.abs(about.y - info.y)).toBeLessThan(2);
    expect(info.x).toBeGreaterThan(about.x);
    expect(await section.evaluate(el => el.scrollWidth)).toBeLessThanOrEqual(width);
    await expect(section.locator('.footer-support a')).toHaveAttribute('href', 'https://wa.me/919530033299');
    await section.screenshot({ path: testInfo.outputPath(`mobile-footer-${width}.png`) });
  });
}
