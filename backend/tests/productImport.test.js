import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import sharp from 'sharp';
import app from '../src/app.js';
import { config } from '../src/config/env.js';
import { Category } from '../src/models/Category.js';
import { Brand } from '../src/models/Brand.js';
import { Product } from '../src/models/Product.js';
import { User } from '../src/models/User.js';
import { Session } from '../src/models/Session.js';
import { generateAccessToken } from '../src/utils/token.util.js';
import { getPublicProducts } from '../src/services/catalog.service.js';
import { productService } from '../src/services/product.service.js';
import { createProductImportTemplate, previewProductImport, commitProductImport } from '../src/services/productImport.service.js';
import { getStorageProvider, setStorageProvider } from '../src/integrations/storage/index.js';

const dbName = `vinexus_product_import_test_${crypto.randomBytes(8).toString('hex')}`;
const originalProvider = getStorageProvider();
let imageSequence = 0;
let server;
setStorageProvider({
  async uploadFile() {
    imageSequence += 1;
    return { url: `https://example.test/product-${imageSequence}.webp`, publicId: `test-${imageSequence}` };
  },
  async deleteFile() { return { success: true }; },
});

const makeWorkbook = async (values) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(await createProductImportTemplate()));
  const sheet = workbook.getWorksheet('Products');
  for (const value of values) sheet.addRow(value);
  return Buffer.from(await workbook.xlsx.writeBuffer());
};

