import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { config } from '../src/config/env.js';
import { Product } from '../src/models/Product.js';
import { Category } from '../src/models/Category.js';
import { WebsiteSettings } from '../src/models/WebsiteSettings.js';
import { User } from '../src/models/User.js';
import { Session } from '../src/models/Session.js';
import { Cart } from '../src/models/Cart.js';
import { generateAccessToken } from '../src/utils/token.util.js';

test('manual low stock, initial sharing HTML and requesting-browser session priority', async () => {
  assert.match(process.env.TEST_DATABASE_NAME || '', /^vinexus_full_test_/);
  await mongoose.connect(config.mongodbUri);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    const admin = await User.create({ fullName: 'Test Admin', email: 'sharing-admin@example.test', role: 'admin', accountStatus: 'active', status: 'active' });
    const customer = await User.create({ fullName: 'Test Customer', email: 'sharing-customer@example.test', phone: '9876543210', role: 'customer', accountStatus: 'active', status: 'active', savedAddresses: [{ line1: 'A', city: 'C', state: 'S', pincode: '302001' }] });
    const makeSession = async (user, createdAt = new Date()) => {
      const session = await Session.create({ userId: user._id, userType: user.role, sessionId: randomUUID(), createdAt, expiresAt: new Date(Date.now() + 600000) });
      return { session, token: generateAccessToken({ userId: user._id, role: user.role, sessionId: session.sessionId }) };
    };
    const first = await makeSession(admin, new Date(Date.now() - 60000));
    const second = await makeSession(admin);
    const buyer = await makeSession(customer);
    await Session.insertMany(Array.from({ length: 23 }, () => ({ userId: customer._id, userType: 'customer', sessionId: randomUUID(), expiresAt: new Date(Date.now() + 600000) })));
    const base = `http://127.0.0.1:${server.address().port}${config.apiBaseUrl}`;
    const call = async (path, method = 'GET', data, token = first.token) => {
      const response = await fetch(base + path, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(data ? { body: JSON.stringify(data) } : {}) });
      return { status: response.status, body: await response.json() };
    };
    for (const current of [first, second]) {
      const list = await call('/admin/sessions?limit=20', 'GET', null, current.token);
      assert.equal(list.status, 200, JSON.stringify(list.body));
      assert.equal(list.body.data.sessions[0].sessionId, current.session.sessionId);
      assert.equal(list.body.data.sessions.filter(row => row.isCurrent).length, 1);
      const next = await call('/admin/sessions?limit=20&page=2', 'GET', null, current.token);
      const ids = [...list.body.data.sessions, ...next.body.data.sessions].map(row => row._id);
      assert.equal(new Set(ids).size, 26); assert.equal(ids.length, 26);
      assert.equal((await call(`/admin/sessions/${current.session._id}`, 'GET', null, current.token)).body.data.session.isCurrent, true);
    }
    assert.equal((await call(`/admin/sessions/${first.session._id}/revoke`, 'PUT')).status, 400);
    assert.equal((await Session.findById(first.session._id)).isActive, true);
    assert.equal((await call(`/admin/sessions/${second.session._id}/revoke`, 'PUT')).status, 200);
    const filtered = await call('/admin/sessions?userType=customer');
    assert.equal(filtered.body.data.sessions.some(row => row.isCurrent), false);

    const category = await Category.create({ name: 'Adapters', slug: 'share-adapters' });
    const product = await Product.create({ name: '12V Adapter', modelNumber: 'AD-12V', sku: 'ADAPTER-SHARE', stockQuantity: 20, categoryId: category._id, isActive: true, standardPrice: 100, images: [{ url: 'https://cdn.example.test/adapter.webp', publicId: 'adapter' }] });
    const small = await Product.create({ name: 'Small stock', sku: 'SMALL-STOCK', stockQuantity: 3, categoryId: category._id, isActive: true });
    assert.equal((await call('/products?lowStock=true')).body.data.products.length, 0);
    const toggled = await call(`/admin/products/${product._id}`, 'PUT', { isLowStock: true });
    assert.equal(toggled.status, 200, JSON.stringify(toggled.body)); assert.equal(toggled.body.data.isLowStock, true);
    const list = (await call('/products?availability=low-stock')).body.data;
    assert.deepEqual(list.products.map(row => row._id), [String(product._id)]);
    assert.equal(list.products[0].stockStatus, 'low-stock'); assert.equal(list.products[0].stockQuantity, 20);
    assert.equal((await call(`/products/${small._id}`)).body.data.stockStatus, 'in-stock');
    assert.equal((await call('/cart/items', 'POST', { productId: String(product._id), quantity: 6 }, buyer.token)).status, 400);
    assert.equal((await call('/cart/items', 'POST', { productId: String(product._id), quantity: 5 }, buyer.token)).status, 200);
    assert.equal((await call(`/cart/items/${product._id}`, 'PUT', { quantity: 6 }, buyer.token)).status, 400);
    const cartResponse = (await call('/cart', 'GET', null, buyer.token)).body.data;
    assert.equal((cartResponse.cart || cartResponse).items[0].productId.isLowStock, true);
    // Flagging an item after it entered the cart must still enforce the limit at submission.
    await Cart.updateOne({ userId: customer._id }, { $set: { 'items.0.quantity': 6 } });
    const address = customer.savedAddresses[0];
    const enquiry = await call('/enquiries', 'POST', { contactName: customer.fullName, contactEmail: customer.email, contactPhone: customer.phone, whatsappNumber: customer.phone, addressId: String(address._id), deliveryAddress: address.toObject(), selectedProductIds: [String(product._id)] }, buyer.token);
    assert.equal(enquiry.status, 400); assert.match(enquiry.body.message, /5 units/);
    await Product.updateOne({ _id: product._id }, { $set: { stockQuantity: 3 } });
    assert.equal((await call(`/cart/items/${product._id}`, 'PUT', { quantity: 4 }, buyer.token)).status, 400);
    await call(`/admin/products/${product._id}`, 'PUT', { isLowStock: false });
    assert.equal((await call('/products?lowStock=true')).body.data.products.length, 0);

    await WebsiteSettings.create({ singletonKey: 'primary', websiteName: 'Vinexus', ogImage: { url: 'https://cdn.example.test/generic.png' } });
    for (const pathname of [`/products/${product._id}`, `/share-adapters/${product._id}`, `/brands/acme/${product._id}`]) {
      const response = await fetch(`${base}/share-page?path=${encodeURIComponent(pathname)}`, { headers: { 'User-Agent': 'facebookexternalhit/1.1' } });
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.match(html, /property="og:image" content="https:\/\/cdn.example.test\/adapter.webp"/);
      assert.doesNotMatch(html, /generic.png|social-preview.png/);
    }
    for (const pathname of ['/', '/share-adapters', '/search']) {
      const response = await fetch(`${base}/share-page?path=${encodeURIComponent(pathname)}`);
      assert.match(await response.text(), /property="og:image" content="https:\/\/cdn.example.test\/generic.png"/);
    }
    await Product.updateOne({ _id: product._id }, { $set: { images: [] } });
    const noImage = await fetch(`${base}/share-page?path=/products/${product._id}`);
    assert.doesNotMatch(await noImage.text(), /og:image|twitter:image|generic.png|social-preview.png/);
  } finally {
    await new Promise(resolve => server.close(resolve)); await mongoose.disconnect();
  }
});
