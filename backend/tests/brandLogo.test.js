import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import sharp from 'sharp';
import app from '../src/app.js';
import { config } from '../src/config/env.js';
import { AccessRole } from '../src/models/AccessRole.js';
import { User } from '../src/models/User.js';
import { Session } from '../src/models/Session.js';
import { Brand } from '../src/models/Brand.js';
import { generateAccessToken } from '../src/utils/token.util.js';
import { getStorageProvider } from '../src/integrations/storage/index.js';

test('brand-only editors can create brands with raster/vector logos without shared upload access', async () => {
  assert.match(process.env.TEST_DATABASE_NAME || '', /^vinexus_full_test_/);
  await mongoose.connect(config.mongodbUri);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    await Brand.init();
    const role = await AccessRole.create({ name: 'Brand editor', permissions: { brands: { read: true, write: true } } });
    const user = await User.create({ fullName: 'Brand Editor', email: 'brand-editor@example.test', role: 'admin', isEmployee: true, accessRoleId: role._id, accountStatus: 'active', status: 'active' });
    const session = await Session.create({ userId: user._id, userType: 'admin', sessionId: randomUUID(), expiresAt: new Date(Date.now() + 600000) });
    const token = generateAccessToken({ userId: user._id, role: 'admin', sessionId: session.sessionId });
    const base = `http://127.0.0.1:${server.address().port}${config.apiBaseUrl}`;
    const call = async (path, body, authenticated = true) => {
      const form = body instanceof FormData;
      const response = await fetch(base + path, { method: 'POST', headers: { ...(authenticated ? { Authorization: `Bearer ${token}` } : {}), ...(!form ? { 'Content-Type': 'application/json' } : {}) }, body: form ? body : JSON.stringify(body) });
      return { status: response.status, body: await response.json() };
    };
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect width="24" height="24" fill="red"/></svg>';
    const form = (buffer = svg, type = 'image/svg+xml', name = 'brand.svg') => {
      const data = new FormData(); data.append('file', new Blob([buffer], { type }), name);
      data.append('folder', 'untrusted/folder'); data.append('category', 'kyc');
      return data;
    };
    assert.equal((await call('/admin/upload/file', form())).status, 403, 'Original shared upload is unavailable to brand-only editors');
    assert.equal((await call('/admin/brands', { name: 'Brand without logo' })).status, 201);
    assert.equal((await call('/admin/brands/logo', form(), false)).status, 401);
    const png = await sharp({ create: { width: 8, height: 8, channels: 4, background: '#800020' } }).png().toBuffer();
    for (const [name, image] of [['Vector Brand', form()], ['Raster Brand', form(png, 'image/png', 'brand.png')], ['Untyped Vector', form(svg, 'application/octet-stream')]]) {
      const upload = await call('/admin/brands/logo', image);
      assert.equal(upload.status, 200, JSON.stringify(upload.body));
      const asset = upload.body.data;
      assert.equal(asset.format, 'webp'); assert.match(asset.publicId, /^vinexus\/brands\//);
      const stored = getStorageProvider().getUploadedFile(asset.publicId);
      assert.equal(stored.mimetype, 'image/webp'); assert.equal(stored.category, 'cms');
      const create = await call('/admin/brands', { name, logo: { url: asset.url, publicId: asset.publicId } });
      assert.equal(create.status, 201, JSON.stringify(create.body));
      assert.equal((await Brand.findById(create.body.data.brand._id)).logo.publicId, asset.publicId);
    }
    assert.equal((await call('/admin/brands/logo', form('not an SVG'))).status, 400);
    assert.equal((await call('/admin/brands/logo', form('alert(1)', 'text/javascript', 'logo.js'))).status, 400);
    assert.equal((await call('/admin/brands/logo', new FormData())).status, 400);
    assert.equal((await call('/admin/brands/logo', form(Buffer.alloc(5 * 1024 * 1024 + 1), 'image/png', 'huge.png'))).status, 400);
    await AccessRole.updateOne({ _id: role._id }, { $set: { 'permissions.brands.write': false } });
    assert.equal((await call('/admin/brands/logo', form())).status, 403, 'Read-only brand access cannot upload logos');
    assert.equal((await call('/admin/brands', { name: 'Not permitted' })).status, 403);
    await User.updateOne({ _id: user._id }, { $set: { isEmployee: false } });
    assert.equal((await call('/admin/brands/logo', form())).status, 200, 'Super admins can also upload through the brand endpoint');
  } finally {
    await new Promise(resolve => server.close(resolve));
    await mongoose.disconnect();
  }
});
