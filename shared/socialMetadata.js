import { isInventorySpecification } from './productSpecifications.js';
// Shared by the initial HTML response and client-side navigation.
const RESERVED = new Set(['admin', 'account', 'customer', 'dealer', 'api', 'invoices', 'content', 'login', 'register', 'signup', 'verify-otp', 'forgot-password', 'reset-password']);
export const productIdFromPath = (pathname = '/') => {
  const parts = pathname.split('?')[0].split('/').filter(Boolean);
  if (parts.length < 2 || parts.length > 4 || RESERVED.has(parts[0])) return null;
  if (parts[0] === 'products' && parts.length !== 2) return null;
  if (parts[0] === 'brands' && parts.length !== 3) return null;
  return parts.at(-1).match(/([a-f\d]{24})$/i)?.[1] || null;
};
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const absoluteUrl = (value, origin) => {
  if (!value) return '';
  try { const url = new URL(value, origin); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; }
  catch { return ''; }
};
const plainText = value => String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
export const productShareDescription = product => {
  if (!product) return '';
  const groups = new Map();
  for (const spec of product.specifications || []) {
    const key = plainText(spec.key);
    const value = plainText(spec.value);
    if (!key || !value || isInventorySpecification(key)) continue;
    const normalized = key.toLowerCase();
    if (!groups.has(normalized)) groups.set(normalized, { key, values: [] });
    const values = groups.get(normalized).values;
    if (!values.includes(value)) values.push(value);
  }
  const parts = [];
  if (product.modelNumber && ![...groups.keys()].some(key => /^(model number|model no\.?|modelnumber)$/.test(key))) parts.push(`Model: ${plainText(product.modelNumber).slice(0, 80)}`);
  parts.push(...[...groups.values()].slice(0, 4).map(group => `${group.key.slice(0, 40)}: ${group.values.join(', ').slice(0, 70)}`));
  if (!groups.size) parts.push(plainText(product.shortDescription || product.description || product.name));
  return parts.filter(Boolean).join(' · ').slice(0, 300);
};
export const socialMetadata = ({ pathname = '/', origin, settings = {}, product = null }) => {
  const isProduct = Boolean(productIdFromPath(pathname));
  const image = isProduct
    ? [...(product?.images || [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).find(asset => asset?.url)?.url || product?.imageUrl || product?.image || ''
    : settings.ogImage?.url && settings.ogImage.url !== '/favicon.jpeg' ? settings.ogImage.url : '/social-preview.png';
  return {
    title: isProduct ? product?.name ? `${product.name} | Vinexus` : 'Product unavailable | Vinexus' : settings.metaTitle || settings.websiteName || 'Vinexus | CCTV & Networking Products',
    description: isProduct ? productShareDescription(product) : settings.metaDescription || 'CCTV cameras and networking products from Vinexus.',
    image: absoluteUrl(image, origin),
    imageAlt: isProduct ? product?.name || '' : settings.websiteName || 'Vinexus',
    url: absoluteUrl(pathname, origin),
    type: isProduct ? 'product' : 'website',
    siteName: settings.websiteName || 'Vinexus',
  };
};
export const renderSocialHtml = (html, options) => {
  const meta = socialMetadata(options);
  return html.replace(/<head>([\s\S]*?)<\/head>/i, (_, head) => {
    // Remove every old social tag, including generic image dimensions/types.
    const clean = head.replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, '')
      .replace(/<meta\b[^>]*>/gi, tag => /\b(?:name|property)\s*=\s*["'](?:og:[^"']*|twitter:[^"']*|title|description)["']/i.test(tag) ? '' : tag)
      .replace(/<link\b[^>]*\brel\s*=\s*["']canonical["'][^>]*>/gi, '');
    const tags = [
      `<title>${escape(meta.title)}</title>`,
      `<meta name="title" content="${escape(meta.title)}">`,
      `<meta name="description" content="${escape(meta.description)}">`,
      `<link rel="canonical" href="${escape(meta.url)}">`,
      `<meta property="og:site_name" content="${escape(meta.siteName)}">`,
      `<meta property="og:type" content="${meta.type}">`,
      `<meta name="twitter:card" content="summary_large_image">`,
      ...['title', 'description', 'url', 'image'].flatMap(key => meta[key] ? [
        `<meta property="og:${key}" content="${escape(meta[key])}">`,
        `<meta name="twitter:${key}" content="${escape(meta[key])}">`,
      ] : []),
      ...(meta.image ? [`<meta property="og:image:alt" content="${escape(meta.imageAlt)}">`, `<meta name="twitter:image:alt" content="${escape(meta.imageAlt)}">`] : []),
    ];
    return `<head>${clean}\n${tags.join('\n')}\n</head>`;
  });
};
