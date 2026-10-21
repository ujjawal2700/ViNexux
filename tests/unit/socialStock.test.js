import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { productIdFromPath, renderSocialHtml } from '../../shared/socialMetadata.js';
import { renderSharePage } from '../../frontend/server/sharePage.js';
import { getMaximumOrderQuantity, getMaximumEnquiryQuantity, isLowStock } from '../../frontend/src/utils/inventory.js';
import { assertQuantityAvailable } from '../../backend/src/services/cart.service.js';
import { computeCatalogFields } from '../../backend/src/utils/productCatalogFields.js';
const id = '507f1f77bcf86cd799439011';
const shell = readFileSync(new URL('../../frontend/index.html', import.meta.url), 'utf8');
const options = { origin: 'https://vinexus.com', settings: { ogImage: { url: 'https://cdn.example.test/generic.png' }, metaTitle: 'Vinexus Store' } };
const product = { name: '12V Adapter', images: [{ url: 'https://cdn.example.test/adapter.webp' }], description: '<p>12V & 2A adapter</p>' };
describe('initial HTML social previews', () => {
  test.each([`/products/${id}`, `/security/${id}`, `/security/accessories/${id}`, `/security/power/adapters/adapter-${id}`, `/brands/acme/${id}`])('product URL %s has only the product image', pathname => {
    expect(productIdFromPath(pathname)).toBe(id);
    const html = renderSocialHtml(shell, { ...options, pathname, product });
    expect(html).toContain('property="og:image" content="https://cdn.example.test/adapter.webp"');
    expect(html).toContain('name="twitter:image" content="https://cdn.example.test/adapter.webp"');
    expect(html).not.toMatch(/generic\.png|social-preview\.png|og:image:width|og:image:type/);
    expect(html.match(/property="og:image"/g)).toHaveLength(1);
    expect(html).toContain('12V &amp; 2A adapter');
    expect(html).toContain('<div id="root"></div>');
  });
  test.each(['/', '/security', '/search', '/brands/acme', `/admin/products/${id}`, `/account/enquiries/${id}`])('non-product URL %s retains the configured generic image', pathname => {
    expect(productIdFromPath(pathname)).toBeNull();
    expect(renderSocialHtml(shell, { ...options, pathname, product })).toContain('property="og:image" content="https://cdn.example.test/generic.png"');
  });
  test('missing product photos never fall back to the generic social photo', () => {
    const html = renderSocialHtml(shell, { ...options, pathname: `/products/${id}`, product: { ...product, images: [] } });
    expect(html).not.toMatch(/og:image|twitter:image|generic\.png|social-preview\.png/);
  });
  test('product text cannot inject HTML or attributes', () => {
    const html = renderSocialHtml(shell, { ...options, pathname: `/products/${id}`, product: { ...product, name: '"><script>alert(1)</script>' } });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });
  test('the server renderer fetches public product details without auth or browser JavaScript', async () => {
    const fetchImpl = async url => ({ ok: true, json: async () => url.includes('/products/') ? { data: product } : { data: { settings: options.settings } } });
    const result = await renderSharePage({ html: shell, ...options, pathname: `/products/${id}`, apiBase: 'https://api.example.test/api', fetchImpl });
    expect(result.cacheable).toBe(true); expect(result.html).toContain('adapter.webp'); expect(result.html).not.toContain('generic.png');
  });
  test('a backend outage is not cached and cannot return a generic product preview', async () => {
    const result = await renderSharePage({ html: shell, ...options, pathname: `/products/${id}`, apiBase: 'https://api.example.test/api', fetchImpl: async () => { throw new Error('Unavailable'); } });
    expect(result.cacheable).toBe(false); expect(result.html).not.toMatch(/og:image|twitter:image|social-preview/);
  });
});
describe('manual low-stock policy', () => {
  test.each([[3, 3], [5, 5], [6, 5], [30, 5], [0, 0]])('flagged stock %i has order maximum %i', (stockQuantity, maximum) => {
    const product = { stockQuantity, isLowStock: true };
    expect(getMaximumOrderQuantity(product)).toBe(maximum);
    if (stockQuantity > 0) {
      expect(() => assertQuantityAvailable(product, maximum)).not.toThrow();
      expect(() => assertQuantityAvailable(product, maximum + 1)).toThrow();
    }
  });
  test('small stock counts do not automatically apply the low-stock flag or limit', () => {
    const product = { stockQuantity: 8 };
    expect(isLowStock(product)).toBe(false); expect(getMaximumOrderQuantity(product)).toBe(8);
    expect(computeCatalogFields(product).stockStatus).toBe('in-stock');
    expect(() => assertQuantityAvailable(product, 8)).not.toThrow();
    expect(computeCatalogFields({ ...product, stockQuantity: 50, isLowStock: true }).stockStatus).toBe('low-stock');
  });
  test('zero stock still supports availability enquiries without permitting fulfillment', () => {
    const product = { stockQuantity: 0, isLowStock: true };
    expect(getMaximumEnquiryQuantity(product)).toBe(5); expect(getMaximumOrderQuantity(product)).toBe(0);
    expect(() => assertQuantityAvailable(product, 6)).toThrow(/5 units/);
  });
});
