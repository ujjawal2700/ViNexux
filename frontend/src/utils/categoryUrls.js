/**
 * Category & Brand Hierarchical URL Helpers
 * Provides SEO-friendly multi-level hierarchy URL generation matching Mega Jaipur standards:
 * - Header Category: /:headerSlug (e.g. /laptop, /desktop, /security)
 * - Main Category: /:headerSlug/:mainSlug (e.g. /laptop/branded-laptop, /laptop/laptop-spares)
 * - Subcategory: /:headerSlug/:mainSlug/:subSlug (e.g. /laptop/laptop-spares/laptop-hinges)
 * - Brand: /brands/:brandSlug (e.g. /brands/acer, /brands/cp-plus)
 * - Product under hierarchy: /:headerSlug/:mainSlug/:subSlug/:id or /brands/:brandSlug/:id
 */

export const RESERVED_ROOT_SLUGS = new Set([
  'brand',
  'cart',
  'wishlist',
  'categories',
  'brands',
  'shop-by-brand',
  'products',
  'content',
  'unauthorized',
  'not-found',
  'ui-preview',
  'login',
  'register',
  'signup',
  'verify-otp',
  'forgot-password',
  'reset-password',
  'account',
  'customer',
  'dealer',
  'admin',
  'api',
]);

/**
 * Convert string to clean URL-safe kebab-case slug
 */
export const slugify = (text = '') => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Get category slug safely
 */
export const getCategorySlug = (category) => {
  if (!category) return '';
  if (category.slug && category.slug.trim()) {
    return category.slug.trim().toLowerCase();
  }
  return slugify(category.name);
};

/**
 * Build full hierarchical URL path for a given category:
 * e.g. /laptop/laptop-spares/laptop-hinges
 */
export const buildCategoryPath = (category, allCategories = []) => {
  if (!category) return '/products';

  const chain = [];
  let curr = category;
  const visited = new Set();

  while (curr && !visited.has(curr._id || curr.name)) {
    visited.add(curr._id || curr.name);
    const s = getCategorySlug(curr);
    if (s) {
      chain.unshift(s);
    }
    const pId = curr.parentId?._id || curr.parentId;
    curr = pId && allCategories.length > 0
      ? allCategories.find((c) => String(c._id) === String(pId))
      : null;
  }

  if (chain.length === 0) return '/products';
  return '/' + chain.join('/');
};

/**
 * Build breadcrumb trail items for a given category
 * Returns [{ label: 'Home', path: '/' }, { label: 'Laptop', path: '/laptop' }, ...]
 */
export const buildCategoryTrail = (category, allCategories = []) => {
  if (!category) {
    return [
      { label: 'Home', path: '/' },
      { label: 'All Products', path: null },
    ];
  }

  const trail = [];
  let curr = category;
  const visited = new Set();

  while (curr && !visited.has(curr._id || curr.name)) {
    visited.add(curr._id || curr.name);
    trail.unshift(curr);
    const pId = curr.parentId?._id || curr.parentId;
    curr = pId && allCategories.length > 0
      ? allCategories.find((c) => String(c._id) === String(pId))
      : null;
  }

  const breadcrumbs = [{ label: 'Home', path: '/' }];

  trail.forEach((item, idx) => {
    const isLeaf = idx === trail.length - 1;
    // Build path up to this ancestor
    const ancestorsUpToThis = trail.slice(0, idx + 1);
    const path = '/' + ancestorsUpToThis.map(getCategorySlug).join('/');
    breadcrumbs.push({
      label: item.name,
      path: isLeaf ? null : path,
    });
  });

  return breadcrumbs;
};

/**
 * Build brand URL
 */
export const buildBrandUrl = (brandName = '') => {
  if (!brandName) return '/brands';
  return `/brands/${slugify(brandName)}`;
};

/**
 * Check if a parameter is a MongoDB ObjectId (or ends with one)
 */
export const isProductIdParam = (val = '') => {
  if (!val) return false;
  return /^[0-9a-fA-F]{24}$/.test(val) || /[-_][0-9a-fA-F]{24}$/.test(val);
};

/**
 * Extract 24-character hex ID from param
 */
export const extractProductId = (param = '') => {
  if (!param) return null;
  if (/^[0-9a-fA-F]{24}$/.test(param)) return param;
  const match = param.match(/([0-9a-fA-F]{24})$/);
  return match ? match[1] : param;
};
