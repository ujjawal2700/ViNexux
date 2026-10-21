import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import supertest from '../../node_modules/supertest/index.js';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import { config } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { Session } from '../src/models/Session.js';
import { AccessRole } from '../src/models/AccessRole.js';
import { Brand } from '../src/models/Brand.js';
import { Category } from '../src/models/Category.js';
import { Enquiry } from '../src/models/Enquiry.js';
import { getStorageProvider } from '../src/integrations/storage/index.js';
import { ADMIN_SECTIONS } from '../../shared/adminAccess.js';
import { presetConfig } from '../../shared/seasonalThemes.js';
import { discoverApiRoutes, materializeApiPath } from '../../tests/helpers/apiRouteInventory.js';

const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect width="24" height="24" fill="red"/></svg>');

test('admin CRUD matrix uses only disposable data and exercises real HTTP/database persistence', async t => {
  assert.match(process.env.TEST_DATABASE_NAME || '', /^vinexus_full_test_/);
  await mongoose.connect(config.mongodbUri);
  try {
    await Promise.all(Object.values(mongoose.models).map(model => model.init()));
    const client = supertest(app);
    const login = async fields => {
      const user = await User.create({ fullName: 'CRUD Test Admin', role: 'admin', accountStatus: 'active', status: 'active', ...fields });
      const session = await Session.create({ userId: user._id, userType: 'admin', sessionId: randomUUID(), expiresAt: new Date(Date.now() + 600000) });
      return generateToken(user, session);
    };
    const owner = await login({ email: 'crud-owner@example.test' });
    const permissions = Object.fromEntries(ADMIN_SECTIONS.map(({ key }) => [key, { read: true, write: false }]));
    const role = await AccessRole.create({ name: 'CRUD Read-only', permissions });
    const reader = await login({ email: 'crud-reader@example.test', isEmployee: true, accessRoleId: role._id });
    const request = (method, path, token = owner) => client[method](path.startsWith('/api/') ? path : `/api${path}`).set('Authorization', `Bearer ${token}`);
    const ok = (response, status = 200) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body.data; };
    const editor = async section => {
      const access = await AccessRole.create({ name: `CRUD ${section}`, permissions: { [section]: { read: true, write: true } } });
      return login({ email: `crud-${section}@example.test`, isEmployee: true, accessRoleId: access._id });
    };

    await t.test('every mounted admin mutation rejects read-only employees before changing records', async () => {
      const enquiryIds = ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'];
      for (const [index, userType] of ['customer', 'dealer'].entries()) await Enquiry.create({
        _id: enquiryIds[index], enquiryNumber: `CRUD-${userType}`, userId: new mongoose.Types.ObjectId(), userType,
        contactName: 'CRUD Contact', contactEmail: 'crud-contact@example.test', contactPhone: '9876543210', whatsappNumber: '9876543210',
        items: [{ productId: new mongoose.Types.ObjectId(), productName: 'CRUD Fixture', quantity: 1, priceShown: 100 }],
      });
      const mutations = discoverApiRoutes().filter(route => route.path.startsWith('/api/admin/') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(route.method));
      assert.ok(mutations.some(route => route.source === 'theme.routes.js'));
      assert.ok(mutations.some(route => route.source === 'bannerGrid.routes.js'));
      for (const route of mutations) {
        for (const id of route.source === 'adminEnquiry.routes.js' ? enquiryIds : [enquiryIds[0]]) {
          const path = materializeApiPath(route.path).replace(enquiryIds[0], id);
          const response = await request(route.method.toLowerCase(), path, reader).send({});
          assert.equal(response.status, 403, `${route.method} ${route.path}: ${JSON.stringify(response.body)}`);
        }
      }
      console.log(`CRUD permission coverage: ${mutations.length} admin mutation endpoints rejected read-only access`);
    });

    await t.test('header/main/subcategory create, image upload, read, update and delete with category-only access', async () => {
      const token = await editor('categories'); let parentId = null; const ids = [];
      assert.equal((await request('post', '/admin/upload/file', token).attach('file', svg, 'blocked.svg')).status, 403);
      const asset = ok(await request('post', '/admin/categories/image', token).attach('file', svg, 'category.svg'));
      assert.equal(getStorageProvider().getUploadedFile(asset.publicId).mimetype, 'image/webp');
      for (const level of ['Header', 'Main', 'Sub']) {
        const category = ok(await request('post', '/admin/categories', token).send({ name: `CRUD ${level}`, parentId, image: asset.url }), 201);
        ids.push(category._id); parentId = category._id;
        assert.equal(ok(await request('get', `/admin/categories/${category._id}`, token)).name, `CRUD ${level}`);
        assert.equal(ok(await request('put', `/admin/categories/${category._id}`, token).send({ description: `${level} changed` })).description, `${level} changed`);
      }
      for (const id of ids.reverse()) ok(await request('delete', `/admin/categories/${id}`, token));
      assert.equal(await Category.countDocuments({ _id: { $in: ids } }), 0);
    });

    await t.test('brand create/read/update/remove-logo/delete persists changes and removes discarded media', async () => {
      const token = await editor('brands');
      const asset = ok(await request('post', '/admin/brands/logo', token).attach('file', svg, 'brand.svg'));
      const brand = ok(await request('post', '/admin/brands', token).send({ name: 'CRUD Brand', logo: asset }), 201).brand;
      assert.ok(ok(await request('get', '/admin/brands', token)).brands.some(row => row._id === brand._id));
      ok(await request('put', `/admin/brands/${brand._id}`, token).send({ description: 'Edited brand', logo: null }));
      assert.equal((await Brand.findById(brand._id)).description, 'Edited brand');
      assert.equal(getStorageProvider().getUploadedFile(asset.publicId), undefined, 'Removing a logo releases its stored image');
      ok(await request('delete', `/admin/brands/${brand._id}`, token));
      assert.equal(await Brand.exists({ _id: brand._id }), null);
    });

    await t.test('promotional banner draft upload/create/read/update/delete and unused-file cleanup use only promo access', async () => {
      const token = await editor('promotional-banners'); const root = '/admin/cms/promotional-banners';
      const asset = ok(await request('post', `${root}/images`, token).attach('file', svg, 'promo.svg'));
      const created = ok(await request('post', root, token).send({ title: 'CRUD Promotion', image: asset, isActive: false }), 201).promoBanner;
      assert.ok(created?._id, 'Promotional banner ID returned');
      assert.equal(ok(await request('get', `${root}/${created._id}`, token)).promoBanner.title, 'CRUD Promotion');
      ok(await request('put', `${root}/${created._id}`, token).send({ title: 'Changed promotion' }));
      assert.equal((await request('delete', `${root}/images`, token).send({ publicId: asset.publicId })).status, 409, 'Live references cannot be deleted through orphan cleanup');
      ok(await request('delete', `${root}/${created._id}`, token));
      assert.equal((await request('get', `${root}/${created._id}`, token)).status, 404);
      const unused = ok(await request('post', `${root}/images`, token).attach('file', svg, 'unused.svg'));
      ok(await request('delete', `${root}/images`, token).send({ publicId: unused.publicId }));
      assert.equal(getStorageProvider().getUploadedFile(unused.publicId), undefined);
      assert.equal((await request('delete', `${root}/images`, token).send({ publicId: 'vinexus/brands/not-promo' })).status, 400);
      assert.equal((await request('delete', `${root}/images`, token).send({ publicId: 'vinexus/promotional-banners/../../brands/not-promo' })).status, 400);
    });

    await t.test('real seasonal-theme create/read/update/upload/duplicate/publish/activate/archive/reset lifecycle', async () => {
      const token = await editor('themes'); const root = '/admin/cms/themes';
      const data = { name: 'CRUD Theme', preset: 'diwali', draft: presetConfig('diwali'), schedule: { enabled: false, startAt: null, endAt: null, priority: 0 } };
      const created = ok(await request('post', root, token).send(data), 201).theme; const path = `${root}/${created._id}`;
      assert.equal(ok(await request('get', path, token)).theme.name, data.name);
      const image = ok(await request('post', `${path}/assets/header`, token).attach('file', svg, 'theme.svg')).asset;
      data.draft.assets.header = image;
      ok(await request('put', path, token).send({ ...data, name: 'Changed theme', revision: 0 }));
      assert.equal((await request('put', path, token).send({ ...data, revision: 0 })).status, 409);
      const published = ok(await request('post', `${path}/publish`, token).send({ revision: 1 })).theme;
      ok(await request('post', `${path}/activate`, token).send({ revision: published.revision }));
      assert.equal(ok(await client.get('/api/content/theme')).theme.id, created._id);
      const duplicate = ok(await request('post', `${path}/duplicate`, token).send({ revision: published.revision }), 201).theme;
      assert.equal(duplicate.published, undefined); assert.equal(duplicate.schedule.enabled, false);
      ok(await request('post', `${path}/archive`, token).send({ revision: published.revision }));
      assert.equal(ok(await client.get('/api/content/theme')).theme.id, null);
      ok(await request('post', `${root}/reset`, token).send({ resumeSchedules: false }));
      ok(await request('post', `${root}/reset`, token).send({ resumeSchedules: true }));
    });

    await t.test('real homepage banner grid uploads, replaces, edits, rejects stale writes and removes placements', async () => {
      const token = await editor('banners'); const root = '/admin/cms/banner-grid';
      const start = ok(await request('get', root, token)).grid;
      const added = ok(await request('post', `${root}/0/images`, token).field('revision', start.revision).attach('file', svg, 'banner.svg')).grid;
      const id = added.sections[0].images[0]._id;
      ok(await request('put', `${root}/0/images/${id}`, token).send({ revision: added.revision, title: 'Changed image', link: '/products', fit: 'contain' }));
      assert.equal((await request('put', `${root}/0/images/${id}`, token).send({ revision: added.revision, title: 'Stale' })).status, 409);
      const replaced = ok(await request('post', `${root}/0/images/${id}`, token).field('revision', added.revision + 1).attach('file', svg, 'replacement.svg')).grid;
      assert.equal(replaced.sections[0].images.length, 1);
      const removed = ok(await request('delete', `${root}/0/images/${id}`, token).send({ revision: replaced.revision })).grid;
      assert.equal(removed.sections[0].images.length, 0);
      ok(await request('put', `${root}/0`, token).send({ revision: removed.revision, transition: 'fade' }));
    });

    await t.test('trust badges support complete persisted CRUD', async () => {
      const token = await editor('trust-badges'); const root = '/admin/cms/trust-badges';
      const badge = ok(await request('post', root, token).send({ title: 'CRUD Badge', description: 'Original' }), 201).trustBadge;
      assert.equal(ok(await request('get', `${root}/${badge._id}`, token)).trustBadge.title, 'CRUD Badge');
      const changed = ok(await request('put', `${root}/${badge._id}`, token).send({ description: 'Changed', isActive: false })).trustBadge;
      assert.equal(changed.description, 'Changed'); assert.equal(changed.isActive, false);
      ok(await request('delete', `${root}/${badge._id}`, token));
      assert.equal((await request('get', `${root}/${badge._id}`, token)).status, 404);
    });

    await t.test('admin can update their own profile and change password only with the correct current password', async () => {
      const admin = await User.findOne({ email: 'crud-owner@example.test' });
      admin.passwordHash = await bcrypt.hash('Crud-password-2026', 10); await admin.save();
      const fields = { fullName: 'Changed CRUD Admin', email: 'crud-updated@example.test', phone: '9876543210' };
      const updated = ok(await request('put', '/auth/profile').send(fields));
      assert.equal(updated.user.fullName, fields.fullName); assert.equal(updated.user.role, 'admin');
      assert.equal(updated.user.passwordHash, undefined);
      assert.equal((await request('put', '/auth/profile').send({ currentPassword: 'Wrong-password', newPassword: 'Changed-password-2026' })).status, 400);
      ok(await request('put', '/auth/profile').send({ currentPassword: 'Crud-password-2026', newPassword: 'Changed-password-2026' }));
      assert.equal(await bcrypt.compare('Changed-password-2026', (await User.findById(admin._id).select('+passwordHash')).passwordHash), true);
    });
  } finally { await mongoose.disconnect(); }
});

import { generateAccessToken } from '../src/utils/token.util.js';
function generateToken(user, session) { return generateAccessToken({ userId: user._id, role: 'admin', sessionId: session.sessionId }); }
