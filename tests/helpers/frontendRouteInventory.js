import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ROUTES_FILE = path.join(ROOT, 'frontend/src/routes/AppRoutes.jsx');

export const discoverFrontendRoutes = () => {
  const source = fs.readFileSync(ROUTES_FILE, 'utf8');
  return [...new Set([...source.matchAll(/<Route\s+path=["']([^"']+)["']/g)].map((match) => match[1]))];
};

const SAMPLES = {
  '/products/:id': '/products/507f1f77bcf86cd799439011',
  '/content/pages/:slug': '/content/pages/about-us',
  '/account/enquiries/:id': '/account/enquiries/507f1f77bcf86cd799439011',
  '/customer/enquiries/:id': '/customer/enquiries/507f1f77bcf86cd799439011',
  '/brands/:brandSlug': '/brands/acme',
  '/brands/:brandSlug/:id': '/brands/acme/507f1f77bcf86cd799439011',
  '/:headerSlug/:param2/:param3/:id': '/electronics/computers/laptops/507f1f77bcf86cd799439011',
  '/:headerSlug/:param2/:param3': '/electronics/computers/laptops',
  '/:headerSlug/:param2': '/electronics/computers',
  '/:headerSlug': '/electronics',
  '/admin/products/:id': '/admin/products/507f1f77bcf86cd799439011',
  '/admin/dealers/:id': '/admin/dealers/507f1f77bcf86cd799439011',
  '/admin/customers/:id': '/admin/customers/507f1f77bcf86cd799439011',
  '/admin/enquiries/:id': '/admin/enquiries/507f1f77bcf86cd799439011',
  '*': '/this-page-does-not-exist',
};

export const materializeFrontendPath = (pattern) => SAMPLES[pattern] || pattern;

export const frontendRouteSection = (pattern) => {
  if (pattern.startsWith('/admin/')) return pattern.includes('login') || pattern.includes('password') || pattern.includes('verify') ? 'admin-auth' : 'admin';
  if (pattern.startsWith('/account/')) return 'account';
  if (pattern.startsWith('/customer/') || pattern.startsWith('/dealer/') || pattern === '/signup' || pattern === '/categories') return 'legacy-redirect';
  if (['/login', '/register', '/verify-otp', '/forgot-password', '/reset-password'].includes(pattern)) return 'customer-auth';
  return 'storefront';
};

export const frontendRouteCases = () => discoverFrontendRoutes().map((pattern) => ({
  pattern,
  path: materializeFrontendPath(pattern),
  section: frontendRouteSection(pattern),
}));
