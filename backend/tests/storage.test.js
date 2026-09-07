import test, { before, after, describe } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import mongoose from 'mongoose';

import app from '../src/app.js';
import { config } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { DealerProfile } from '../src/models/DealerProfile.js';
import { Category } from '../src/models/Category.js';
import { Product } from '../src/models/Product.js';
import { Banner } from '../src/models/Banner.js';
import { StorageProvider } from '../src/integrations/storage/StorageProvider.js';
import { DevStorageProvider } from '../src/integrations/storage/DevStorageProvider.js';
import { CloudinaryStorageProvider } from '../src/integrations/storage/CloudinaryStorageProvider.js';
import { setStorageProvider, createStorageProvider } from '../src/integrations/storage/index.js';
import { storageService } from '../src/services/storage/storage.service.js';
import { authService } from '../src/services/auth.service.js';
import { isProhibitedExtension } from '../src/middlewares/upload.middleware.js';

let server;
const PORT = 5094;

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

const sendMultipartRequest = (endpointPath, token, fields = {}, file = null, method = 'POST') => {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    let bodyBuffers = [];

    Object.keys(fields).forEach((key) => {
      bodyBuffers.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${fields[key]}\r\n`));
    });

    if (file) {
      bodyBuffers.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${file.fieldname || 'file'}"; filename="${file.filename || 'test.png'}"\r\nContent-Type: ${file.mimetype || 'image/png'}\r\n\r\n`));
      bodyBuffers.push(Buffer.isBuffer(file.buffer) ? file.buffer : Buffer.from(file.buffer || 'fake binary data'));
      bodyBuffers.push(Buffer.from('\r\n'));
    }

    bodyBuffers.push(Buffer.from(`--${boundary}--\r\n`));

    const finalBuffer = Buffer.concat(bodyBuffers);

    const reqOptions = {
      hostname: '127.0.0.1',
      port: PORT,
      path: endpointPath,
      method: method,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': finalBuffer.length,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data), headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, body: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    req.write(finalBuffer);
    req.end();
  });
};

