import test, { before, after, describe } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import mongoose from 'mongoose';

import app from '../src/app.js';
import { config } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { Category } from '../src/models/Category.js';
import { Product } from '../src/models/Product.js';
import { Cart } from '../src/models/Cart.js';
import { Enquiry } from '../src/models/Enquiry.js';
import { GoogleSheetsProvider } from '../src/integrations/googleSheets/GoogleSheetsProvider.js';
import { DevGoogleSheetsProvider } from '../src/integrations/googleSheets/DevGoogleSheetsProvider.js';
import { GoogleSheetsApiProvider } from '../src/integrations/googleSheets/GoogleSheetsApiProvider.js';
import { setGoogleSheetsProvider, createGoogleSheetsProvider } from '../src/integrations/googleSheets/index.js';
import { googleSheetsService } from '../src/services/googleSheets/googleSheets.service.js';
import { authService } from '../src/services/auth.service.js';

let server;
const PORT = 5093;

const request = (endpointPath, options = {}, body = null) => {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: '127.0.0.1',
      port: PORT,
      path: endpointPath,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, body: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

describe('Phase 8.3 — Google Sheets Integration Test Suite', () => {
  let customerUser;
  let customerToken;
  let adminUser;
  let adminToken;
  let category;
  let product;
  let devProvider;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongodbUri);
    }

    server = app.listen(PORT, '127.0.0.1');
    await new Promise((r) => setTimeout(r, 500));

    // Enable Google Sheets for testing
    config.googleSheetsEnabled = true;

    // Set up DevGoogleSheetsProvider
    devProvider = new DevGoogleSheetsProvider();
    setGoogleSheetsProvider(devProvider);

    const ts = Date.now();
    const customerEmail = `gs_customer_${ts}@example.com`;
    const adminEmail = `gs_admin_${ts}@example.com`;

    customerUser = await User.create({
      fullName: 'GoogleSheets Test Customer',
      name: 'GoogleSheets Test Customer',
      email: customerEmail,
      phone: `91${ts.toString().slice(-8)}`,
      role: 'customer',
      isEmailVerified: true,
      accountStatus: 'active',
      status: 'active',
    });

    await authService.sendOtp({ identifier: customerEmail, purpose: 'login' });
    const custRes = await authService.verifyOtp({ identifier: customerEmail, otp: '123456', purpose: 'login' });
    customerToken = custRes.accessToken;

    adminUser = await User.create({
      fullName: 'GoogleSheets Test Admin',
      name: 'GoogleSheets Test Admin',
      email: adminEmail,
      phone: `92${ts.toString().slice(-8)}`,
      role: 'admin',
      isEmailVerified: true,
      accountStatus: 'active',
      status: 'active',
    });

    await authService.sendOtp({ identifier: adminEmail, purpose: 'login' });
    const adminRes = await authService.verifyOtp({ identifier: adminEmail, otp: '123456', purpose: 'login' });
    adminToken = adminRes.accessToken;

    category = await Category.create({
      name: `GS Cat ${ts}`,
      slug: `gs-cat-${ts}`,
      description: 'Test category for Google Sheets',
      isActive: true,
    });

    product = await Product.create({
      sku: `GS-SKU-${ts}`,
      name: `GS Product ${ts}`,
      slug: `gs-product-${ts}`,
      categoryId: category._id,
      category: category._id,
      description: 'Test product for Google Sheets',
      price: 250,
      standardPrice: 250,
      stockQuantity: 100,
      status: 'published',
      isActive: true,
    });
  });

  after(async () => {
    if (customerUser) await User.deleteOne({ _id: customerUser._id });
    if (adminUser) await User.deleteOne({ _id: adminUser._id });
    if (category) await Category.deleteOne({ _id: category._id });
    if (product) await Product.deleteOne({ _id: product._id });
    await Enquiry.deleteMany({ contactName: /GoogleSheets|GS/ });
    if (customerUser) await Cart.deleteMany({ user: customerUser._id });

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  describe('Section 1: Provider Abstraction & Factory Tests', () => {
    test('Abstract GoogleSheetsProvider throws on appendRow', async () => {
      const abstractProvider = new GoogleSheetsProvider();
      await assert.rejects(
        async () => abstractProvider.appendRow({}),
        /must be implemented/
      );
    });

    test('DevGoogleSheetsProvider correctly logs and returns row output', async () => {
      const provider = new DevGoogleSheetsProvider();
      const dummyEnquiry = {
        enquiryNumber: 'ENQ-999',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        contactName: 'Jane Doe',
        companyName: 'Acme Corp',
        contactEmail: 'jane@acme.com',
        contactPhone: '1234567890',
        userType: 'customer',
        items: [
          { productName: 'Item A', quantity: 2, priceShown: 100 },
          { productName: 'Item B', quantity: 1, priceShown: 200 },
        ],
        notes: 'Test note',
        status: 'new',
        _id: new mongoose.Types.ObjectId(),
      };

      const row = googleSheetsService.formatEnquiryRow(dummyEnquiry);
      assert.strictEqual(row.length, 13);
      assert.strictEqual(row[0], 'ENQ-999');
      assert.strictEqual(row[2], 'customer');
      assert.strictEqual(row[3], 'Jane Doe');
      assert.strictEqual(row[4], 'jane@acme.com');
      assert.strictEqual(row[7], 3);
      assert.strictEqual(row[6], 'Item A (Qty: 2); Item B (Qty: 1)');

      const result = await provider.appendRow({ rowValues: row });
      assert.strictEqual(result.success, true);
    });

    test('GoogleSheetsApiProvider instantiation & credential check', () => {
      const apiProvider = new GoogleSheetsApiProvider({
        spreadsheetId: 'test-id',
        tabName: 'Sheet1',
        serviceAccountEmail: 'test@example.iam.gserviceaccount.com',
        privateKey: '-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----',
      });
      assert.ok(apiProvider instanceof GoogleSheetsProvider);

      const defaultConfigProvider = new GoogleSheetsApiProvider();
      assert.ok(defaultConfigProvider instanceof GoogleSheetsProvider);
    });

    test('createGoogleSheetsProvider factory creates requested provider type', () => {
      const dev = createGoogleSheetsProvider('dev');
      assert.ok(dev instanceof DevGoogleSheetsProvider);

      const api = createGoogleSheetsProvider('google_api');
      assert.ok(api instanceof GoogleSheetsApiProvider);
    });
  });

  describe('Section 2: Google Sheets Service Unit Tests', () => {
    test('googleSheetsService.formatEnquiryRow formats 13-column array properly', () => {
      const enquiryObj = {
        enquiryNumber: 'ENQ-123456',
        createdAt: new Date('2026-09-05T12:00:00Z'),
        userType: 'customer',
        contactName: 'Test Contact',
        contactEmail: 'test@contact.com',
        contactPhone: '9876543210',
        items: [
          { productName: 'Custom Product Name', quantity: 5, priceShown: 50 },
        ],
        message: 'Urgent enquiry',
        status: 'new',
        assignedTo: null,
      };

      const row = googleSheetsService.formatEnquiryRow(enquiryObj);
      assert.strictEqual(row.length, 13);
      assert.strictEqual(row[0], 'ENQ-123456');
      assert.strictEqual(row[2], 'customer');
      assert.strictEqual(row[3], 'Test Contact');
      assert.strictEqual(row[4], 'test@contact.com');
      assert.strictEqual(row[5], '9876543210');
      assert.strictEqual(row[6], 'Custom Product Name (Qty: 5)');
      assert.strictEqual(row[7], 5);
      assert.strictEqual(row[8], 'Urgent enquiry');
      assert.strictEqual(row[10], 'new');
      assert.strictEqual(row[11], 'Unassigned');
    });

    test('googleSheetsService.syncEnquiryToSheet returns success: false if provider fails without throwing', async () => {
      const failingProvider = {
        appendRow: async () => {
          throw new Error('Simulated API Connection Timeout');
        },
      };
      setGoogleSheetsProvider(failingProvider);

      const dummyEnquiryDoc = await Enquiry.create({
        enquiryNumber: `ENQ-FAIL-${Date.now()}`,
        userId: customerUser._id,
        userType: 'customer',
        contactName: 'Fail Test User',
        companyName: 'Fail Co',
        contactEmail: customerUser.email,
        contactPhone: customerUser.phone,
        items: [{ productId: product._id, productName: product.name, priceShown: 250, quantity: 1 }],
        totalAmount: 250,
        status: 'new',
        syncedToGoogleSheet: false,
      });

      const syncResult = await googleSheetsService.syncEnquiryToSheet(dummyEnquiryDoc);
      assert.strictEqual(syncResult.success, false);

      // Verify MongoDB document state was not corrupted
      const dbDoc = await Enquiry.findById(dummyEnquiryDoc._id);
      assert.strictEqual(dbDoc.syncedToGoogleSheet, false);

      // Reset provider to devProvider
      setGoogleSheetsProvider(devProvider);
      await Enquiry.deleteOne({ _id: dummyEnquiryDoc._id });
    });
  });

  describe('Section 3: Cart to Enquiry Google Sheets Sync Integration', () => {
    test('createEnquiryFromCart automatically syncs enquiry to Google Sheet', async () => {
      // 1. Add item to cart
      await request(
        '/api/cart/items',
        { method: 'POST', headers: { Authorization: `Bearer ${customerToken}` } },
        { productId: product._id.toString(), quantity: 3 }
      );

      // 2. Create enquiry from cart
      const res = await request(
        '/api/enquiries',
        { method: 'POST', headers: { Authorization: `Bearer ${customerToken}` } },
        {
          message: 'Auto sync test for Google Sheets',
        }
      );

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);

      const enquiryData = res.body.data.enquiry || res.body.data;
      const createdEnquiryId = enquiryData._id;
      const dbEnquiry = await Enquiry.findById(createdEnquiryId);
      assert.ok(dbEnquiry);
      assert.strictEqual(dbEnquiry.syncedToGoogleSheet, true);
    });

    test('Enquiry creation succeeds even if Google Sheets provider sync fails', async () => {
      // Set provider to failing provider
      const failingProvider = {
        appendRow: async () => {
          throw new Error('Google Sheets quota exceeded');
        },
      };
      setGoogleSheetsProvider(failingProvider);

      // Add item to cart
      await request(
        '/api/cart/items',
        { method: 'POST', headers: { Authorization: `Bearer ${customerToken}` } },
        { productId: product._id.toString(), quantity: 1 }
      );

      // Create enquiry from cart
      const res = await request(
        '/api/enquiries',
        { method: 'POST', headers: { Authorization: `Bearer ${customerToken}` } },
        {
          message: 'Fail safe enquiry test',
        }
      );

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      const enquiryData = res.body.data.enquiry || res.body.data;
      assert.ok(enquiryData._id);

      const dbEnquiry = await Enquiry.findById(enquiryData._id);
      assert.strictEqual(dbEnquiry.syncedToGoogleSheet, false);

      // Restore devProvider
      setGoogleSheetsProvider(devProvider);
    });
  });

  describe('Section 4: Admin Manual Sync API Tests (POST /api/admin/enquiries/:id/sync-google-sheet)', () => {
    let unSyncedEnquiry;

    before(async () => {
      unSyncedEnquiry = await Enquiry.create({
        enquiryNumber: `ENQ-UNSYNCED-${Date.now()}`,
        userId: customerUser._id,
        userType: 'customer',
        contactName: 'Unsynced User',
        companyName: 'Unsynced Ltd',
        contactEmail: customerUser.email,
        contactPhone: customerUser.phone,
        items: [{ productId: product._id, productName: product.name, priceShown: 250, quantity: 2 }],
        totalAmount: 500,
        status: 'new',
        syncedToGoogleSheet: false,
      });
    });

    after(async () => {
      if (unSyncedEnquiry) await Enquiry.deleteOne({ _id: unSyncedEnquiry._id });
    });

    test('POST /api/admin/enquiries/:id/sync-google-sheet — 401 without auth token', async () => {
      const res = await request(`/api/admin/enquiries/${unSyncedEnquiry._id}/sync-google-sheet`, {
        method: 'POST',
      });
      assert.strictEqual(res.status, 401);
    });

    test('POST /api/admin/enquiries/:id/sync-google-sheet — 403 with customer token', async () => {
      const res = await request(`/api/admin/enquiries/${unSyncedEnquiry._id}/sync-google-sheet`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      assert.strictEqual(res.status, 403);
    });

    test('POST /api/admin/enquiries/:id/sync-google-sheet — 400 for invalid mongo ID', async () => {
      const res = await request('/api/admin/enquiries/invalid-id/sync-google-sheet', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 400);
    });

    test('POST /api/admin/enquiries/:id/sync-google-sheet — 404 for non-existent enquiry ID', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(`/api/admin/enquiries/${fakeId}/sync-google-sheet`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 404);
    });

    test('POST /api/admin/enquiries/:id/sync-google-sheet — 200 admin manually syncs enquiry to sheet', async () => {
      const res = await request(`/api/admin/enquiries/${unSyncedEnquiry._id}/sync-google-sheet`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.syncedToGoogleSheet, true);

      // Verify DB update
      const dbDoc = await Enquiry.findById(unSyncedEnquiry._id);
      assert.strictEqual(dbDoc.syncedToGoogleSheet, true);
    });
  });
});
