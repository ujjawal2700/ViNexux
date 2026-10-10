import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { config } from '../src/config/env.js';
import { Category } from '../src/models/Category.js';
import { Product } from '../src/models/Product.js';
import { Brand } from '../src/models/Brand.js';
import { productService } from '../src/services/product.service.js';

// Never seed or clean the developer's store. Each run owns a fresh local DB.
const databaseName = `vinexus_catalog_sort_test_${crypto.randomBytes(8).toString('hex')}`;
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
  const laptop = await Category.create({ name: 'Laptop', slug: 'laptop' });
  const security = await Category.create({ name: 'Security', slug: 'security' });
  const acer = await Brand.create({ name: 'ACER', slug: 'acer' });
  const makeProduct = (sku, categoryId) => Product.create({ sku, name: `Product ${sku}`, categoryId, stockQuantity: 0, isActive: true });
  const first = await makeProduct('FIRST', laptop._id);
  const second = await makeProduct('SECOND', laptop._id);
  await makeProduct('THIRD', security._id);
  await makeProduct('FOURTH', security._id);
  const trendingDraft = await productService.createProduct({
    sku: 'TRENDING-DRAFT', name: 'Trending draft', modelNumber: 'TRENDING-DRAFT-MODEL',
    categoryId: security._id, brandId: acer._id, isActive: false, isTrending: true,
  });
  check((await Product.findById(trendingDraft._id).lean()).isTrending === true, 'Trending checkbox persists on product creation');
  await productService.updateProduct(first._id, { stockQuantity: 12, isTrending: true });
  const firstStockUpdate = await Product.findById(first._id).lean();
  check(firstStockUpdate.stockUpdatedAt instanceof Date, 'Stock change timestamp persists in the database');
  await productService.updateProduct(first._id, { name: 'Edited trending product', stockQuantity: 12 });
  check((await Product.findById(first._id).lean()).stockUpdatedAt.getTime() === firstStockUpdate.stockUpdatedAt.getTime(), 'Saving unchanged stock or editing the name does not refresh stock timestamp');
  await Product.collection.updateOne({ _id: first._id }, { $set: { stockUpdatedAt: new Date('2020-01-01') } });
  await productService.updateProduct(second._id, { stockQuantity: 15 });
  const stockSorted = await get('/products?sortBy=stockUpdatedAt&sortOrder=desc&limit=1');
  check(stockSorted.data.products[0]._id === String(second._id) && stockSorted.data.pagination.total === 4, 'Stock updated sort orders across pages and retains products with no stock update');
  check((await get('/products?sortBy=stockUpdatedAt&sortOrder=desc&page=2&limit=1')).data.products[0]._id === String(first._id), 'Older stock updates follow newer stock updates');
  check((await get('/products?stockUpdatedOnly=true')).data.pagination.total === 2, 'Homepage can still request only stock-updated products');
  await Product.collection.updateOne({ _id: second._id }, { $set: { createdAt: new Date('2040-01-01') } });
  check((await get('/products?sortBy=createdAt&sortOrder=desc&limit=1')).data.products[0]._id === String(second._id), 'Newest-first uses creation time across the whole catalog');
  const trending = await get('/products?isTrending=true&limit=1');
  check(trending.data.pagination.total === 1 && trending.data.products[0]._id === String(first._id), 'Trending filtering happens before pagination and excludes drafts');
  check((await get('/products?isTrending=true&category=security')).data.pagination.total === 0, 'Trending filter respects the selected category');
  check((await get('/products?isTrending=invalid')).status === 400, 'Invalid trending filter is rejected');
  await productService.updateProduct(first._id, { isTrending: false });
  check((await get('/products?isTrending=true')).data.pagination.total === 0, 'Unchecking trending removes the product from the public filter');
  console.log(`PASS: ${checks} catalog sorting and trending integration assertions`);
} finally {
  await new Promise((resolve) => server.close(resolve));
  assert.equal(mongoose.connection.name, databaseName);
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}
