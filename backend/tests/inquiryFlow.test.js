import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { config } from '../src/config/env.js';
import { Product } from '../src/models/Product.js';
import { Category } from '../src/models/Category.js';
import { User } from '../src/models/User.js';
import { Session } from '../src/models/Session.js';
import { Enquiry } from '../src/models/Enquiry.js';
import { generateAccessToken } from '../src/utils/token.util.js';

test('real API inquiry checkout, address compatibility, zero stock, and model search', async () => {
  assert.equal(process.env.NODE_ENV, 'test');
  assert.match(process.env.TEST_DATABASE_NAME || '', /^vinexus_full_test_/);
  await mongoose.connect(config.mongodbUri);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    const customer = await User.create({ fullName: 'Test Customer', email: 'inquiry@example.test', phone: '9876543210', role: 'customer', accountStatus: 'active', status: 'active' });
    // Legacy incomplete accounts must still be able to manage addresses and supply checkout contact details.
    await User.collection.updateOne({ _id: customer._id }, { $unset: { fullName: '', name: '' } });
    const session = await Session.create({ userId: customer._id, userType: 'customer', sessionId: randomUUID(), expiresAt: new Date(Date.now() + 600000) });
    const token = generateAccessToken({ userId: customer._id, role: 'customer', sessionId: session.sessionId });
    const base = `http://127.0.0.1:${server.address().port}${config.apiBaseUrl}`;
    const call = async (path, method = 'GET', data) => {
      const response = await fetch(base + path, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(data ? { body: JSON.stringify(data) } : {}) });
      return { status: response.status, body: await response.json() };
    };
    const category = await Category.create({ name: 'Security cameras', slug: 'inquiry-cameras' });
    const product = await Product.create({ name: 'Outdoor Camera', sku: 'UNRELATED-SKU', modelNumber: 'DS-2CD2043G2-I', categoryId: category._id, stockQuantity: 0, standardPrice: 100, isActive: true });
    for (const term of ['ds-2cd2043g2-i', '2043g2', 'DS-2CD']) {
      const found = await call(`/products?search=${encodeURIComponent(term)}`);
      assert.equal(found.status, 200, JSON.stringify(found.body));
      assert.ok(found.body.data.products.some(row => String(row._id) === String(product._id)));
    }
    await Product.updateOne({ _id: product._id }, { $set: { modelNumber: 'IPC-HFW1230S-S5' } });
    assert.ok((await call('/products?search=hfw1230')).body.data.products.some(row => String(row._id) === String(product._id)));
    // Existing products also match during catalog-field backfill.
    await Product.collection.updateOne({ _id: product._id }, { $set: { searchTokens: [], catalogFieldsVersion: 1 } });
    assert.ok((await call('/products?search=IPC-HFW')).body.data.products.some(row => String(row._id) === String(product._id)));
    const deliveryAddress = { line1: 'A'.repeat(255), line2: 'B'.repeat(255), city: 'C', state: 'D', pincode: '302001' };
    const saved = await call('/addresses', 'POST', deliveryAddress);
    assert.equal(saved.status, 201, JSON.stringify(saved.body));
    const addressId = String(saved.body.data.addresses[0]._id);
    const cart = await call('/cart/items', 'POST', { productId: String(product._id), quantity: 1 });
    assert.equal(cart.status, 200, JSON.stringify(cart.body));
    assert.equal((await call(`/cart/items/${product._id}`, 'PUT', { quantity: 2 })).status, 200);
    const payload = { addressId, deliveryAddress, contactName: 'Checkout Customer', contactEmail: 'checkout@example.test', contactPhone: '9876543210', whatsappNumber: '9876543210', selectedProductIds: [String(product._id)] };
    const invalid = await call('/enquiries', 'POST', { ...payload, contactName: '' });
    assert.equal(invalid.status, 400); assert.equal(invalid.body.details[0].path, 'contactName'); assert.match(invalid.body.message, /full name/i);
    const created = await call('/enquiries', 'POST', payload);
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const enquiry = await Enquiry.findById(created.body.data.enquiry._id).lean();
    assert.equal(enquiry.contactName, 'Checkout Customer'); assert.equal(enquiry.items[0].quantity, 2); assert.equal(enquiry.deliveryAddress.line1.length, 255);
    assert.equal((await Product.findById(product._id)).stockQuantity, 0);
    const cleared = (await call('/cart')).body.data;
    assert.equal((cleared.cart || cleared).items.length, 0);
    // Positive stock quantity limits still apply to the inquiry cart.
    await Product.updateOne({ _id: product._id }, { $set: { stockQuantity: 2 } });
    assert.equal((await call('/cart/items', 'POST', { productId: String(product._id), quantity: 3 })).status, 400);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await mongoose.disconnect();
  }
});
