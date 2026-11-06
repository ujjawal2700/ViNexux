import { SITE_ORIGIN } from '../../shared/seo.js';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { renderSharePage } from '../server/sharePage.js';
import sitemapHandler from './sitemap.js';
let shell;
export default async function page(req, res) {
  try {
    const rawPath = Array.isArray(req.query?.path) ? req.query.path.join('/') : String(req.query?.path || '');
    const path = `/${rawPath.replace(/^\/+|\/+$/g, '').split('?')[0]}`;
    if (path === '/sitemap.sxml') return res.redirect(301, '/sitemap.xml');
    const file = /^\/(sitemap(?:-pages|-products-[1-9]\d*)?\.xml)$/.exec(path)?.[1];
    if (file) return sitemapHandler({ ...req, query: { ...req.query, file } }, res);
    shell ||= await readFile(join(process.cwd(), 'dist', 'index.html'), 'utf8');
    const origin = SITE_ORIGIN;
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(req.query || {})) if (key !== 'path') for (const item of Array.isArray(value) ? value : [value]) search.append(key, item);
    const pathname = `/${rawPath.replace(/^\/+/, '').split('?')[0]}${search.size ? `?${search}` : ''}`;
    const apiBase = process.env.API_BASE_URL || process.env.VITE_API_BASE_URL;
    if (!/^https?:\/\//i.test(apiBase || '')) throw new Error('Set VITE_API_BASE_URL to the public backend URL ending in /api.');
    const result = await renderSharePage({ html: shell, pathname, origin, apiBase });
    if (result.redirect) return res.redirect(301, result.redirect);
    if (result.status === 503) res.setHeader('Retry-After', '60');
    if (result.robots?.includes('noindex') || (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production')) res.setHeader('X-Robots-Tag', 'noindex, follow');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', result.cacheable ? 'public, max-age=0, s-maxage=60, stale-while-revalidate=120' : 'no-store');
    res.status(result.status || 200).send(result.html);
  } catch (error) {
    console.error('Unable to render share metadata:', error.message);
    // Avoid returning a generic product preview when configuration is incomplete.
    res.setHeader('Cache-Control', 'no-store');
    res.status(503).send('The storefront is temporarily unavailable. Please try again shortly.');
  }
}