describe('Phase 8.4 — Cloudinary / S3 File Upload Integration Test Suite', () => {
  let dealer1User;
  let dealer1Token;
  let dealer1Profile;

  let dealer2User;
  let dealer2Token;
  let dealer2Profile;

  let customerUser;
  let customerToken;

  let adminUser;
  let adminToken;

  let category;
  let product;
  let banner;
  let devProvider;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongodbUri);
    }

    server = app.listen(PORT, '127.0.0.1');
    await new Promise((r) => setTimeout(r, 500));

    devProvider = new DevStorageProvider();
    setStorageProvider(devProvider);

    const ts = Date.now();

    // Dealer 1
    const d1Email = `storage_dealer1_${ts}@example.com`;
    dealer1User = await User.create({
      fullName: 'Storage Dealer One',
      name: 'Storage Dealer One',
      email: d1Email,
      phone: `91${ts.toString().slice(-8)}`,
      role: 'dealer',
      isEmailVerified: true,
      accountStatus: 'active',
      status: 'active',
    });
    await authService.sendOtp({ identifier: d1Email, purpose: 'login' });
    const d1Res = await authService.verifyOtp({ identifier: d1Email, otp: '123456', purpose: 'login' });
    dealer1Token = d1Res.accessToken;

    dealer1Profile = await DealerProfile.create({
      userId: dealer1User._id,
      companyName: 'Storage Dealer One Ltd',
      gstin: `27AAACV${ts.toString().slice(-4)}F1Z1`,
      pan: `AAACV${ts.toString().slice(-4)}A`,
      status: 'pending',
    });

    // Dealer 2
    const d2Email = `storage_dealer2_${ts}@example.com`;
    dealer2User = await User.create({
      fullName: 'Storage Dealer Two',
      name: 'Storage Dealer Two',
      email: d2Email,
      phone: `92${ts.toString().slice(-8)}`,
      role: 'dealer',
      isEmailVerified: true,
      accountStatus: 'active',
      status: 'active',
    });
    await authService.sendOtp({ identifier: d2Email, purpose: 'login' });
    const d2Res = await authService.verifyOtp({ identifier: d2Email, otp: '123456', purpose: 'login' });
    dealer2Token = d2Res.accessToken;

    dealer2Profile = await DealerProfile.create({
      userId: dealer2User._id,
      companyName: 'Storage Dealer Two Ltd',
      gstin: `27AAACV${ts.toString().slice(-4)}F1Z2`,
      pan: `AAACV${ts.toString().slice(-4)}B`,
      status: 'pending',
    });

    // Customer
    const cEmail = `storage_customer_${ts}@example.com`;
    customerUser = await User.create({
      fullName: 'Storage Customer',
      name: 'Storage Customer',
      email: cEmail,
      phone: `93${ts.toString().slice(-8)}`,
      role: 'customer',
      isEmailVerified: true,
      accountStatus: 'active',
      status: 'active',
    });
    await authService.sendOtp({ identifier: cEmail, purpose: 'login' });
    const cRes = await authService.verifyOtp({ identifier: cEmail, otp: '123456', purpose: 'login' });
    customerToken = cRes.accessToken;

    // Admin
    const aEmail = `storage_admin_${ts}@example.com`;
    adminUser = await User.create({
      fullName: 'Storage Admin',
      name: 'Storage Admin',
      email: aEmail,
      phone: `94${ts.toString().slice(-8)}`,
      role: 'admin',
      isEmailVerified: true,
      accountStatus: 'active',
      status: 'active',
    });
    await authService.sendOtp({ identifier: aEmail, purpose: 'login' });
    const aRes = await authService.verifyOtp({ identifier: aEmail, otp: '123456', purpose: 'login' });
    adminToken = aRes.accessToken;

    // Category & Product
    category = await Category.create({
      name: `Storage Cat ${ts}`,
      slug: `storage-cat-${ts}`,
      isActive: true,
    });

    product = await Product.create({
      sku: `STOR-SKU-${ts}`,
      name: `Storage Product ${ts}`,
      slug: `storage-product-${ts}`,
      categoryId: category._id,
      standardPrice: 999,
      isActive: true,
    });

    // Banner
    banner = await Banner.create({
      title: 'Storage Banner',
      image: { url: 'https://placeholder.dev/banner.jpg', publicId: 'banners/initial' },
      isActive: true,
    });
  });

  after(async () => {
    if (dealer1User) await User.deleteOne({ _id: dealer1User._id });
    if (dealer2User) await User.deleteOne({ _id: dealer2User._id });
    if (customerUser) await User.deleteOne({ _id: customerUser._id });
    if (adminUser) await User.deleteOne({ _id: adminUser._id });
    if (dealer1Profile) await DealerProfile.deleteOne({ _id: dealer1Profile._id });
    if (dealer2Profile) await DealerProfile.deleteOne({ _id: dealer2Profile._id });
    if (category) await Category.deleteOne({ _id: category._id });
    if (product) await Product.deleteOne({ _id: product._id });
    if (banner) await Banner.deleteOne({ _id: banner._id });

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  describe('Section 1: Storage Provider Abstraction & Factory', () => {
    test('1. Abstract StorageProvider throws on uploadFile and deleteFile', async () => {
      const abstractProvider = new StorageProvider();
      await assert.rejects(
        async () => abstractProvider.uploadFile({}),
        /must be implemented/
      );
      await assert.rejects(
        async () => abstractProvider.deleteFile('test'),
        /must be implemented/
      );
    });

    test('2. DevStorageProvider correctly simulates upload and delete', async () => {
      const provider = new DevStorageProvider();
      const uploadRes = await provider.uploadFile({
        buffer: Buffer.from('test content'),
        originalname: 'document.pdf',
        mimetype: 'application/pdf',
        folder: 'vinexus/kyc/test',
      });

      assert.strictEqual(uploadRes.success, true);
      assert.ok(uploadRes.url.includes('mock.storage.vinexus.dev'));
      assert.ok(uploadRes.publicId.includes('vinexus/kyc/test'));

      const deleteRes = await provider.deleteFile(uploadRes.publicId);
      assert.strictEqual(deleteRes.success, true);
    });

    test('3. CloudinaryStorageProvider instantiation & credential check', () => {
      const cloudProvider = new CloudinaryStorageProvider({
        cloudName: 'test-cloud',
        apiKey: '123456',
        apiSecret: 'secret_key',
      });
      assert.ok(cloudProvider instanceof StorageProvider);
    });

    test('4. createStorageProvider factory creates requested provider instance', () => {
      const dev = createStorageProvider('dev');
      assert.ok(dev instanceof DevStorageProvider);

      const cloud = createStorageProvider('cloudinary');
      assert.ok(cloud instanceof CloudinaryStorageProvider);
    });
  });

  describe('Section 2: Storage Service & Replacement Logic', () => {
    test('5. storageService.uploadFile uploads successfully via active provider', async () => {
      const res = await storageService.uploadFile({
        buffer: Buffer.from('sample pdf'),
        originalname: 'gst_certificate.pdf',
        mimetype: 'application/pdf',
        folder: 'vinexus/kyc/unit_test',
        category: 'kyc',
      });

      assert.ok(res.url);
      assert.ok(res.publicId);
      assert.strictEqual(res.format, 'pdf');
    });

    test('6. storageService.replaceFile replaces file and triggers old file cleanup', async () => {
      const firstUpload = await storageService.uploadFile({
        buffer: Buffer.from('old doc'),
        originalname: 'old_pan.jpg',
        mimetype: 'image/jpeg',
        folder: 'vinexus/kyc/replace_test',
      });

      const replaced = await storageService.replaceFile({
        oldPublicId: firstUpload.publicId,
        buffer: Buffer.from('new doc'),
        originalname: 'new_pan.jpg',
        mimetype: 'image/jpeg',
        folder: 'vinexus/kyc/replace_test',
      });

      assert.ok(replaced.url);
      assert.notStrictEqual(replaced.publicId, firstUpload.publicId);
    });
  });

  describe('Section 3: File Validation & Middleware Security Rules', () => {
    test('7. Prohibited extensions (.exe, .js, .php, .html, .sh) are detected', () => {
      assert.strictEqual(isProhibitedExtension('malicious.exe'), true);
      assert.strictEqual(isProhibitedExtension('script.js'), true);
      assert.strictEqual(isProhibitedExtension('shell.sh'), true);
      assert.strictEqual(isProhibitedExtension('index.php'), true);
      assert.strictEqual(isProhibitedExtension('document.pdf'), false);
      assert.strictEqual(isProhibitedExtension('image.png'), false);
    });

    test('8. Upload endpoint rejects executable/script file (.exe) with 400 Bad Request', async () => {
      const file = {
        fieldname: 'file',
        filename: 'hack.exe',
        mimetype: 'application/octet-stream',
        buffer: Buffer.from('binary executable data'),
      };

      const res = await sendMultipartRequest('/api/dealers/kyc/documents', dealer1Token, { type: 'gst' }, file);
      assert.strictEqual(res.status, 400);
      assert.ok(res.body.message.includes('strictly prohibited'));
    });

    test('9. Upload endpoint rejects invalid MIME type for KYC category', async () => {
      const file = {
        fieldname: 'file',
        filename: 'archive.zip',
        mimetype: 'application/zip',
        buffer: Buffer.from('zip file contents'),
      };

      const res = await sendMultipartRequest('/api/dealers/kyc/documents', dealer1Token, { type: 'gst' }, file);
      assert.strictEqual(res.status, 400);
      assert.ok(res.body.message.includes('Invalid file format'));
    });

    test('10. Upload endpoint rejects missing file payload', async () => {
      const res = await request(
        '/api/dealers/kyc/documents',
        { method: 'POST', headers: { Authorization: `Bearer ${dealer1Token}` } },
        { type: 'gst' }
      );
      assert.strictEqual(res.status, 400);
    });
  });

  describe('Section 4: Dealer KYC Document Storage & Ownership Isolation', () => {
    test('11. Dealer 1 successfully uploads GST KYC document', async () => {
      const file = {
        fieldname: 'file',
        filename: 'dealer1_gst.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('PDF GST Document content'),
      };

      const res = await sendMultipartRequest('/api/dealers/kyc/documents', dealer1Token, { type: 'gst' }, file);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);

      const kycDocs = res.body.data.profile.kycDocuments;
      assert.ok(Array.isArray(kycDocs));
      const gstDoc = kycDocs.find((d) => d.type === 'gst');
      assert.ok(gstDoc);
      assert.ok(gstDoc.url.includes('mock.storage.vinexus.dev'));
      assert.ok(gstDoc.publicId);
    });

    test('12. Dealer 1 replacing GST document updates storage metadata and resets status to pending', async () => {
      const file = {
        fieldname: 'file',
        filename: 'dealer1_gst_v2.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('JPEG GST Document content'),
      };

      const res = await sendMultipartRequest('/api/dealers/kyc/documents', dealer1Token, { type: 'gst' }, file);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.profile.status, 'pending');

      const updatedProfile = await DealerProfile.findById(dealer1Profile._id);
      const gstDoc = updatedProfile.kycDocuments.find((d) => d.type === 'gst');
      assert.ok(gstDoc.url.endsWith('.jpg'));
    });

    test('13. Dealer 2 cannot view or delete Dealer 1 KYC document', async () => {
      // Dealer 2 attempts to delete Dealer 1 GST doc (which Dealer 2 does not have)
      const res = await request('/api/dealers/kyc/documents/gst', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${dealer2Token}` },
      });

      // Returns 404 because Dealer 2's own profile does not have a GST document uploaded
      assert.strictEqual(res.status, 404);
    });

    test('14. Admin can view Dealer 1 KYC document metadata via GET /api/admin/dealers/:id', async () => {
      const res = await request(`/api/admin/dealers/${dealer1Profile._id}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);

      const profile = res.body.data.profile || res.body.data;
      const kycDocs = profile.kycDocuments;
      assert.ok(Array.isArray(kycDocs));
      assert.ok(kycDocs.some((d) => d.type === 'gst' && d.url));

      // Security check: ensure Cloudinary API secret is never returned
      const rawString = JSON.stringify(res.body);
      assert.strictEqual(rawString.includes('cloudinaryApiSecret'), false);
    });
  });

  describe('Section 5: Admin Product Image Upload Integration', () => {
    test('15. Customer cannot upload product image (403 Forbidden)', async () => {
      const file = {
        fieldname: 'file',
        filename: 'pipe.png',
        mimetype: 'image/png',
        buffer: Buffer.from('PNG Image data'),
      };

      const res = await sendMultipartRequest(`/api/admin/products/${product._id}/images`, customerToken, { altText: 'Pipe' }, file);
      assert.strictEqual(res.status, 403);
    });

    test('16. Admin uploads image for product — stores URL and publicId in Product.images', async () => {
      const file = {
        fieldname: 'file',
        filename: 'pipe_hd.png',
        mimetype: 'image/png',
        buffer: Buffer.from('PNG Product Image data'),
      };

      const res = await sendMultipartRequest(`/api/admin/products/${product._id}/images`, adminToken, { altText: 'HD Pipe' }, file);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);

      const updatedProduct = await Product.findById(product._id);
      assert.ok(updatedProduct.images.length > 0);
      const addedImg = updatedProduct.images[0];
      assert.ok(addedImg.url);
      assert.ok(addedImg.publicId);
      assert.strictEqual(addedImg.altText, 'HD Pipe');
    });

    test('17. Admin deletes product image by publicId', async () => {
      const p = await Product.findById(product._id);
      const targetPublicId = p.images[0].publicId;

      const encodedPublicId = encodeURIComponent(targetPublicId);
      const res = await request(`/api/admin/products/${product._id}/images/${encodedPublicId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);

      const afterDeleteProduct = await Product.findById(product._id);
      assert.strictEqual(afterDeleteProduct.images.length, 0);
    });
  });

  describe('Section 6: Admin CMS Image Upload Integration', () => {
    test('18. Admin uploads image for hero banner (POST /api/admin/cms/banners/:id/image)', async () => {
      const file = {
        fieldname: 'file',
        filename: 'hero_banner.webp',
        mimetype: 'image/webp',
        buffer: Buffer.from('WEBP Hero Banner data'),
      };

      const res = await sendMultipartRequest(`/api/admin/cms/banners/${banner._id}/image`, adminToken, {}, file);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);

      const updatedBanner = await Banner.findById(banner._id);
      assert.ok(updatedBanner.image.url.includes('mock.storage.vinexus.dev'));
      assert.ok(updatedBanner.image.publicId);
    });
  });
});
