import { renderStorefrontStartup } from './storefrontStartup.js';
import { productIdFromPath, productShareDescription, renderSocialHtml } from './socialMetadata.js';
export const SITE_ORIGIN = 'https://vinexus.in';
export const SITE_TITLE = 'ViNexus | Networking, CCTV & IT Hardware';
export const SITE_DESCRIPTION = 'Explore networking equipment, CCTV cameras, computers and IT hardware at ViNexus, Kota. Browse product specifications and enquire about dealer and bulk orders.';
export const INDEX_ROBOTS = 'index, follow, max-image-preview:large';
export const STATIC_PAGES = {
  '/': ['ViNexus — Networking, CCTV & IT Hardware', SITE_DESCRIPTION],
  '/products': ['All Products', 'Browse networking, CCTV, computers and IT hardware at ViNexus. Compare product specifications and find equipment for your business.'],
  '/brands': ['Shop by Brand', 'Explore the brands available at ViNexus and browse their networking, surveillance and IT hardware products.'],
  '/trending': ['Trending Products', 'Discover trending networking, CCTV and IT hardware products selected for the ViNexus catalog.'],
  '/low-stock': ['Limited Stock Products', 'Explore products with limited stock at ViNexus. Contact our team to confirm availability before ordering.'],
  '/privacy': ['Privacy Policy', 'Learn how ViNexus handles account details, dealer verification, browser storage and your privacy choices.'],
  '/terms': ['Terms & Conditions', 'Read the terms for using the ViNexus website, product catalog and enquiry services.'],
  '/shipping-policy': ['Shipping Policy', 'Read the ViNexus shipping policy, including delivery, dispatch and order handling information.'],
};
export const REDIRECTS = { '/index.html': '/', '/categories': '/', '/shop-by-brand': '/brands', '/limited-stock': '/low-stock', '/signup': '/register', '/content/pages/privacy-policy': '/privacy', '/content/pages/terms-and-conditions': '/terms', '/content/pages/shipping-policy': '/shipping-policy' };
export const plainText = value => String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const safeUrl = (value, origin) => { try { const url = new URL(value, origin); return /^https?:$/.test(url.protocol) ? url.href : ''; } catch { return ''; } };
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
export const cleanPath = value => `/${String(value || '').split(/[?#]/)[0].replace(/^\/+|\/+$/g, '')}`;
export const categoryPath = (category, categories) => {
  const byId = new Map(categories.map(row => [String(row._id), row]));
  const parts = [], seen = new Set(); let current = category;
  while (current && !seen.has(String(current._id))) {
    seen.add(String(current._id)); parts.unshift(current.slug);
    current = byId.get(String(current.parentId?._id || current.parentId || ''));
  }
  return `/${parts.map(encodeURIComponent).join('/')}`;
};
export const productPath = product => product?.categoryPath?.startsWith('/') && !product.categoryPath.startsWith('//')
  ? `${product.categoryPath}/${product._id}` : `/products/${product?._id}`;
export const privatePath = path => /^\/(?:admin|account|customer|dealer|invoices|email-preferences|api)(?:\/|$)/.test(path)
  || ['/cart', '/wishlist', '/login', '/register', '/verify-otp', '/forgot-password', '/reset-password', '/search', '/theme-preview', '/ui-preview', '/unauthorized', '/not-found'].includes(path);
