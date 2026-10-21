import { readFile } from 'node:fs/promises';
import { renderSocialHtml, productIdFromPath } from '../../../shared/socialMetadata.js';
import { getPublicProductById } from '../services/catalog.service.js';
import { getPublicWebsiteSettings } from '../services/cms.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// nginx uses this endpoint for the HTML shell; assets continue to be served statically.
export const sharePage = asyncHandler(async (req, res) => {
  const html = await readFile(new URL('../../../frontend/dist/index.html', import.meta.url), 'utf8');
  const pathname = `/${String(req.query.path || '').replace(/^\/+/, '').split('?')[0]}`;
  const origin = `${req.protocol}://${req.get('host')}`;
  const productId = productIdFromPath(pathname);
  const [settings, product] = await Promise.all([
    getPublicWebsiteSettings(),
    productId ? getPublicProductById(productId).catch(error => { if (error.statusCode === 404) return null; throw error; }) : null,
  ]);
  res.setHeader('Content-Security-Policy', 'upgrade-insecure-requests');
  res.setHeader('Cache-Control', 'no-cache');
  res.type('html').send(renderSocialHtml(html, { pathname, origin, settings, product }));
});
