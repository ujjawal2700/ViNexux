import { afterEach, expect, jest, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import sitemapHandler from '../../frontend/api/sitemap.js';
const previousApiBase = process.env.API_BASE_URL;
afterEach(() => { jest.restoreAllMocks(); if (previousApiBase === undefined) delete process.env.API_BASE_URL; else process.env.API_BASE_URL = previousApiBase; });
const response = () => ({ headers: {}, statusCode: null, body: null, setHeader(key, value) { this.headers[key] = value; }, status(value) { this.statusCode = value; return this; }, send(body) { this.body = body; return this; }, end() { return this; } });
test('Vercel routes every sitemap to XML handling before the SPA filesystem fallback', () => {
  const config = JSON.parse(readFileSync(new URL('../../frontend/vercel.json', import.meta.url)));
  const filesystem = config.routes.findIndex(route => route.handle === 'filesystem');
  for (const file of ['/sitemap.xml', '/sitemap-pages.xml', '/sitemap-products-1.xml', '/sitemap-products-20.xml']) {
    expect(config.routes.slice(0, filesystem).some(route => route.dest?.startsWith('/api/sitemap') && new RegExp(route.src).test(file))).toBe(true);
  }
});
test('the hosted sitemap adapter returns XML and canonical dynamic backend data', async () => {
  process.env.API_BASE_URL = 'https://api.example.test/api';
  const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, text: async () => '<?xml version="1.0"?><sitemapindex />' });
  const res = response(); await sitemapHandler({ query: { file: 'sitemap.xml' } }, res);
  expect(fetchSpy.mock.calls[0][0]).toBe('https://api.example.test/api/seo/sitemap.xml');
  expect(res.statusCode).toBe(200); expect(res.headers['Content-Type']).toBe('application/xml; charset=utf-8'); expect(res.body).toContain('<?xml');
});
test.each([404, 503])('the sitemap adapter preserves status %s instead of returning an HTML shell', async status => {
  process.env.API_BASE_URL = 'https://api.example.test/api';
  jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status });
  const res = response(); await sitemapHandler({ query: { file: 'sitemap-products-2.xml' } }, res);
  expect(res.statusCode).toBe(status); expect(res.body).toBeNull();
  if (status === 503) expect(res.headers['Retry-After']).toBe('60');
});
