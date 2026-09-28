import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { config } from '../src/config/env.js';
import { Category } from '../src/models/Category.js';
import { Product } from '../src/models/Product.js';
import { User } from '../src/models/User.js';
import { DealerProfile } from '../src/models/DealerProfile.js';
import { DealerPricing } from '../src/models/DealerPricing.js';
import { Session } from '../src/models/Session.js';
import { Brand } from '../src/models/Brand.js';
import { generateAccessToken } from '../src/utils/token.util.js';
import { productService } from '../src/services/product.service.js';

// Never seed or clean the developer's store. Each run owns a fresh local DB.
const databaseName = `vinexus_catalog_test_${crypto.randomBytes(8).toString('hex')}`;
await mongoose.connect('mongodb://127.0.0.1:27017', { dbName: databaseName, serverSelectionTimeoutMS: 5000 });
const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const base = `http://127.0.0.1:${server.address().port}${config.apiBaseUrl}`;
let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
const get = async (path, token) => {
  const response = await fetch(`${base}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  return { status: response.status, ...(await response.json()) };
};
try {
  const laptop = await Category.create({
    name: 'Laptop', slug: 'laptop',
    filterDefinitions: [{
      key: 'RAM', label: 'Memory', inputType: 'select', options: ['8GB', '16GB'],
      isRequired: true, isFilterable: true, sortOrder: 0,
    }],
  });
  const security = await Category.create({ name: 'Security', slug: 'security' });
  const main = await Category.create({ name: 'Gaming', slug: 'gaming', parentId: laptop._id });
  const sub = await Category.create({ name: 'RTX', slug: 'rtx', parentId: main._id });
  const deep = await Category.create({ name: 'Series', slug: 'series', parentId: sub._id });
  const hidden = await Category.create({ name: 'Hidden', slug: 'hidden', isActive: false });
  const hiddenChild = await Category.create({ name: 'Hidden child', slug: 'hidden-child', parentId: hidden._id });
  const orphan = await Category.create({ name: 'Orphan', slug: 'orphan', parentId: new mongoose.Types.ObjectId() });
  await Category.insertMany(Array.from({ length: 505 }, (_, i) => ({ name: `Extra ${i}`, slug: `extra-${i}`, parentId: security._id })));
  const makeProduct = (sku, categoryId, price, specs = [], isActive = true) => Product.create({
    sku, name: `Product ${sku}`, categoryId, standardPrice: price, dealerPrice: price / 2,
    specifications: [{ key: 'Brand', value: 'Unlisted Brand' }, ...specs], isActive,
  });
  const first = await makeProduct('LAP-A', main._id, 100, [{ key: 'RAM', value: '8GB' }, { key: 'Stock', value: '0' }]);
  const second = await makeProduct('LAP-B', sub._id, 200, [{ key: 'RAM', value: '16GB' }, { key: 'Stock', value: '5' }]);
  await makeProduct('DEEP', deep._id, 300);
  await makeProduct('CAMERA', security._id, 400);
  await makeProduct('HIDDEN', hiddenChild._id, 500);
  await makeProduct('ORPHAN', orphan._id, 600);
  const inactive = await makeProduct('INACTIVE', main._id, 700, [], false);
  const acer = await Brand.create({ name: 'ACER', slug: 'acer', logo: { url: 'https://res.cloudinary.com/test/image/upload/acer.webp' } });
  await Product.updateMany({ _id: { $in: [first._id, second._id] } }, { brandId: acer._id });

  const tree = await get('/categories/tree');
  check(tree.status === 200 && tree.data.categories.length === 510, 'Complete active tree is not truncated to one page');
  check(!tree.data.categories.some((c) => [String(hiddenChild._id), String(orphan._id)].includes(c._id)), 'Hidden/orphan branches excluded');
  check(tree.data.categories.find((c) => c.slug === 'gaming').parentId._id === String(laptop._id), 'Main belongs only to its own header');
  check(tree.data.categories.find((c) => c.slug === 'rtx').parentId._id === String(main._id), 'Sub belongs only to its own main');
  const all = await get('/products?limit=1');
  check(all.data.pagination.total === 4 && all.data.products.length === 1, 'Pagination counts only visible catalog products');
  check(!('dealerPrice' in all.data.products[0]), 'Wholesale fields absent for guest');
  check(/^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(all.data.products[0].categoryPath), 'Product API returns canonical database category path');
  const branch = await get(`/products?categoryId=${laptop._id}&limit=1`);
  check(branch.data.pagination.total === 3 && branch.data.pagination.totalPages === 3, 'Header includes all descendant products before pagination');
  const intersect = await get(`/products?categoryId=${laptop._id}&search=CAMERA`);
  check(intersect.data.pagination.total === 0, 'Search does not escape selected category');
  check((await get('/products?category=does-not-exist')).data.pagination.total === 0, 'Unknown category never returns all products');
  check((await get('/products?search=Laptop')).data.pagination.total === 3, 'Category search includes deep descendants');
  check((await get('/products?search=Unlisted')).data.pagination.total === 4, 'Search matches database brand specifications');
  check((await get('/products?search=%5B')).status === 200, 'Search treats regex characters literally');
  const specQuery = encodeURIComponent(JSON.stringify({ RAM: ['16GB'] }));
  const filtered = await get(`/products?category=laptop&specs=${specQuery}&limit=1`);
  check(filtered.data.pagination.total === 1 && filtered.data.products[0]._id === String(second._id), 'Spec filtering precedes pagination');
  check(branch.data.facets.specs.find((s) => s.key === 'RAM').values.length === 2, 'Facet values include products beyond current page');
  check(branch.data.facets.specs.find((s) => s.key === 'RAM').label === 'Memory', 'Facet uses category-owned label');
  check(tree.data.categories.find((c) => c.slug === 'laptop').filterDefinitions[0].key === 'RAM', 'Public category contract exposes product filter definitions');
  check((await get('/products?category=laptop&inStock=true')).data.pagination.total === 1, 'Stock filter uses stored quantity instead of active flag');
  check((await get('/products?category=laptop&minPrice=150&maxPrice=250')).data.pagination.total === 1, 'Price range is enforced server-side');
  check((await get('/products?brandSlug=unlisted-brand')).data.pagination.total === 4, 'New database brand is routable without frontend whitelist');
  check((await get('/products/brands')).data.brands.some((brand) => brand.name === 'UNLISTED BRAND'), 'Legacy database brands remain visible during migration');
  const acerProducts = await get('/products?brandSlug=acer');
  check(acerProducts.data.pagination.total === 2, 'Managed brand route returns linked products across category levels');
  check((await get('/products?specs=broken')).status === 400, 'Malformed specification filters rejected');
  check((await get(`/products/${inactive._id}`)).status === 404, 'Inactive product detail hidden');
  check((await get(`/categories/${hiddenChild._id}`)).status === 404, 'Inactive ancestor hides category detail');
  check((await get(`/products/${first._id}`)).data.stockStatus === 'out-of-stock', 'Product stock status reflects database');

  await assert.rejects(
    () => productService.createProduct({
      sku: 'INVALID-RAM', name: 'Invalid RAM option', categoryId: sub._id,
      standardPrice: 10, dealerPrice: 5, specifications: [{ key: 'RAM', value: '32GB' }],
    }),
    /option not configured/
  );
  checks++;
  await assert.rejects(
    () => productService.createProduct({
      sku: 'MISSING-RAM', name: 'Missing required RAM', categoryId: sub._id,
      standardPrice: 10, dealerPrice: 5, specifications: [],
    }),
    /required for this category/
  );
  checks++;

  const dealer = await User.create({ fullName: 'Test dealer', email: 'dealer@example.test', phone: '9876543210', role: 'dealer', accountStatus: 'active' });
  const profile = await DealerProfile.create({ userId: dealer._id, companyName: 'Test company', status: 'approved' });
  await DealerPricing.create({ dealerId: profile._id, productId: second._id, price: 10 });
  const session = await Session.create({ userId: dealer._id, userType: 'dealer', sessionId: crypto.randomUUID(), expiresAt: new Date(Date.now() + 60000) });
  const token = generateAccessToken({ userId: dealer._id, role: 'dealer', sessionId: session.sessionId });
  const dealerResult = await get('/products?category=laptop&sortBy=standardPrice&sortOrder=asc', token);
  check(dealerResult.data.products[0]._id === String(second._id) && dealerResult.data.products[0].applicablePrice === 10, 'Approved dealer sort uses actual custom price');
  await DealerProfile.updateOne({ _id: profile._id }, { status: 'rejected' });
  const revoked = await get(`/products/${second._id}`, token);
  check(revoked.data.applicablePrice === 200 && !('dealerPrice' in revoked.data), 'Revocation immediately restores standard pricing');
  await Category.updateOne({ _id: main._id }, { parentId: security._id });
  check((await get('/products?category=laptop')).data.pagination.total === 0, 'Reparenting immediately removes products from old header');
  check((await get('/products?category=security')).data.pagination.total === 4, 'Reparenting moves full product branch to new header');
  console.log(`PASS: ${checks} catalog API/database integration assertions`);
} finally {
  await new Promise((resolve) => server.close(resolve));
  assert.equal(mongoose.connection.name, databaseName);
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}
