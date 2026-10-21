import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { renderSharePage } from '../server/sharePage.js';
let shell;
export default async function page(req, res) {
  try {
    shell ||= await readFile(join(process.cwd(), 'dist', 'index.html'), 'utf8');
    const origin = process.env.PUBLIC_SITE_URL || `https://${req.headers.host}`;
    const rawPath = Array.isArray(req.query?.path) ? req.query.path.join('/') : String(req.query?.path || '');
    const pathname = `/${rawPath.replace(/^\/+/, '').split('?')[0]}`;
    const apiBase = process.env.API_BASE_URL || process.env.VITE_API_BASE_URL;
    if (!/^https?:\/\//i.test(apiBase || '')) throw new Error('Set VITE_API_BASE_URL to the public backend URL ending in /api.');
    const result = await renderSharePage({ html: shell, pathname, origin, apiBase });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', result.cacheable ? 'public, max-age=0, s-maxage=60, stale-while-revalidate=120' : 'no-store');
    res.status(200).send(result.html);
  } catch (error) {
    console.error('Unable to render share metadata:', error.message);
    // Avoid returning a generic product preview when configuration is incomplete.
    res.setHeader('Cache-Control', 'no-store');
    res.status(503).send('The storefront is temporarily unavailable. Please try again shortly.');
  }
}
