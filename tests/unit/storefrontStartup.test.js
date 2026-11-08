import { test, expect } from '@jest/globals';
import { publicStartup, renderStorefrontStartup } from '../../shared/storefrontStartup.js';
import { renderSeoHtml } from '../../shared/seo.js';
import { presetConfig } from '../../shared/seasonalThemes.js';
const image = 'https://res.cloudinary.com/store/image/upload/v123/banner.webp';
const startup = { settings: { websiteName: '</script><script>alert(1)</script>', maintenanceEnabled: false, password: 'private' }, theme: { name: 'Diwali', config: presetConfig('diwali'), history: ['private'] }, grid: { configured: true, owner: 'private', sections: [{ images: [{ url: image, standardPrice: 1234 }] }, { images: [{ mediaType: 'video', url: 'https://example.test/promo.mp4', posterUrl: image }] }] } };
const page = { pathname: '/', status: 200, settings: startup.settings, startup };
const shell = '<html><head><script type="module" src="/assets/app.js"></script></head><body><div id="root"></div></body></html>';

test('critical image hints precede application scripts and preload posters instead of videos', () => {
  const html = renderStorefrontStartup(shell, page);
  expect(html.indexOf('rel="preload"')).toBeLessThan(html.indexOf('type="module"'));
  expect(html).toContain('imagesrcset=');
  expect(html).toContain('imagesizes="25vw"');
  expect(html).not.toContain('as="video"');
  expect(html.match(/rel="preload"/g)).toHaveLength(3);
  expect(html).toContain('section-background-v1.webp');
});
test('startup data is escaped JSON with public presentation fields only', () => {
  const html = renderStorefrontStartup(shell, page);
  const payload = html.match(/id="storefront-startup" type="application\/json">([\s\S]*?)<\/script>/)[1];
  expect(payload).not.toContain('</script>');
  const parsed = JSON.parse(payload);
  expect(parsed.settings.websiteName).toBe(startup.settings.websiteName);
  expect(JSON.stringify(parsed)).not.toContain('private');
  expect(parsed.grid.sections[0].images[0]).not.toHaveProperty('standardPrice');
  expect(publicStartup(startup, 123).createdAt).toBe(123);
});
test('private, maintenance, error and non-home pages never get startup data or image hints', () => {
  for (const override of [{ pathname: '/admin/login' }, { pathname: '/products' }, { status: 503 }, { settings: { maintenanceEnabled: true } }, { startup: null }]) expect(renderStorefrontStartup(shell, { ...page, ...override })).toBe(shell);
});
test('SEO renderer includes startup hints while preserving the canonical and crawlable homepage', () => {
  const html = renderSeoHtml(shell, page);
  expect(html).toContain('id="storefront-startup"');
  expect(html).toContain('id="seo-content"');
});
