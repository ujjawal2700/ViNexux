import { sitemap } from '../services/seo.service.js';
import { getPublicWebsiteSettings } from '../services/cms.service.js';

// Both the direct SEO API and the existing nginx HTML fallback use this path.
export const serveSitemap = async (file, res) => {
  res.set('Cache-Control', 'no-store');
  if (!/^sitemap(?:-pages|-products-[1-9]\d*)?\.xml$/.test(file)) return res.status(404).end();
  const settings = await getPublicWebsiteSettings();
  if (settings.maintenanceEnabled) {
    res.set('Retry-After', '60');
    return res.status(503).end();
  }
  const body = await sitemap(file);
  if (!body) return res.status(404).end();
  res.set('Cache-Control', 'public, max-age=300');
  return res.type('application/xml').send(body);
};
