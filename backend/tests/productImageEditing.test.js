import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { config } from '../src/config/env.js';
import { productService } from '../src/services/product.service.js';
import { Brand } from '../src/models/Brand.js';
import { Product } from '../src/models/Product.js';
import { Category } from '../src/models/Category.js';
import { AccessRole } from '../src/models/AccessRole.js';
import { User } from '../src/models/User.js';
import { Session } from '../src/models/Session.js';
import { generateAccessToken } from '../src/utils/token.util.js';
import { storageService } from '../src/services/storage/storage.service.js';
import { getStorageProvider } from '../src/integrations/storage/index.js';

// The runner's database guard redirects this connection to a disposable replica set.
test('real API/database product image replacement, SVG conversion, cleanup and category protection', async () => {
  assert.equal(process.env.NODE_ENV, 'test');
  assert.match(process.env.TEST_DATABASE_NAME || '', /^vinexus_full_test_/);
  await mongoose.connect(config.mongodbUri);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  try {
    const admin = await User.create({ fullName: 'Image edit test admin', email: 'image-test@example.test', phone: '9876543210', role: 'admin', accountStatus: 'active' });
    const session = await Session.create({ userId: admin._id, userType: 'admin', sessionId: randomUUID(), expiresAt: new Date(Date.now() + 600000) });
    const headers = { Authorization: `Bearer ${generateAccessToken({ userId: admin._id, role: 'admin', sessionId: session.sessionId })}` };
    const call = async (path, method = 'GET', data, extraHeaders = {}) => {
      const form = data instanceof FormData;
      const response = await fetch(`${base}${path}`, { method, headers: { ...headers, ...extraHeaders, ...(!form && data ? { 'Content-Type': 'application/json' } : {}) }, ...(data ? { body: form ? data : JSON.stringify(data) } : {}) });
      return { status: response.status, body: await response.json() };
    };
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="16"><rect width="32" height="16" fill="#800020"/></svg>';
    const form = (source = svg, field = 'file') => { const value = new FormData(); value.append(field, new Blob([source], { type: 'image/svg+xml' }), 'artwork.svg'); return value; };
    const footerRole = await AccessRole.create({ name: 'Footer editor', permissions: { 'footer-content': { read: true, write: true } } });
    const employee = await User.create({ fullName: 'Footer editor', email: 'footer@example.test', phone: '9888888888', role: 'admin', isEmployee: true, accessRoleId: footerRole._id, accountStatus: 'active', status: 'active' });
    const employeeSession = await Session.create({ userId: employee._id, userType: 'admin', sessionId: randomUUID(), expiresAt: new Date(Date.now() + 600000) });
    const employeeHeaders = { Authorization: `Bearer ${generateAccessToken({ userId: employee._id, role: 'admin', sessionId: employeeSession.sessionId })}` };
    const qr = await call('/admin/cms/footer-content/images/bank-qr', 'POST', form(), employeeHeaders);
    assert.equal(qr.status, 200, JSON.stringify(qr.body));
    const qrFile = getStorageProvider().getUploadedFile(qr.body.data.publicId);
    assert.equal(qrFile.category, 'qr'); assert.equal(qrFile.mimetype, 'image/webp');
    assert.equal((await call('/admin/upload/file', 'POST', form(), employeeHeaders)).status, 403, 'Footer edits do not grant shared-media access');
    assert.equal((await call('/admin/cms/footer-content/images/invalid', 'POST', form(), employeeHeaders)).status, 400);
    await AccessRole.updateOne({ _id: footerRole._id }, { $set: { 'permissions.footer-content.write': false } });
    assert.equal((await call('/admin/cms/footer-content/images/bank-qr', 'POST', form(), employeeHeaders)).status, 403, 'Read-only footer users cannot upload');

    const category = await Category.create({ name: 'Test cameras', slug: 'image-test-cameras', filterDefinitions: [{ key: 'Resolution', label: 'Resolution', inputType: 'text', isRequired: true }] });
    const oldImage = await storageService.uploadFile({ buffer: Buffer.from(svg), originalname: 'old.svg', mimetype: 'image/svg+xml', folder: 'vinexus/products/test' });
    const product = await Product.create({ sku: 'IMAGE-TEST', name: 'Legacy camera', categoryId: category._id, categoryIds: [category._id], stockQuantity: 18, isActive: true, images: [oldImage] });
    await Product.collection.updateOne({ _id: product._id }, { $set: { modelNumber: '', brandId: null } });
    const upload = await call(`/admin/products/${product._id}/images`, 'POST', form());
    assert.equal(upload.status, 200, JSON.stringify(upload.body));
    const image = upload.body.data.uploadedImage;
    assert.ok(image.publicId); assert.match(image.url, /\.webp$/);
    assert.equal(getStorageProvider().getUploadedFile(image.publicId).mimetype, 'image/webp');
    const edit = await call(`/admin/products/${product._id}`, 'PUT', { images: [{ ...image, sortOrder: 0 }], expectedImages: [oldImage.publicId, image.publicId] });
    assert.equal(edit.status, 200, JSON.stringify(edit.body));
    const saved = await Product.findById(product._id).lean();
    assert.equal(saved.isActive, true); assert.equal(saved.stockQuantity, 18); assert.equal(saved.modelNumber, '');
    assert.equal(saved.images.length, 1); assert.equal(saved.images[0].publicId, image.publicId);
    assert.equal(getStorageProvider().getUploadedFile(oldImage.publicId), undefined);
    assert.deepEqual(saved.pendingImageDeletions, []);

    const stale = await call(`/admin/products/${product._id}`, 'PUT', { images: [], expectedImages: [oldImage.publicId] });
    assert.equal(stale.status, 409, 'A stale browser must not delete another session’s gallery');
    assert.equal((await Product.findById(product._id)).images.length, 1);

    const invalidSpec = await call(`/admin/products/${product._id}`, 'PUT', { specifications: [] });
    assert.equal(invalidSpec.status, 400);
    assert.equal(invalidSpec.body.details[0].path, 'specifications.Resolution');
    const invalidImage = await call(`/admin/products/${product._id}`, 'PUT', { images: [{ url: '' }] });
    assert.equal(invalidImage.status, 400); assert.equal(invalidImage.body.details[0].path, 'images.0.url');
    const invalidUpload = await call(`/admin/products/${product._id}/images`, 'POST', form('not SVG'));
    assert.equal(invalidUpload.status, 400);
    assert.equal((await Product.findById(product._id)).images.length, 1);
    const clearOptional = await call(`/admin/products/${product._id}`, 'PUT', { productUrl: null, informationPhone: null });
    assert.equal(clearOptional.status, 200);

    const brand = await Brand.create({ name: 'Order Test Brand', slug: 'order-test-brand' });
    const orderedSpecs = [{ key: 'Power', value: 'PoE' }, { key: 'Brand', value: 'Old name' }, { key: 'Resolution', value: '4 MP' }];
    const ordered = await call(`/admin/products/${product._id}`, 'PUT', { brandId: String(brand._id), specifications: orderedSpecs });
    assert.equal(ordered.status, 200, JSON.stringify(ordered.body));
    assert.deepEqual(ordered.body.data.specifications.map(spec => spec.key), ['Power', 'Brand', 'Resolution']);
    assert.equal(ordered.body.data.specifications[1].value, brand.name, 'Managed brand updates preserve its row position');
    const createdOrdered = await productService.createProduct({ sku: 'ORDERED-NEW', name: 'Ordered product', modelNumber: 'ORDERED-MODEL', brandId: String(brand._id), categoryId: String(category._id), specifications: orderedSpecs, isActive: false });
    assert.deepEqual(createdOrdered.specifications.map(spec => spec.key), ['Power', 'Brand', 'Resolution']);
    await Product.deleteOne({ _id: createdOrdered._id });

    // Shared generic upload route (brand/category/footer images) uses the same conversion.
    const generic = await call('/admin/upload/image', 'POST', form(svg, 'image'));
    assert.equal(generic.status, 200, JSON.stringify(generic.body)); assert.equal(generic.body.data.format, 'webp');
    await storageService.deleteFile(generic.body.data.publicId);
    const blocked = await call(`/admin/categories/${category._id}`, 'DELETE');
    assert.equal(blocked.status, 409); assert.equal(await Product.countDocuments({ _id: product._id }), 1);
    assert.ok(await Category.exists({ _id: category._id }));
    const other = await Category.create({ name: 'Other', slug: 'image-test-other' });
    await Product.updateOne({ _id: product._id }, { $set: { categoryId: other._id, categoryIds: [category._id, other._id] } });
    assert.equal((await call(`/admin/categories/${category._id}`, 'DELETE')).status, 409, 'Secondary category links must also block deletion');
    await Product.updateOne({ _id: product._id }, { $set: { categoryIds: [other._id] } });
    assert.equal((await call(`/admin/categories/${category._id}`, 'DELETE')).status, 200);
    assert.equal(await Product.countDocuments({ _id: product._id }), 1);
    console.log('PASS: product/SVG API flow, legacy edit, field errors, old-asset cleanup, and category safeguards');
  } finally { await new Promise(resolve => server.close(resolve)); await mongoose.disconnect(); }
});
