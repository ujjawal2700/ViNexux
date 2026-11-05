import { Product } from '../models/Product.js';
import { CmsPage } from '../models/CmsPage.js';
import { getPublicCategories, getPublicBrands, getPublicProducts, getPublicProductById } from './catalog.service.js';
import { getPublicWebsiteSettings } from './cms.service.js';
import { productIdFromPath } from '../../../shared/socialMetadata.js';
import { SITE_ORIGIN, STATIC_PAGES, REDIRECTS, cleanPath, categoryPath, productPath, privatePath, routeMetadata, productStructuredData, breadcrumbData, escapeHtml } from '../../../shared/seo.js';

export const seoPage = async pathname => {
  const path = cleanPath(pathname);
  const settings = await getPublicWebsiteSettings();
  const data = { pathname: path, settings, status: 200, links: [], jsonLd: [] };
  if (REDIRECTS[path]) return { ...data, redirect: REDIRECTS[path], status: 301 };
  if (settings.maintenanceEnabled && !privatePath(path)) {
    return { ...data, status: 503, metadata: { ...routeMetadata({ pathname: path, settings }), heading: 'Website under maintenance', title: 'Under maintenance | ViNexus', description: settings.maintenanceMessage || 'Please check back soon.' } };
  }
  if (privatePath(path)) return { ...data, metadata: routeMetadata({ pathname: path, settings }) };
  const categories = await getPublicCategories();
  const breadcrumbs = [{ name: 'Home', path: '/' }];
  let productQuery = { limit: 24, includeFacets: 'false' };
  const id = productIdFromPath(path);
  if (id) {
    try { data.product = await getPublicProductById(id); }
    catch (error) { if (error.statusCode !== 404) throw error; data.status = 404; }
    if (data.product) {
      const product = data.product;
      const chain = categories.filter(category => product.categoryPath?.startsWith(`${categoryPath(category, categories)}/`) || product.categoryPath === categoryPath(category, categories));
      chain.sort((a, b) => categoryPath(a, categories).length - categoryPath(b, categories).length);
      breadcrumbs.push(...chain.map(category => ({ name: category.name, path: categoryPath(category, categories) })), { name: product.name, path: productPath(product) });
      data.links = breadcrumbs.slice(0, -1);
      data.jsonLd.push(productStructuredData(product));
    }
  } else if (path.startsWith('/content/pages/')) {
    const slug = path.slice('/content/pages/'.length);
    data.page = await CmsPage.findOne({ slug, isPublished: true }).select('title content updatedAt').lean();
    if (!data.page) data.status = 404;
  } else if (path.startsWith('/brands/')) {
    const brands = await getPublicBrands();
    data.brand = brands.find(brand => `/brands/${brand.slug}` === path);
    if (!data.brand) data.status = 404;
    else { productQuery.brandSlug = data.brand.slug; breadcrumbs.push({ name: 'Brands', path: '/brands' }); }
  } else if (!STATIC_PAGES[path]) {
    data.category = categories.find(category => categoryPath(category, categories) === path);
    if (!data.category) data.status = 404;
    else { data.category = { ...data.category, canonicalPath: path }; productQuery.categoryId = String(data.category._id); }
  }
  if (data.status === 200 && !id && !data.page) {
    if (path === '/brands') data.links = (await getPublicBrands()).map(brand => ({ name: brand.name, path: `/brands/${brand.slug}` }));
    else if (path === '/' || ['/products', '/trending', '/low-stock'].includes(path) || data.category || data.brand) {
      if (path === '/trending') productQuery.isTrending = 'true';
      if (path === '/low-stock') productQuery.stockUpdatedOnly = 'true';
      const result = await getPublicProducts(productQuery);
      data.links = result.products.map(product => ({ name: product.name, path: productPath(product) }));
      if (path === '/') data.links.unshift(...categories.map(category => ({ name: category.name, path: categoryPath(category, categories) })), ...Object.entries(STATIC_PAGES).filter(([key]) => key !== '/').map(([key, [name]]) => ({ name, path: key })));
    }
  }
  data.metadata = routeMetadata({ ...data, pathname, notFound: data.status === 404 });
  if (!id && path !== '/' && data.status === 200) breadcrumbs.push({ name: data.metadata.heading, path });
  if (breadcrumbs.length > 1 && data.status === 200) data.jsonLd.push(breadcrumbData(breadcrumbs));
  return data;
};

export const SITEMAP_PAGE_SIZE = 1000;
const productMatch = categories => ({ isActive: true, $or: [{ categoryId: { $in: categories.map(category => category._id) } }, { categoryIds: { $in: categories.map(category => category._id) } }, { categoryId: null }, { categoryId: { $exists: false } }] });
const modified = date => date && !Number.isNaN(new Date(date).valueOf()) ? `<lastmod>${new Date(date).toISOString()}</lastmod>` : '';
const url = (path, date, images = []) => `<url><loc>${escapeHtml(new URL(path, SITE_ORIGIN).href)}</loc>${modified(date)}${images.slice(0, 5).filter(image => /^https?:\/\//.test(image?.url || '')).map(image => `<image:image><image:loc>${escapeHtml(image.url)}</image:loc></image:image>`).join('')}</url>`;
const xml = body => `<?xml version="1.0" encoding="UTF-8"?>\n${body}`;
export const sitemap = async file => {
  const categories = await getPublicCategories();
  if (file === 'sitemap.xml') {
    const count = await Product.countDocuments(productMatch(categories));
    const files = ['sitemap-pages.xml', ...Array.from({ length: Math.ceil(count / SITEMAP_PAGE_SIZE) }, (_, index) => `sitemap-products-${index + 1}.xml`)];
    return xml(`<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${files.map(name => `<sitemap><loc>${SITE_ORIGIN}/${name}</loc></sitemap>`).join('')}</sitemapindex>`);
  }
  if (file === 'sitemap-pages.xml') {
    const [brands, pages] = await Promise.all([getPublicBrands(), CmsPage.find({ isPublished: true }).select('slug updatedAt').lean()]);
    const entries = new Map(Object.keys(STATIC_PAGES).map(path => [path, url(path)]));
    for (const category of categories) { const path = categoryPath(category, categories); entries.set(path, url(path, category.updatedAt)); }
    for (const brand of brands) { const path = `/brands/${brand.slug}`; entries.set(path, url(path, brand.updatedAt)); }
    for (const page of pages) { const path = `/content/pages/${page.slug}`; if (!REDIRECTS[path]) entries.set(path, url(path, page.updatedAt)); }
    return xml(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...entries.values()].join('')}</urlset>`);
  }
  const index = /^sitemap-products-([1-9]\d*)\.xml$/.exec(file)?.[1];
  if (!index || Number(index) > 100000) return null;
  const products = await Product.find(productMatch(categories)).select('_id categoryId name images updatedAt').sort({ _id: 1 }).skip((Number(index) - 1) * SITEMAP_PAGE_SIZE).limit(SITEMAP_PAGE_SIZE).lean();
  if (!products.length) return null;
  const byId = new Map(categories.map(category => [String(category._id), category]));
  return xml(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${products.map(product => {
    const category = byId.get(String(product.categoryId));
    product.categoryPath = category ? categoryPath(category, categories) : null;
    return url(productPath(product), product.updatedAt, product.images);
  }).join('')}</urlset>`);
};
