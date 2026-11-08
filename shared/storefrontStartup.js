import { bannerImage } from './responsiveImage.js';
import { themeAssetUrl } from './seasonalThemes.js';
import { visibleBannerSections } from './bannerGrid.js';
const pick = (object, keys) => Object.fromEntries(keys.filter(key => object?.[key] !== undefined).map(key => [key, object[key]]));
const attr = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const safeImage = value => typeof value === 'string' && /^(https?:\/\/|\/(?!\/))/.test(value);

// Public presentation only: never serialize accounts, cart contents or prices.
export function publicStartup({ settings, theme, grid }, now = Date.now()) {
  return { version: 1, createdAt: now,
    settings: pick(settings, ['websiteName', 'metaTitle', 'metaDescription', 'favicon', 'logo', 'ogImage', 'promoPopupEnabled', 'promoPopupIntervalMinutes', 'maintenanceEnabled', 'maintenanceMessage']),
    theme: theme ? pick(theme, ['id', 'name', 'config', 'nextChangeAt']) : null,
    grid: grid?.configured ? { configured: true, sections: visibleBannerSections(grid.sections).map(section => ({ transition: section.transition, images: (section.images || []).map(image => pick(image, ['_id', 'url', 'posterUrl', 'mediaType', 'title', 'link', 'fit', 'positionX', 'positionY', 'zoom'])) })) } : null,
  };
}

export function renderStorefrontStartup(html, page) {
  if (page.pathname !== '/' || page.status !== 200 || !page.startup || page.settings?.maintenanceEnabled) return html;
  const startup = publicStartup(page.startup);
  const hints = (startup.grid?.sections || []).map((section, index) => {
    const image = bannerImage(section.images[0], index);
    if (!safeImage(image.src)) return '';
    return `<link rel="preload" as="image" href="${attr(image.src)}"${image.srcSet ? ` imagesrcset="${attr(image.srcSet)}" imagesizes="${attr(image.sizes)}"` : ''} fetchpriority="high">`;
  });
  const background = themeAssetUrl(startup.theme?.config?.assets?.background?.url);
  if (safeImage(background)) hints.push(`<link rel="preload" as="image" href="${attr(background)}">`);
  const json = JSON.stringify(startup).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  // Preloads go ahead of Vite's scripts/styles so the HTML scanner discovers
  // critical images before JavaScript executes or any browser API calls finish.
  const output = html.replace('</head>', `<script id="storefront-startup" type="application/json">${json}</script>\n</head>`);
  const viewport = /<meta\b[^>]*name=["']viewport["'][^>]*>/i;
  // Mobile preloads must follow the viewport declaration; otherwise the HTML
  // scanner can choose an unnecessarily wide image using its 980px default.
  return viewport.test(output) ? output.replace(viewport, match => `${match}\n${hints.join('\n')}`) : output.replace('<head>', `<head>\n${hints.join('\n')}`);
}
