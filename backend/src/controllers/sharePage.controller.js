import { readFile } from 'node:fs/promises';
import { renderSeoHtml, SITE_ORIGIN } from '../../../shared/seo.js';
import { seoPage } from '../services/seo.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// The same HTML, status and crawlable content are sent to people and crawlers.
export const sharePage = asyncHandler(async (req, res) => {
  const html = await readFile(new URL('../../../frontend/dist/index.html', import.meta.url), 'utf8');
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) if (key !== 'path') for (const item of Array.isArray(value) ? value : [value]) search.append(key, item);
  const page = await seoPage(`${req.query.path || '/'}${search.size ? `?${search}` : ''}`);
  if (page.redirect) return res.redirect(301, page.redirect);
  if (page.status === 503) res.set('Retry-After', '60');
  if (page.metadata?.robots?.includes('noindex')) res.set('X-Robots-Tag', 'noindex, follow');
  res.set('Content-Security-Policy', 'upgrade-insecure-requests');
  res.set('Cache-Control', 'no-cache');
  res.status(page.status).type('html').send(renderSeoHtml(html, page, SITE_ORIGIN));
});
