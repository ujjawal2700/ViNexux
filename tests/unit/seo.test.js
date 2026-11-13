import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { routeMetadata, renderSeoHtml, categoryPath, productStructuredData, productPath, STATIC_PAGES, pageRobots, INDEX_ROBOTS } from '../../shared/seo.js';
import { renderSharePage } from '../../frontend/server/sharePage.js';
const shell = readFileSync(new URL('../../frontend/index.html', import.meta.url), 'utf8');
const product = { _id: '507f1f77bcf86cd799439011', name: '8 MP Camera', categoryPath: '/security/cameras', description: '<p>Clear & detailed surveillance.</p>', standardPrice: 5000, dealerPrice: 4000, images: [{ url: 'https://cdn.example/camera.jpg' }], specifications: [{ key: 'Resolution', value: '8 MP' }] };
test('Search Console verification is permanent in the initial HTML head', () => {
  expect(shell.split('</head>')[0]).toContain('<meta name="google-site-verification" content="BIdzIKiLz_srzFwDsNbqfYMPkuBRJpeEJhTRNMotlqU" />');
});
test.each(['/admin', '/admin/dealers', '/account/profile', '/account/become-dealer', '/invoices/private-token', '/login', '/register', '/cart', '/wishlist', '/search', '/email-preferences'])('%s is not indexable', pathname => {
  expect(routeMetadata({ pathname }).robots).toBe('noindex, follow');
});
test.each(Object.keys(STATIC_PAGES))('%s has unique descriptive page metadata', pathname => {
  const meta = routeMetadata({ pathname }); expect(meta.title).toBeTruthy(); expect(meta.description.length).toBeGreaterThan(30);
  expect(meta.url).toBe(`https://vinexus.in${pathname}`); expect(meta.robots).toContain('index, follow');
});
test.each(['/products?utm_source=google&utm_campaign=catalog', '/security/cameras?gclid=click', '/brands/acme?fbclid=click'])('%s remains indexable with a clean canonical', pathname => {
  expect(pageRobots(pathname)).toBe(INDEX_ROBOTS);
  const meta = routeMetadata({ pathname });
  expect(meta.robots).toBe(INDEX_ROBOTS);
  expect(meta.url).toBe(`https://vinexus.in${pathname.split('?')[0]}`);
});
test.each(['/products?search=camera', '/security/cameras?brand=acme&utm_source=google', '/brands/acme?sort=name', '/login?utm_source=google'])('%s stays excluded despite tracking parameters', pathname => {
  expect(pageRobots(pathname)).toBe('noindex, follow');
  expect(routeMetadata({ pathname }).robots).toBe('noindex, follow');
});
test('product queries retain the server indexing policy and missing pages stay excluded', () => {
  expect(pageRobots(`/products/${product._id}?variant=black`, { isProduct: true })).toBe(INDEX_ROBOTS);
  expect(pageRobots('/missing?utm_source=google', { notFound: true })).toBe('noindex, follow');
});
test('product aliases share a canonical URL and have public schema without gated prices', () => {
  for (const pathname of [`/products/${product._id}`, `/brands/acme/${product._id}`, `${productPath(product)}`]) {
    const meta = routeMetadata({ pathname, product }); expect(meta.url).toBe(`https://vinexus.in/security/cameras/${product._id}`);
  }
  const schema = productStructuredData(product); expect(schema.name).toBe(product.name);
  expect(schema).not.toHaveProperty('offers'); expect(JSON.stringify(schema)).not.toMatch(/5000|4000|aggregateRating|review/);
});
test('initial HTML has a crawlable heading, links, specification text and safe JSON-LD', () => {
  const html = renderSeoHtml(shell, { pathname: `/products/${product._id}`, product, links: [{ name: 'Cameras', path: '/security/cameras' }] });
  expect(html).toContain('<h1>8 MP Camera</h1>'); expect(html).toContain('<a href="/security/cameras">Cameras</a>');
  expect(html).toContain('<dt>Resolution</dt><dd>8 MP</dd>'); expect(html).toContain('id="page-structured-data"');
  expect(html.match(/name="robots"/g)).toHaveLength(1); expect(html.match(/rel="canonical"/g)).toHaveLength(1);
  expect(html).not.toContain('name="googlebot"');
  const unsafe = renderSeoHtml(shell, { pathname: `/products/${product._id}`, product: { ...product, name: '</script><script>alert(1)</script>' } });
  expect(unsafe).not.toContain('<script>alert(1)</script>');
});
test('category canonical paths include active ancestors', () => {
  const root = { _id: '1', slug: 'security' }, child = { _id: '2', slug: 'cameras', parentId: '1' };
  expect(categoryPath(child, [root, child])).toBe('/security/cameras');
});
test('server rendering propagates 404 and 503 instead of soft-404 HTTP 200 responses', async () => {
  for (const status of [404, 503]) {
    const result = await renderSharePage({ html: shell, pathname: '/missing', origin: 'https://vinexus.in', apiBase: 'https://api.example/api', fetchImpl: async () => ({ ok: true, json: async () => ({ data: { page: { pathname: '/missing', status, metadata: routeMetadata({ pathname: '/missing', notFound: status === 404 }) } } }) }) });
    expect(result.status).toBe(status); expect(result.cacheable).toBe(false);
  }
});
