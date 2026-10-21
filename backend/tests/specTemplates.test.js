import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { config } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { Session } from '../src/models/Session.js';
import { AccessRole } from '../src/models/AccessRole.js';
import { Product } from '../src/models/Product.js';
import { Category } from '../src/models/Category.js';
import { SpecificationTemplate } from '../src/models/SpecificationTemplate.js';
import { generateAccessToken } from '../src/utils/token.util.js';
import { applySpecificationTemplate } from '../../shared/specificationTemplates.js';

test('persistent specification templates, permissions, snapshots and product sharing basics', async () => {
  assert.match(process.env.TEST_DATABASE_NAME || '', /^vinexus_full_test_/);
  await mongoose.connect(config.mongodbUri);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    await SpecificationTemplate.init();
    const role = await AccessRole.create({ name: 'Product reader', permissions: { products: { read: true, write: false } } });
    const tokenFor = async fields => {
      const user = await User.create({ fullName: 'Template User', accountStatus: 'active', status: 'active', ...fields });
      const session = await Session.create({ userId: user._id, userType: user.role, sessionId: randomUUID(), expiresAt: new Date(Date.now() + 600000) });
      return generateAccessToken({ userId: user._id, role: user.role, sessionId: session.sessionId });
    };
    const admin = await tokenFor({ role: 'admin', email: 'spec-admin@example.test' });
    const customer = await tokenFor({ role: 'customer', email: 'spec-customer@example.test' });
    const reader = await tokenFor({ role: 'admin', email: 'spec-reader@example.test', isEmployee: true, accessRoleId: role._id });
    const base = `http://127.0.0.1:${server.address().port}${config.apiBaseUrl}`;
    const endpoint = '/admin/products/specification-templates';
    const call = async (path, method = 'GET', payload, token = admin) => {
      const response = await fetch(base + path, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' }, ...(payload ? { body: JSON.stringify(payload) } : {}) });
      return { status: response.status, body: await response.json() };
    };
    const preset = { name: 'PoE Cameras', description: 'Bullet and dome cameras (PoE)', specifications: [{ key: 'Resolution', value: '4 MP' }, { key: 'Power', value: 'PoE' }, { key: 'Connectivity', value: 'Ethernet' }, { key: 'Connectivity', value: 'WiFi' }] };
    assert.equal((await call(endpoint, 'GET', null, '')).status, 401);
    assert.equal((await call(endpoint, 'GET', null, customer)).status, 403);
    assert.equal((await call(endpoint, 'POST', preset, reader)).status, 403);
    const created = await call(endpoint, 'POST', preset);
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const template = created.body.data.template;
    assert.equal(template.revision, 0); assert.deepEqual(template.specifications.map(row => row.key), preset.specifications.map(row => row.key));
    assert.equal((await call(endpoint, 'GET', null, reader)).body.data.templates.length, 1);
    assert.equal((await call(endpoint, 'POST', { ...preset, name: ' poe   CAMERAS ' })).status, 409);
    const other = await call(endpoint, 'POST', { name: 'Adapters', specifications: [{ key: 'Voltage', value: '12V' }, { key: 'Current', value: '2A' }] });
    assert.equal(other.status, 201);
    for (const search of ['poe cameras', 'bullet', '(PoE)']) {
      const result = await call(`${endpoint}?search=${encodeURIComponent(search)}`);
      assert.equal(result.status, 200); assert.deepEqual(result.body.data.templates.map(row => row._id), [template._id]);
    }
    const firstPage = (await call(endpoint + '?limit=1')).body.data;
    const secondPage = (await call(endpoint + '?limit=1&page=2')).body.data;
    assert.equal(firstPage.pagination.total, 2); assert.notEqual(firstPage.templates[0]._id, secondPage.templates[0]._id);
    for (const specifications of [[], [{ key: 'Stock', value: '4' }], [{ key: '', value: '4' }], [{ key: 'Resolution', value: '' }], [{ key: 'Power', value: 'PoE' }, { key: ' power ', value: 'poe' }]]) {
      const bad = await call(endpoint, 'POST', { name: 'Invalid', specifications });
      assert.equal(bad.status, 400, JSON.stringify(bad.body)); assert.ok(bad.body.details[0].path.startsWith('specifications'));
    }
    const category = await Category.create({ name: 'Cameras', slug: 'template-cameras' });
    const product = await Product.create({ name: 'Outdoor Camera', sku: 'SPEC-CAMERA', categoryId: category._id, stockQuantity: 20, isActive: true, specifications: [{ key: 'Resolution', value: '8 MP' }], images: [{ url: 'https://cdn.example.test/camera.webp' }] });
    const applied = applySpecificationTemplate(product.specifications, template.specifications);
    const saved = await call(`/admin/products/${product._id}`, 'PUT', { specifications: applied });
    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    assert.equal(saved.body.data.specifications.find(row => row.key === 'Resolution').value, '8 MP');
    const updated = await call(`${endpoint}/${template._id}`, 'PUT', { ...preset, specifications: [{ key: 'Power', value: '12V' }, { key: 'Resolution', value: '4 MP' }], expectedRevision: 0 });
    assert.equal(updated.status, 200, JSON.stringify(updated.body)); assert.equal(updated.body.data.template.revision, 1);
    assert.equal((await call(`${endpoint}/${template._id}`, 'PUT', { ...preset, expectedRevision: 0 })).status, 409);
    assert.equal((await call(`${endpoint}/${template._id}`, 'DELETE', null, reader)).status, 403);
    const photo = await fetch(`${base}/share-page?path=/products/${product._id}`, { headers: { 'User-Agent': 'facebookexternalhit/1.1' } });
    assert.equal(photo.status, 200); const html = await photo.text();
    assert.match(html, /og:image:alt" content="Outdoor Camera"/); assert.match(html, /og:description" content="[^"]*Resolution: 8 MP[^"]*Power: PoE/);
    assert.equal((await call(`${endpoint}/${template._id}`, 'DELETE')).status, 200);
    assert.equal((await call(`${endpoint}/${template._id}`, 'DELETE')).status, 404);
    const unchanged = await Product.findById(product._id).lean();
    assert.deepEqual(unchanged.specifications.map(({ key, value }) => ({ key, value })), applied);
    assert.equal(await SpecificationTemplate.countDocuments(), 1);
  } finally { await new Promise(resolve => server.close(resolve)); await mongoose.disconnect(); }
});
