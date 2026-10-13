import { publicInvoiceUrl } from '../../shared/posInvoiceUrl.js';
const token = 'a'.repeat(64);
test('production invoice links use the customer website, independent of local API', () => {
  expect(publicInvoiceUrl(token, { production: true, origin: 'http://localhost:3000' }))
    .toBe(`https://vinexus.in/invoices/${token}`);
});
test('localhost is supported during development on the frontend port', () => {
  expect(publicInvoiceUrl(token, { origin: 'http://localhost:3000' })).toBe(`http://127.0.0.1:3000/invoices/${token}`);
});
test('local HTTPS overrides follow the running HTTP development server', () => {
  expect(publicInvoiceUrl(token, { publicSiteUrl: 'https://localhost:443', origin: 'http://localhost:3000' }))
    .toBe(`http://127.0.0.1:3000/invoices/${token}`);
});
test('an explicitly HTTPS local server retains its protocol', () => {
  expect(publicInvoiceUrl(token, { origin: 'https://localhost:3000' })).toBe(`https://localhost:3000/invoices/${token}`);
});
test('custom site URL supports HTTPS deployments', () => {
  expect(publicInvoiceUrl(token, { production: true, publicSiteUrl: 'https://www.vinexus.in/' }))
    .toBe(`https://www.vinexus.in/invoices/${token}`);
});
test.each(['http://vinexus.in', 'javascript:alert(1)', 'https://user:password@vinexus.in', 'invalid'])('rejects invalid public site %s', publicSiteUrl => {
  expect(publicInvoiceUrl(token, { production: true, publicSiteUrl })).toBeNull();
});
test('invalid tokens cannot generate invoice links', () => {
  expect(publicInvoiceUrl('bad', { production: true })).toBeNull();
});