export const pageRobots = (pathname, { isProduct = false, notFound = false } = {}) => {
  const query = new URL(pathname, SITE_ORIGIN).searchParams;
  const filtered = !isProduct && [...query.keys()].some(key => !key.startsWith('utm_') && !['gclid', 'fbclid'].includes(key));
  return notFound || privatePath(cleanPath(pathname)) || filtered ? 'noindex, follow' : INDEX_ROBOTS;
};
const humanize = path => path.split('/').filter(Boolean).at(-1)?.replace(/-/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase()) || 'ViNexus';
export const routeMetadata = ({ pathname = '/', origin = SITE_ORIGIN, settings = {}, product, category, brand, page, notFound = false }) => {
  const path = cleanPath(pathname), target = REDIRECTS[path] || path;
  let [heading, description] = STATIC_PAGES[target] || [humanize(path), `View ${humanize(path).toLowerCase()} on ViNexus.`];
  if (privatePath(path)) {
    const meaningful = path.split('/').filter(part => part && !/^[a-f0-9]{24}$/i.test(part));
    heading = path.startsWith('/invoices/') ? 'Invoice' : humanize(`/${meaningful.slice(-2).join(' ')}`);
    description = `${heading} on ViNexus. Sign in to manage your account securely.`;
  }
  let canonical = path.startsWith('/invoices/') ? '/invoices' : target, image = settings.ogImage?.url || '/social-preview.png', type = 'website';
  if (product) { heading = product.name; description = productShareDescription(product); canonical = productPath(product); image = product.images?.find(item => item?.url)?.url || product.imageUrl || ''; type = 'product'; }
  else if (category) { heading = category.name; description = category.description || `Explore ${category.name} at ViNexus. Browse specifications, compare products and enquire about business and dealer orders.`; canonical = category.canonicalPath || path; }
  else if (brand) { heading = `${brand.name} Products`; description = brand.description || `Browse ${brand.name} products at ViNexus. Explore networking, surveillance and IT hardware specifications and enquire about availability.`; canonical = `/brands/${brand.slug}`; }
  else if (page) { heading = page.title; description = plainText(page.content).slice(0, 170); }
  if (notFound) { heading = 'Page not found'; description = 'This page is unavailable. Explore the ViNexus product catalog to find available products.'; image = '/social-preview.png'; }
  const title = path === '/' && !notFound ? settings.metaTitle || SITE_TITLE : `${heading} | ViNexus`;
  return { title, heading, description: plainText(path === '/' ? settings.metaDescription || SITE_DESCRIPTION : description).slice(0, 300),
    url: new URL(canonical, origin).href, image: image ? safeUrl(image, origin) : '', imageAlt: product?.name || heading,
    type, siteName: settings.websiteName || 'ViNexus', robots: pageRobots(pathname, { isProduct: Boolean(product), notFound }) };
};
export const productStructuredData = (product, origin = SITE_ORIGIN) => ({
  '@context': 'https://schema.org', '@type': 'Product', '@id': `${new URL(productPath(product), origin).href}#product`,
  name: product.name, url: new URL(productPath(product), origin).href,
  description: plainText(product.description || product.shortDescription || productShareDescription(product)).slice(0, 5000),
  ...(product.images?.some(item => item?.url) ? { image: product.images.filter(item => item?.url).map(item => safeUrl(item.url, origin)).filter(Boolean) } : {}),
  ...(product.sku ? { sku: product.sku } : {}), ...(product.modelNumber ? { model: product.modelNumber } : {}),
  ...(product.brandId?.name ? { brand: { '@type': 'Brand', name: product.brandId.name } } : {}),
  // Public prices require sign-in. Never expose private prices, invented reviews
  // or zero-price offers to crawlers as a way to obtain rich results.
});
export const breadcrumbData = (items, origin = SITE_ORIGIN) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: new URL(item.path, origin).href })) });
export const renderSeoHtml = (html, data, origin = SITE_ORIGIN) => {
  const meta = data.metadata || routeMetadata({ ...data, origin });
  let output = renderSocialHtml(html, { pathname: data.pathname, origin, settings: data.settings, product: data.product, metadata: meta });
  output = output.replace(/<meta\b[^>]*(?:name|property)=["'](?:robots|googlebot|bingbot)["'][^>]*>/gi, '');
  output = output.replace(/<script\b[^>]*id=["']page-structured-data["'][^>]*>[\s\S]*?<\/script>/gi, '');
  const jsonLd = data.jsonLd || (data.product ? [productStructuredData(data.product, origin)] : []);
  output = output.replace('</head>', `<meta name="robots" content="${escapeHtml(meta.robots)}">\n${jsonLd.length ? `<script id="page-structured-data" type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>` : ''}\n</head>`);
  if (!privatePath(cleanPath(data.pathname))) {
    const links = (data.links || []).map(link => `<li><a href="${escapeHtml(link.path)}">${escapeHtml(link.name)}</a></li>`).join('');
    const specifications = (data.product?.specifications || []).filter(item => item.key && item.value).slice(0, 60).map(item => `<dt>${escapeHtml(item.key)}</dt><dd>${escapeHtml(item.value)}</dd>`).join('');
    const bodyText = data.page ? plainText(data.page.content).slice(0, 50000) : data.product ? plainText(data.product.description || meta.description).slice(0, 20000) : meta.description;
    const content = `<main id="seo-content"><h1>${escapeHtml(meta.heading)}</h1><p>${escapeHtml(bodyText)}</p>${data.product && meta.image ? `<img src="${escapeHtml(meta.image)}" alt="${escapeHtml(data.product.name)}" width="400">` : ''}${specifications ? `<dl>${specifications}</dl>` : ''}${links ? `<nav aria-label="Browse ViNexus"><ul>${links}</ul></nav>` : ''}<p><a href="/products">Browse all products</a></p></main>`;
    output = output.replace(/<div id="root">[\s\S]*?<\/div>/, `<div id="root">${content}</div>`);
  }
  return renderStorefrontStartup(output, data);
};
