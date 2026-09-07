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
import { Enquiry } from '../src/models/Enquiry.js';
import { Session } from '../src/models/Session.js';
import { authService } from '../src/services/auth.service.js';
import { setWhatsAppProvider } from '../src/integrations/whatsapp/index.js';
import { DevWhatsAppProvider } from '../src/integrations/whatsapp/DevWhatsAppProvider.js';

let server;
const PORT = 5096;

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
      bodyBuffers.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="${file.fieldname || 'file'}"; filename="${
            file.filename || 'test.png'
          }"\r\nContent-Type: ${file.mimetype || 'image/png'}\r\n\r\n`
        )
      );
      bodyBuffers.push(Buffer.isBuffer(file.buffer) ? file.buffer : Buffer.from(file.buffer || 'fake data'));
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
      res.on('data', (chunk) => {
        data += chunk;
      });
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

describe('Phase 8.6 — Security + Production Hardening Test Suite', () => {
  let customerUser;
  let customerToken;
  let customerSessionId;

  let dealerUser;
  let dealerToken;
  let dealerProfile;

  let adminUser;
  let adminToken;

  let category;
  let product;
  let enquiry;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongodbUri);
    }

    server = app.listen(PORT, '127.0.0.1');
    await new Promise((r) => setTimeout(r, 500));

    setWhatsAppProvider(new DevWhatsAppProvider());

    const ts = Date.now();

    // Customer
    const cEmail = `sec_cust_${ts}@example.com`;
    customerUser = await User.create({
      fullName: 'Security Customer',
      name: 'Security Customer',
      email: cEmail,
      phone: `9195${ts.toString().slice(-8)}`,
      passwordHash: 'hashed_password_123',
      role: 'customer',
      isEmailVerified: true,
      accountStatus: 'active',
      status: 'active',
    });
    await authService.sendOtp({ identifier: cEmail, purpose: 'login' });
    const cRes = await authService.verifyOtp({ identifier: cEmail, otp: '123456', purpose: 'login' });
    customerToken = cRes.accessToken;
    customerSessionId = cRes.session.sessionId;

    // Dealer
    const dEmail = `sec_dealer_${ts}@example.com`;
    dealerUser = await User.create({
      fullName: 'Security Dealer',
      name: 'Security Dealer',
      email: dEmail,
      phone: `9194${ts.toString().slice(-8)}`,
      passwordHash: 'hashed_password_123',
      role: 'dealer',
      isEmailVerified: true,
      accountStatus: 'active',
      status: 'active',
    });
    await authService.sendOtp({ identifier: dEmail, purpose: 'login' });
    const dRes = await authService.verifyOtp({ identifier: dEmail, otp: '123456', purpose: 'login' });
    dealerToken = dRes.accessToken;

    dealerProfile = await DealerProfile.create({
      userId: dealerUser._id,
      companyName: 'Security Hardware Pvt Ltd',
      gstin: `27AAACX${ts.toString().slice(-4)}F1Z1`,
      pan: `AAACX${ts.toString().slice(-4)}A`,
      status: 'pending',
    });

    // Admin
    const aEmail = `sec_admin_${ts}@example.com`;
    adminUser = await User.create({
      fullName: 'Security Admin',
      name: 'Security Admin',
      email: aEmail,
      phone: `9193${ts.toString().slice(-8)}`,
      passwordHash: 'hashed_password_123',
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
      name: `Sec Category ${ts}`,
      slug: `sec-category-${ts}`,
      isActive: true,
    });

    product = await Product.create({
      sku: `SEC-SKU-${ts}`,
      name: `Security Product ${ts}`,
      slug: `sec-product-${ts}`,
      categoryId: category._id,
      standardPrice: 2000,
      isActive: true,
    });

    // Enquiry owned by Customer
    enquiry = await Enquiry.create({
      enquiryNumber: `VNX-SEC-${ts.toString().slice(-6)}`,
      userId: customerUser._id,
      userType: 'customer',
      contactName: 'Security Customer',
      contactEmail: customerUser.email,
      contactPhone: customerUser.phone,
      status: 'new',
      items: [{ productId: product._id, productName: product.name, quantity: 1, priceShown: 2000 }],
    });
  });

  after(async () => {
    if (customerUser) await User.deleteOne({ _id: customerUser._id });
    if (dealerUser) await User.deleteOne({ _id: dealerUser._id });
    if (adminUser) await User.deleteOne({ _id: adminUser._id });
    if (dealerProfile) await DealerProfile.deleteOne({ _id: dealerProfile._id });
    if (category) await Category.deleteOne({ _id: category._id });
    if (product) await Product.deleteOne({ _id: product._id });
    if (enquiry) await Enquiry.deleteOne({ _id: enquiry._id });

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  describe('Section 1: Authentication & Token Hardening', () => {
    test('1. Missing Bearer token returns 401 Unauthorized', async () => {
      const res = await request('/api/auth/me');
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error.code, 'UNAUTHORIZED');
    });

    test('2. Invalid or malformed JWT returns 401 Unauthorized', async () => {
      const res = await request('/api/auth/me', {
        headers: { Authorization: 'Bearer invalid.jwt.token' },
      });
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
    });

    test('3. Revoked session JWT returns 401 Unauthorized', async () => {
      // Temporarily deactivate session in DB
      await Session.updateOne({ sessionId: customerSessionId }, { isActive: false });

      const res = await request('/api/auth/me', {
        headers: { Authorization: `Bearer ${customerToken}` },
      });

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);

      // Restore session
      await Session.updateOne({ sessionId: customerSessionId }, { isActive: true });
    });

    test('4. Blocked user request returns 403 Forbidden', async () => {
      // Temporarily set user accountStatus to blocked
      await User.updateOne({ _id: customerUser._id }, { accountStatus: 'blocked' });

      const res = await request('/api/auth/me', {
        headers: { Authorization: `Bearer ${customerToken}` },
      });

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);

      // Restore active user status
      await User.updateOne({ _id: customerUser._id }, { accountStatus: 'active' });
    });
  });

  describe('Section 2: Authorization & Ownership Isolation', () => {
    test('5. Customer accessing admin endpoint (GET /api/admin/dashboard) returns 403 Forbidden', async () => {
      const res = await request('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      assert.strictEqual(res.status, 403);
    });

    test('6. Dealer accessing admin endpoint (GET /api/admin/dealers) returns 403 Forbidden', async () => {
      const res = await request('/api/admin/dealers', {
        headers: { Authorization: `Bearer ${dealerToken}` },
      });
      assert.strictEqual(res.status, 403);
    });

    test('7. Dealer accessing another user/customer private enquiry returns 404 Not Found', async () => {
      const res = await request(`/api/enquiries/${enquiry._id}`, {
        headers: { Authorization: `Bearer ${dealerToken}` },
      });
      assert.strictEqual(res.status, 404);
    });
  });

  describe('Section 3: Mass Assignment & Protection', () => {
    test('8. Signup payload rejects attempts to self-assign role="admin" with 400 Bad Request', async () => {
      const ts = Date.now();
      const res = await request(
        '/api/auth/signup',
        { method: 'POST' },
        {
          fullName: 'Hacker User',
          email: `hacker_${ts}@example.com`,
          phone: `9191${ts.toString().slice(-8)}`,
          password: 'password123',
          role: 'admin',
          accountStatus: 'active',
        }
      );

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);

      // Cleanup if created
      await User.deleteOne({ email: `hacker_${ts}@example.com` });
    });
  });

  describe('Section 4: NoSQL Operator Injection Sanitization', () => {
    test('9. NoSQL query operator ($ne) in login input is safely sanitized/rejected', async () => {
      const res = await request(
        '/api/auth/send-otp',
        { method: 'POST' },
        {
          identifier: { $ne: null },
          purpose: 'login',
        }
      );

      // Either 400 Bad Request or 404 Not Found (identifier sanitized or rejected)
      assert.ok([400, 404].includes(res.status));
      assert.strictEqual(res.body.success, false);
    });
  });

  describe('Section 5: Input Validation & Formatting', () => {
    test('10. Invalid ObjectId in route parameter returns 400 Bad Request', async () => {
      const res = await request('/api/admin/enquiries/invalid-objectid-123', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 400);
    });

    test('11. Invalid pagination parameters (limit=99999) returns 400 Bad Request', async () => {
      const res = await request('/api/admin/products?limit=99999', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 400);
    });
  });

  describe('Section 6: File Upload Security', () => {
    test('12. Malicious script file extension (.sh) is rejected with 400 Bad Request', async () => {
      const file = {
        fieldname: 'file',
        filename: 'exploit.sh',
        mimetype: 'text/x-shellscript',
        buffer: Buffer.from('rm -rf /'),
      };

      const res = await sendMultipartRequest('/api/dealers/kyc/documents', dealerToken, { type: 'gst' }, file);
      assert.strictEqual(res.status, 400);
      assert.ok(res.body.message.includes('prohibited'));
    });

    test('13. Path traversal filename (../../etc/passwd.jpg) is safely handled without directory traversal', async () => {
      const file = {
        fieldname: 'file',
        filename: '../../etc/passwd.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('fake image content'),
      };

      const res = await sendMultipartRequest('/api/dealers/kyc/documents', dealerToken, { type: 'gst' }, file);
      assert.ok([200, 400].includes(res.status));
      if (res.status === 200) {
        // Ensure no path traversal string remains in stored publicId or url
        const doc = res.body.data.profile.kycDocuments.find((d) => d.type === 'gst');
        assert.ok(doc);
        assert.strictEqual(doc.publicId.includes('..'), false);
        assert.strictEqual(doc.url.includes('..'), false);
      }
    });
  });


  describe('Section 7: CMS Security & XSS Protection', () => {
    test('14. CMS page content containing executable <script> tags is rejected with 400 Bad Request', async () => {
      const res = await request(
        '/api/admin/cms/pages',
        { method: 'POST', headers: { Authorization: `Bearer ${adminToken}` } },
        {
          slug: `xss-test-${Date.now()}`,
          title: 'XSS Page Test',
          content: '<h1>Title</h1><script>alert("xss")</script>',
        }
      );

      assert.strictEqual(res.status, 400);
      assert.ok(res.body.message.includes('Validation failed'));
    });
  });

  describe('Section 8: Response Security & Secrets Protection', () => {
    test('15. GET /api/auth/me does not expose passwordHash or currentSessionId', async () => {
      const res = await request('/api/auth/me', {
        headers: { Authorization: `Bearer ${customerToken}` },
      });

      assert.strictEqual(res.status, 200);
      const str = JSON.stringify(res.body);
      assert.strictEqual(str.includes('passwordHash'), false);
      assert.strictEqual(str.includes('currentSessionId'), false);
    });

    test('16. GET /api/admin/sessions list does not expose refreshTokenHash, accessToken or refreshToken', async () => {
      const res = await request('/api/admin/sessions', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(res.status, 200);
      const str = JSON.stringify(res.body);
      assert.strictEqual(str.includes('refreshTokenHash'), false);
      assert.strictEqual(str.includes('accessToken'), false);
      assert.strictEqual(str.includes('refreshToken'), false);
    });
  });
});
