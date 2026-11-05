import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import mongoose from 'mongoose';
import supertest from '../../node_modules/supertest/index.js';
import app from '../src/app.js';
import { Category } from '../src/models/Category.js';
import { Product } from '../src/models/Product.js';
import { Brand } from '../src/models/Brand.js';
import { CmsPage } from '../src/models/CmsPage.js';
import { WebsiteSettings } from '../src/models/WebsiteSettings.js';

const uri = 'mongodb://127.0.0.1:27019';
const dbName = `vinexus_seo_test_${Date.now()}`;
let connected = false;
try {
  await mongoose.connect(`${uri}/?replicaSet=vinexusAccessTest`, { dbName, serverSelectionTimeoutMS: 5000 }); connected = true;
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
  const request = supertest(app);
  await WebsiteSettings.create({ singletonKey: 'primary' });
  const root = await Category.create({ name: 'Security', slug: 'security' });
  const child = await Category.create({ name: 'Cameras', slug: 'cameras', parentId: root._id });
  const disabled = await Category.create({ name: 'Disabled', slug: 'disabled', isActive: false });
  const hiddenChild = await Category.create({ name: 'Hidden child', slug: 'hidden-child', parentId: disabled._id });
  const brand = await Brand.create({ name: 'Example Cameras', slug: 'example-cameras' });
  const product = await Product.create({ name: '8 MP Searchable Camera', sku: 'SEO-CAM', modelNumber: 'SEO-8MP', categoryId: child._id, brandId: brand._id, description: 'Detailed surveillance camera for businesses.', standardPrice: 4999, stockQuantity: 5, isActive: true, images: [{ url: 'https://cdn.example/camera.jpg?width=400&format=webp' }], specifications: [{ key: 'Resolution', value: '8 MP' }] });
  const draft = await Product.create({ name: 'Draft Camera', sku: 'SEO-DRAFT', modelNumber: 'SEO-DRAFT', categoryId: child._id, isActive: false });
  const hidden = await Product.create({ name: 'Hidden Camera', sku: 'SEO-HIDDEN', modelNumber: 'SEO-HIDDEN', categoryId: hiddenChild._id, isActive: true });
  await CmsPage.create({ slug: 'about-us', title: 'About ViNexus', content: '<p>Networking and CCTV distribution in Kota.</p>', isPublished: true });
  await CmsPage.create({ slug: 'unpublished', title: 'Unpublished', content: 'Private draft', isPublished: false });
  const index = await request.get('/api/seo/sitemap.xml');
  assert.equal(index.status, 200); assert.match(index.headers['content-type'], /xml/);
  assert.ok(index.text.includes('https://vinexus.in/sitemap-products-1.xml'));
  const pages = await request.get('/api/seo/sitemap-pages.xml');
  const products = await request.get('/api/seo/sitemap-products-1.xml');
  assert.ok(pages.text.includes('/security/cameras'));
  assert.ok(pages.text.includes('/brands/example-cameras'));
  assert.ok(pages.text.includes('/content/pages/about-us'));
  assert.ok(!pages.text.includes('/disabled') && !pages.text.includes('/unpublished') && !pages.text.includes('/login'));
  assert.ok(products.text.includes(`/security/cameras/${product._id}`));
  assert.ok(!products.text.includes(String(draft._id)) && !products.text.includes(String(hidden._id)));
  assert.ok(products.text.includes('&amp;format=webp'));
  for (const [name, response] of [['index', index], ['pages', pages], ['products', products]]) writeFileSync(`/tmp/vinexus-sitemap-${name}.xml`, response.text);
  assert.equal((await request.get('/api/seo/sitemap-products-2.xml')).status, 404);
  for (const path of ['/', '/products', '/brands', '/security', '/security/cameras', '/brands/example-cameras', '/content/pages/about-us', '/privacy', '/terms', '/shipping-policy']) {
    const response = await request.get('/api/share-page').query({ path });
    assert.equal(response.status, 200, path);
    assert.ok(response.text.includes('<h1>'), path);
    assert.ok(response.text.includes('name="google-site-verification" content="BIdzIKiLz_srzFwDsNbqfYMPkuBRJpeEJhTRNMotlqU"'), path);
    assert.ok(response.text.includes('name="robots" content="index, follow'), path);
    assert.ok(response.text.includes('rel="canonical" href="https://vinexus.in/'), path);
  }
  for (const path of [`/products/${product._id}`, `/brands/example-cameras/${product._id}`, `/security/cameras/${product._id}`]) {
    const response = await request.get('/api/share-page').query({ path });
    assert.equal(response.status, 200, response.text);
    assert.ok(response.text.includes(`<link rel="canonical" href="https://vinexus.in/security/cameras/${product._id}">`));
    assert.ok(response.text.includes('<h1>8 MP Searchable Camera</h1>'));
    assert.ok(response.text.includes('<dt>Resolution</dt><dd>8 MP</dd>'));
    assert.ok(response.text.includes('"@type":"Product"') && response.text.includes('"@type":"BreadcrumbList"'));
    assert.ok(!response.text.includes('4999'), 'Initial HTML does not expose gated prices');
  }
  for (const path of ['/missing-category', '/brands/missing', '/content/pages/unpublished', `/products/${draft._id}`, `/products/${hidden._id}`]) {
    const response = await request.get('/api/share-page').query({ path });
    assert.equal(response.status, 404, path);
    assert.ok(response.text.includes('name="robots" content="noindex, follow"'));
  }
  for (const path of ['/admin/login', '/account/profile', '/cart', '/invoices/private-token', '/search']) {
    const response = await request.get('/api/share-page').query({ path });
    assert.equal(response.status, 200);
    assert.equal(response.headers['x-robots-tag'], 'noindex, follow');
  }
  const filtered = await request.get('/api/share-page').query({ path: '/products', search: 'camera' });
  assert.equal(filtered.status, 200); assert.equal(filtered.headers['x-robots-tag'], 'noindex, follow');
  const extraProducts = Array.from({ length: 1000 }, (_, index) => ({ _id: new mongoose.Types.ObjectId(), name: `Partition Product ${index}`, sku: `PART-${index}`, modelNumber: `PART-${index}`, categoryId: child._id, isActive: true, updatedAt: new Date() }));
  await Product.collection.insertMany(extraProducts);
  const partitionIndex = await request.get('/api/seo/sitemap.xml');
  assert.ok(partitionIndex.text.includes('sitemap-products-2.xml'));
  const firstPartition = await request.get('/api/seo/sitemap-products-1.xml');
  const lastPartition = await request.get('/api/seo/sitemap-products-2.xml');
  assert.equal((firstPartition.text.match(/<url>/g) || []).length, 1000);
  assert.equal((lastPartition.text.match(/<url>/g) || []).length, 1);
  const redirect = await request.get('/api/share-page').query({ path: '/categories' });
  assert.equal(redirect.status, 301); assert.equal(redirect.headers.location, '/');
  await WebsiteSettings.updateOne({ singletonKey: 'primary' }, { maintenanceEnabled: true, maintenanceMessage: 'Updating the catalog.' });
  const maintenance = await request.get('/api/share-page').query({ path: '/' });
  assert.equal(maintenance.status, 503); assert.equal(maintenance.headers['retry-after'], '60');
  assert.ok(maintenance.text.includes('Updating the catalog.'));
  assert.equal((await request.get('/api/seo/sitemap.xml')).status, 503);
  console.log('SEO integration passed: live product/image sitemaps, active categories/brands/CMS, canonical URLs, initial crawlable HTML, schema without private prices, verification tag, noindex private pages, real 404s, redirects and maintenance 503s.');
} finally { if (connected) await mongoose.connection.dropDatabase(); await mongoose.disconnect(); }
