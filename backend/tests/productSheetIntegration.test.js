import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { config } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { Session } from '../src/models/Session.js';
import { Product } from '../src/models/Product.js';
import { Brand } from '../src/models/Brand.js';
import { Category } from '../src/models/Category.js';
import { ProductSheetConnection, ProductSheetRecord } from '../src/models/ProductSheetConnection.js';
import { generateAccessToken } from '../src/utils/token.util.js';
import { productSheetService } from '../src/services/googleSheets/productSheet.service.js';
import { COLUMNS, HEADERS } from '../src/services/googleSheets/productSheetRows.js';

// Exercise real HTTP, MongoDB, validation, price history and locks; replace only Google's network transport.
test('drafts and Google product sheets round-trip through real HTTP/database writes', async () => {
  assert.equal(process.env.NODE_ENV, 'test');
  assert.match(process.env.TEST_DATABASE_NAME || '', /^vinexus_full_test_/);
  await mongoose.connect(config.mongodbUri);
  await Promise.all([Product.init(), ProductSheetConnection.init(), ProductSheetRecord.init()]);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const original = { email: config.googleServiceAccountEmail, key: config.googleServiceAccountPrivateKey, client: productSheetService.getClient };
  const tabs = new Map([['User Notes', { sheetId: 1, rows: [['Existing content']], rowCount: 1000 }]]);
  let nextTabId = 2, failWrite = false;
  const productTab = () => tabs.get('ViNexus Products');
  const setCell = (row, field, value) => { row[COLUMNS.findIndex(([, key]) => key === field)] = value; };
  productSheetService.getClient = async () => ({ spreadsheets: {
    get: async () => ({ data: { sheets: [...tabs].map(([title, tab]) => ({ properties: { title, sheetId: tab.sheetId, gridProperties: { rowCount: tab.rowCount } } })) } }),
    batchUpdate: async ({ requestBody }) => ({ data: { replies: requestBody.requests.map(request => {
      if (request.addSheet) {
        const { title, gridProperties } = request.addSheet.properties;
        const sheetId = nextTabId++; tabs.set(title, { sheetId, rows: [], rowCount: gridProperties.rowCount });
        return { addSheet: { properties: { title, sheetId } } };
      }
      if (request.appendDimension) { const tab = [...tabs.values()].find(tab => tab.sheetId === request.appendDimension.sheetId); tab.rowCount += request.appendDimension.length; }
      return {};
    }) } }),
    values: {
      get: async ({ range }) => { const title = range.match(/^'([^']+)'!/)[1]; return { data: { values: structuredClone(tabs.get(title).rows) } }; },
      batchUpdate: async ({ requestBody }) => {
        if (failWrite) { failWrite = false; throw new Error('Simulated Google outage'); }
        assert.equal(requestBody.valueInputOption, 'RAW');
        for (const { range, values } of requestBody.data) {
          const [, title, column, start] = range.match(/^'([^']+)'!([A-Z]+)(\d+)/);
          const rows = tabs.get(title).rows;
          values.forEach((cells, index) => {
            const rowIndex = Number(start) - 1 + index;
            rows[rowIndex] ||= [];
            const offset = column === 'AA' ? 26 : 0;
            cells.forEach((value, cellIndex) => { rows[rowIndex][offset + cellIndex] = value; });
          });
        }
        return { data: {} };
      },
    },
  } });
  config.googleServiceAccountEmail = 'isolated-test@example.test'; config.googleServiceAccountPrivateKey = 'simulated-not-a-real-key';
  try {
    const admin = await User.create({ fullName: 'Sheet test admin', email: 'sheets@example.test', phone: '9876543210', role: 'admin', accountStatus: 'active' });
    const session = await Session.create({ userId: admin._id, userType: 'admin', sessionId: randomUUID(), expiresAt: new Date(Date.now() + 600000) });
    const token = generateAccessToken({ userId: admin._id, sessionId: session.sessionId, role: 'admin' });
    const call = async (path, method = 'GET', body, authenticated = true) => {
      const response = await fetch(`${base}${path}`, { method, headers: { ...(authenticated ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
      return { status: response.status, body: await response.json() };
    };
    const draft = await call('/admin/products', 'POST', { isActive: false });
    assert.equal(draft.status, 201, JSON.stringify(draft.body));
    assert.equal(draft.body.data.isActive, false);
    assert.equal((await call(`/admin/products/${draft.body.data._id}`, 'PUT', { isActive: true })).status, 400);
    const draftEdit = await call(`/admin/products/${draft.body.data._id}`, 'PUT', { isActive: false, specifications: [{ key: 'Resolution', value: '' }], standardPrice: 50 });
    assert.equal(draftEdit.status, 200, JSON.stringify(draftEdit.body));
    const brand = await Brand.create({ name: 'Sheet Brand', slug: 'sheet-brand' });
    const category = await Category.create({ name: 'Cameras', slug: 'sheet-cameras' });
    const published = await call('/admin/products', 'POST', { sku: 'SHEET-1', name: 'Sheet camera', modelNumber: 'SHEET-1', brandId: String(brand._id), categoryId: String(category._id), categoryIds: [String(category._id)], standardPrice: 100, dealerPrice: 80, stockQuantity: 5, isActive: true, images: [{ url: 'https://example.test/camera.webp' }] });
    assert.equal(published.status, 201, JSON.stringify(published.body));
    const id = published.body.data._id;
    const initialized = await call('/admin/products/google-sheet/initialize', 'POST', { spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/isolated-spreadsheet-test-12345/edit' });
    assert.equal(initialized.status, 200, JSON.stringify(initialized.body));
    assert.equal(initialized.body.data.lastResult.exported, 2);
    assert.deepEqual(tabs.get('User Notes').rows, [['Existing content']]);
    const row = productTab().rows.find(row => row[0] === id);
    setCell(row, 'standardPrice', 150); setCell(row, 'isNewArrival', 'Yes');
    let synced = await call('/admin/products/google-sheet/sync', 'POST', {});
    assert.equal(synced.status, 200, JSON.stringify(synced.body));
    assert.equal(synced.body.data.result.failed, 0, JSON.stringify(synced.body.data.result));
    let saved = await Product.findById(id).select('+priceHistory').lean();
    assert.equal(saved.standardPrice, 150); assert.equal(saved.isNewArrival, true);
    assert.equal(saved.priceHistory.length, 1); assert.equal(String(saved.priceHistory[0].changedBy), String(admin._id));
    const arrivals = await call('/products?isNewArrival=true', 'GET', null, false);
    assert.equal(arrivals.body.data.pagination.total, 1); assert.equal(arrivals.body.data.products[0]._id, id);
    const newRow = [...productTab().rows.find(row => row[0] === id)];
    setCell(newRow, 'id', ''); setCell(newRow, 'sku', 'SHEET-2'); setCell(newRow, 'modelNumber', 'SHEET-2'); setCell(newRow, 'name', 'New sheet camera');
    productTab().rows.push(newRow);
    synced = await call('/admin/products/google-sheet/sync', 'POST', {});
    assert.equal(synced.status, 200, JSON.stringify(synced.body));
    assert.equal(synced.body.data.result.created, 1, JSON.stringify(synced.body.data.result));
    assert.ok(productTab().rows.find(row => row[1] === 'SHEET-2')[0]);
    synced = await call('/admin/products/google-sheet/sync', 'POST', {});
    assert.equal(synced.body.data.result.created, 0); assert.equal(await Product.countDocuments(), 3);
    assert.equal((await Product.findById(id).select('+priceHistory')).priceHistory.length, 1);

    assert.equal((await call(`/admin/products/${id}`, 'PUT', { description: 'Catalogue description' })).status, 200);
    setCell(productTab().rows.find(row => row[0] === id), 'standardPrice', 175);
    synced = await call('/admin/products/google-sheet/sync', 'POST', {});
    assert.equal(synced.body.data.result.failed, 0, JSON.stringify(synced.body.data.result));
    saved = await Product.findById(id).lean(); assert.equal(saved.description, 'Catalogue description'); assert.equal(saved.standardPrice, 175);
    assert.equal((await call(`/admin/products/${id}`, 'PUT', { stockQuantity: 20 })).status, 200);
    setCell(productTab().rows.find(row => row[0] === id), 'stockQuantity', 50);
    synced = await call('/admin/products/google-sheet/sync', 'POST', {});
    assert.equal(synced.body.data.result.failed, 1); assert.match(synced.body.data.result.errors[0].message, /Stock Quantity/);
    assert.equal((await Product.findById(id)).stockQuantity, 20);
    setCell(productTab().rows.find(row => row[0] === id), 'stockQuantity', 20);
    await call('/admin/products/google-sheet/sync', 'POST', {});

    setCell(productTab().rows.find(row => row[0] === id), 'standardPrice', 200); failWrite = true;
    assert.equal((await call('/admin/products/google-sheet/sync', 'POST', {})).status, 502);
    assert.equal((await Product.findById(id)).standardPrice, 200);
    synced = await call('/admin/products/google-sheet/sync', 'POST', {});
    assert.equal(synced.body.data.result.failed, 0);
    assert.equal((await Product.findById(id).select('+priceHistory')).priceHistory.length, 3);
    await ProductSheetConnection.updateOne({ singletonKey: 'products' }, { $set: { lockToken: 'other-worker', lockUntil: new Date(Date.now() + 60000) } });
    assert.equal((await call('/admin/products/google-sheet/sync', 'POST', {})).status, 409);
    await ProductSheetConnection.updateOne({ singletonKey: 'products' }, { $unset: { lockToken: 1, lockUntil: 1 } });
    assert.equal((await call('/products', 'GET', null, false)).body.data.pagination.total, 2, 'Draft remains hidden');
  } finally {
    productSheetService.getClient = original.client; config.googleServiceAccountEmail = original.email; config.googleServiceAccountPrivateKey = original.key;
    await new Promise(resolve => server.close(resolve)); await mongoose.disconnect();
  }
});