try {
  await mongoose.connect('mongodb://127.0.0.1:27017', { dbName, serverSelectionTimeoutMS: 5000 });
  const header = await Category.create({ name: 'Laptop', slug: 'laptop', filterDefinitions: [{
    key: 'RAM', label: 'Memory', inputType: 'select', options: ['8GB', '16GB'], isRequired: true, isFilterable: true,
  }] });
  const main = await Category.create({ name: 'Branded Laptop', slug: 'branded-laptop', parentId: header._id });
  await Brand.create({ name: 'ACER', slug: 'acer' });
  const image = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#ffffff' } }).png().toBuffer();
  const archive = new JSZip();
  archive.file('header.png', image);
  archive.file('main.png', image);
  const imageZip = await archive.generateAsync({ type: 'nodebuffer' });
  const row = (sku, modelNumber, name, mainName, quantity, imageName) => [
    sku, modelNumber, 'IdeaPad', name, 'ACER', 'Laptop', mainName, '', 45999, 42999,
    quantity, 'A laptop with warranty', '', '1 Year', 'India', '', '', '{"RAM":"16GB"}',
    'No', 'Yes', imageName,
  ];
  const workbook = await makeWorkbook([
    row('LAP-HEADER', 'MODEL-HEADER', 'Header Laptop', '', 3, 'header.png'),
    row('LAP-MAIN', 'MODEL-MAIN', 'Main Laptop', 'Branded Laptop', 8, 'main.png'),
  ]);
  const preview = await previewProductImport(workbook, imageZip);
  assert.equal(preview.valid, 2);
  assert.equal(preview.invalid, 0);
  assert.match(preview.rows[0].imagePreview, /^data:image\/webp;base64,/);
  assert.equal(await Product.countDocuments(), 0, 'Preview must not write products');

  const result = await commitProductImport(workbook, imageZip);
  assert.equal(result.created, 2);
  assert.equal(result.failed, 0);
  const headerProduct = await Product.findOne({ sku: 'LAP-HEADER' }).lean();
  assert.equal(String(headerProduct.categoryId), String(header._id));
  assert.equal(headerProduct.modelNumber, 'MODEL-HEADER');
  assert.equal(headerProduct.standardPrice, 45999);
  assert.equal(headerProduct.dealerPrice, 42999);
  assert.equal(headerProduct.images.length, 1);
  assert.equal(headerProduct.images[0].url, 'https://example.test/product-1.webp');
  assert.equal(headerProduct.isActive, true);
  const mainProduct = await Product.findOne({ sku: 'LAP-MAIN' }).lean();
  assert.equal(String(mainProduct.categoryId), String(main._id));
  assert.equal(mainProduct.specifications.find((spec) => spec.key === 'Stock').value, '8');
  const listed = await getPublicProducts({ categoryId: String(header._id) });
  assert.equal(listed.pagination.total, 2);
  assert.ok(listed.products.every((product) => product.images.length === 1));

  const duplicate = await previewProductImport(workbook, imageZip);
  assert.equal(duplicate.invalid, 2, 'Existing SKU and model numbers are rejected');
  const invalidWorkbook = await makeWorkbook([row('LAP-BROKEN', 'MODEL-BROKEN', 'Broken Laptop', '', 3, 'missing.png')]);
  const invalidPreview = await previewProductImport(invalidWorkbook, imageZip);
  assert.equal(invalidPreview.invalid, 1);
  await assert.rejects(() => commitProductImport(invalidWorkbook, imageZip), /invalid rows/i);
  assert.equal(await Product.countDocuments(), 2, 'Invalid import must not write products');
  const duplicateRows = await makeWorkbook([
    row('LAP-REPEATED', 'MODEL-ONE', 'Repeated One', '', 3, 'header.png'),
    row('LAP-REPEATED', 'MODEL-ONE', 'Repeated Two', '', 3, 'main.png'),
  ]);
  const repeatedPreview = await previewProductImport(duplicateRows, imageZip);
  assert.equal(repeatedPreview.invalid, 1, 'Repeated model number in the same workbook is rejected');
  assert.notEqual(repeatedPreview.rows[0].sku, repeatedPreview.rows[1].sku, 'Repeated SKU is replaced with a generated unique SKU');
  const missingSpecValues = row('LAP-NORAM', 'MODEL-NORAM', 'No RAM Laptop', '', 3, 'header.png');
  missingSpecValues[17] = '';
  assert.match((await previewProductImport(await makeWorkbook([missingSpecValues]), imageZip)).rows[0].errors.join(' '), /Memory is required/);
  const badArchive = new JSZip();
  badArchive.file('header.png', 'not an image');
  const badImagePreview = await previewProductImport(
    await makeWorkbook([row('LAP-BAD-IMAGE', 'MODEL-BAD-IMAGE', 'Bad Image Laptop', '', 3, 'header.png')]),
    await badArchive.generateAsync({ type: 'nodebuffer' })
  );
  assert.match(badImagePreview.rows[0].errors.join(' '), /Image could not be read/);

  const newCategoryRow = row('', 'MODEL-TABLET', 'Apple Full Size Tablet', 'Full Size Tablet', 6, '');
  newCategoryRow[4] = 'Apple';
  newCategoryRow[5] = 'Tablets';
  newCategoryRow[17] = '';
  newCategoryRow[19] = '';
  const tabletWorkbook = await makeWorkbook([newCategoryRow]);
  const tabletPreview = await previewProductImport(tabletWorkbook);
  assert.equal(tabletPreview.valid, 1);
  assert.deepEqual(tabletPreview.newCategories.map((category) => category.name), ['Tablets', 'Full Size Tablet']);
  assert.deepEqual(tabletPreview.newBrands.map((brand) => brand.name), ['Apple']);
  assert.match(tabletPreview.rows[0].sku, /^VNX-/);
  assert.equal(await Category.countDocuments({ name: 'Tablets' }), 0, 'Preview must not create categories');
  const tabletResult = await commitProductImport(tabletWorkbook);
  assert.equal(tabletResult.created, 1);
  assert.equal(tabletResult.createdCategories, 2);
  assert.equal(tabletResult.createdBrands, 1);
  const tablet = await Product.findOne({ modelNumber: 'MODEL-TABLET' }).lean();
  const tabletMain = await Category.findOne({ name: 'Full Size Tablet' }).lean();
  assert.equal(String(tablet.categoryId), String(tabletMain._id));
  assert.equal(tablet.images.length, 0, 'Product images may be added later');
  assert.equal(tablet.isActive, true, 'Publishing without images is supported for bulk import');
  await productService.updateProduct(tablet._id, { description: 'Updated before the image was added' });
  assert.equal((await Product.findById(tablet._id)).description, 'Updated before the image was added');
  assert.equal((await getPublicProducts({ categoryId: String(tabletMain._id) })).products[0].modelNumber, 'MODEL-TABLET');
  const subRow = row('', 'MODEL-PRO-TABLET', 'Apple Pro Tablet', 'Full Size Tablet', 7, '');
  subRow[4] = 'Apple';
  subRow[5] = 'Tablets';
  subRow[7] = 'Pro Tablet';
  subRow[17] = '';
  const subPreview = await previewProductImport(await makeWorkbook([subRow]));
  assert.deepEqual(subPreview.newCategories.map((category) => category.name), ['Pro Tablet']);
  await commitProductImport(await makeWorkbook([subRow]));
  const subCategory = await Category.findOne({ name: 'Pro Tablet' }).lean();
  assert.equal(String(subCategory.parentId), String(tabletMain._id));
  assert.equal((await getPublicProducts({ categoryId: String(subCategory._id) })).products[0].categoryPath,
    '/tablets/full-size-tablet/pro-tablet');
  const incompleteRow = row('LAP-INCOMPLETE', 'MODEL-INCOMPLETE', 'Incomplete Laptop', '', 3, 'header.png');
  incompleteRow[8] = '';
  const incompleteBatch = await makeWorkbook([
    row('LAP-COMPLETE', 'MODEL-COMPLETE', 'Complete Laptop', '', 3, 'main.png'), incompleteRow,
  ]);
  await assert.rejects(() => commitProductImport(incompleteBatch, imageZip), /invalid rows/i);
  assert.equal(await Product.countDocuments({ modelNumber: { $in: ['MODEL-COMPLETE', 'MODEL-INCOMPLETE'] } }), 0,
    'One incomplete row prevents the entire batch');

  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}${config.apiBaseUrl}/admin/products/import`;
  assert.equal((await fetch(`${base}/template`)).status, 401, 'Template requires admin authentication');
  const admin = await User.create({ fullName: 'Import Admin', email: 'import-admin@example.test', phone: '9999999999', role: 'admin', accountStatus: 'active' });
  const session = await Session.create({ userId: admin._id, userType: 'admin', sessionId: crypto.randomUUID(), expiresAt: new Date(Date.now() + 60000) });
  const token = generateAccessToken({ userId: admin._id, role: 'admin', sessionId: session.sessionId });
  const auth = { Authorization: `Bearer ${token}` };
  const templateResponse = await fetch(`${base}/template`, { headers: auth });
  assert.equal(templateResponse.status, 200);
  assert.match(templateResponse.headers.get('content-type'), /spreadsheetml/);
  const routeWorkbook = await makeWorkbook([row('LAP-ROUTE', 'MODEL-ROUTE', 'Route Laptop', '', 6, 'header.png')]);
  const form = () => {
    const body = new FormData();
    body.append('workbook', new Blob([routeWorkbook], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'products.xlsx');
    body.append('imagesZip', new Blob([imageZip], { type: 'application/zip' }), 'images.zip');
    return body;
  };
  const routePreview = await fetch(`${base}/preview`, { method: 'POST', headers: auth, body: form() });
  assert.equal(routePreview.status, 200);
  assert.equal((await routePreview.json()).data.valid, 1);
  const routeCommit = await fetch(`${base}/commit`, { method: 'POST', headers: auth, body: form() });
  assert.equal(routeCommit.status, 200);
  assert.equal((await routeCommit.json()).data.created, 1);
  assert.equal(await Product.countDocuments(), 5);
  const dbFailureRow = row('', 'MODEL-DB-FAIL', 'Database Failure Tablet', 'Large Tablet', 4, '');
  dbFailureRow[4] = 'Brand On Database Failure';
  dbFailureRow[5] = 'Category On Database Failure';
  dbFailureRow[17] = '';
  const originalInsertMany = Product.insertMany;
  Product.insertMany = async () => { throw new Error('Simulated database insert failure'); };
  try {
    const dbFailureWorkbook = await makeWorkbook([dbFailureRow]);
    await assert.rejects(() => commitProductImport(dbFailureWorkbook), /no products were added/i);
  } finally { Product.insertMany = originalInsertMany; }
  assert.equal(await Product.countDocuments(), 5, 'Database failure leaves no partial products');
  assert.equal(await Category.countDocuments({ name: 'Category On Database Failure' }), 0);
  assert.equal(await Brand.countDocuments({ name: 'Brand On Database Failure' }), 0);
  setStorageProvider({
    async uploadFile() { throw new Error('Simulated storage outage'); },
    async deleteFile() { return { success: true }; },
  });
  const failureRow = row('LAP-FAIL', 'MODEL-FAIL', 'Storage Failure Laptop', '', 3, 'header.png');
  failureRow[4] = 'New Brand On Failure';
  failureRow[5] = 'New Category On Failure';
  failureRow[17] = '';
  const failureWorkbook = await makeWorkbook([failureRow]);
  await assert.rejects(() => commitProductImport(failureWorkbook, imageZip), /no products were added/i);
  assert.equal(await Product.countDocuments(), 5, 'Failed image upload writes no products');
  assert.equal(await Category.countDocuments({ name: 'New Category On Failure' }), 0);
  assert.equal(await Brand.countDocuments({ name: 'New Brand On Failure' }), 0);
  console.log('Product import integration passed: template, preview, images, header/main categories, database and catalog.');
} finally {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  setStorageProvider(originalProvider);
}
