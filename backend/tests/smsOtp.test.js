import test, { before, after, describe } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

import app from '../src/app.js';
import { config } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { OtpVerification } from '../src/models/OtpVerification.js';
import { Session } from '../src/models/Session.js';
import { OtpProvider } from '../src/integrations/otp/OtpProvider.js';
import { DevOtpProvider } from '../src/integrations/otp/DevOtpProvider.js';
import { Msg91OtpProvider } from '../src/integrations/otp/Msg91OtpProvider.js';
import { Fast2SmsOtpProvider } from '../src/integrations/otp/Fast2SmsOtpProvider.js';
import { setOtpProvider, createOtpProvider } from '../src/integrations/otp/index.js';
import { authService } from '../src/services/auth.service.js';
import { smsService } from '../src/services/sms/sms.service.js';
import { AppError } from '../src/utils/AppError.js';
import { HTTP_STATUS } from '../src/constants/httpStatusCodes.js';
import { ERROR_CODES } from '../src/constants/errorCodes.js';
import {
  normalizePhoneNumber,
  formatE164,
  formatWithCountryCode,
  isValidIndianPhone,
} from '../src/utils/phone.util.js';

let server;
const PORT = 5091;

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

describe('Phase 8.1 — SMS / OTP Provider Integration Test Suite', () => {
  let customerPhone = '9194891111';
  let dealerPhone = '9194892222';
  let adminPhone = '9194899999';

  let customerUser;
  let dealerUser;
  let adminUser;

  let customerToken;
  let dealerToken;
  let adminToken;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongodbUri);
    }

    server = app.listen(PORT);

    // Clean up test records
    await User.deleteMany({ phone: { $in: [customerPhone, dealerPhone, adminPhone, '9876543210'] } });
    await OtpVerification.deleteMany({
      identifier: { $in: [customerPhone, dealerPhone, adminPhone, '9876543210', '9876543211', '9876543212'] },
    });

    // Create test customer, dealer, and admin
    customerUser = await User.create({
      fullName: 'SMS Test Customer',
      name: 'SMS Test Customer',
      email: `sms_customer_${Date.now()}@example.com`,
      phone: customerPhone,
      passwordHash: '$2a$10$e8Za3.XhMv4M810gqX.d4.d9d9.8d8d8d8d8d8d8d8d8d8d8d',
      role: 'customer',
      isPhoneVerified: true,
      accountStatus: 'active',
      status: 'active',
    });

    dealerUser = await User.create({
      fullName: 'SMS Test Dealer',
      name: 'SMS Test Dealer',
      email: `sms_dealer_${Date.now()}@example.com`,
      phone: dealerPhone,
      passwordHash: '$2a$10$e8Za3.XhMv4M810gqX.d4.d9d9.8d8d8d8d8d8d8d8d8d8d8d',
      role: 'dealer',
      isPhoneVerified: true,
      accountStatus: 'active',
      status: 'active',
    });

    adminUser = await User.create({
      fullName: 'SMS Test Admin',
      name: 'SMS Test Admin',
      email: `sms_admin_${Date.now()}@example.com`,
      phone: adminPhone,
      passwordHash: '$2a$10$e8Za3.XhMv4M810gqX.d4.d9d9.8d8d8d8d8d8d8d8d8d8d8d',
      role: 'admin',
      isPhoneVerified: true,
      accountStatus: 'active',
      status: 'active',
    });

    // Get Tokens via OTP flow
    await authService.sendOtp({ identifier: customerPhone, purpose: 'login' });
    const custRes = await authService.verifyOtp({ identifier: customerPhone, otp: '123456', purpose: 'login' });
    customerToken = custRes.accessToken;

    await authService.sendOtp({ identifier: dealerPhone, purpose: 'login' });
    const dealerRes = await authService.verifyOtp({ identifier: dealerPhone, otp: '123456', purpose: 'login' });
    dealerToken = dealerRes.accessToken;

    await authService.sendOtp({ identifier: adminPhone, purpose: 'login' });
    const adminRes = await authService.verifyOtp({ identifier: adminPhone, otp: '123456', purpose: 'login' });
    adminToken = adminRes.accessToken;
  });

  after(async () => {
    if (server) {
      server.close();
    }
    await User.deleteMany({ phone: { $in: [customerPhone, dealerPhone, adminPhone, '9876543210'] } });
    await OtpVerification.deleteMany({
      identifier: { $in: [customerPhone, dealerPhone, adminPhone, '9876543210', '9876543211', '9876543212'] },
    });
    setOtpProvider(new DevOtpProvider());
  });

  describe('SECTION A: Existing Auth Regression', () => {
    test('1. Customer send OTP returns 200', async () => {
      const res = await request('/api/auth/send-otp', { method: 'POST' }, {
        identifier: customerPhone,
        purpose: 'login',
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
    });

    test('2. Dealer send OTP returns 200', async () => {
      const res = await request('/api/auth/send-otp', { method: 'POST' }, {
        identifier: dealerPhone,
        purpose: 'login',
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
    });

    test('3. OTP verification returns access token and user info', async () => {
      await Session.deleteMany({ userId: customerUser._id });
      await request('/api/auth/send-otp', { method: 'POST' }, {
        identifier: customerPhone,
        purpose: 'login',
      });
      const res = await request('/api/auth/verify-otp', { method: 'POST' }, {
        identifier: customerPhone,
        otp: '123456',
        purpose: 'login',
      });
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.data.accessToken);
      assert.strictEqual(res.body.data.user.role, 'customer');
      customerToken = res.body.data.accessToken;
    });

    test('4. GET /api/auth/me returns current user profile with valid access token', async () => {
      const res = await request('/api/auth/me', {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.user.phone, customerPhone);
    });
  });

  describe('SECTION B: SMS Provider Integration', () => {
    test('1. SMS Provider receives correct phone number and OTP', async () => {
      let dispatchedPayload = null;

      class MockOtpProvider extends OtpProvider {
        async sendOtp({ identifier, otp, purpose }) {
          dispatchedPayload = { identifier, otp, purpose };
          return { success: true, provider: 'mock', messageId: 'mock-msg-123' };
        }
      }

      const mockProvider = new MockOtpProvider();
      setOtpProvider(mockProvider);

      await smsService.sendOtpSms({ phone: customerPhone, otp: '654321', purpose: 'login' });

      assert.ok(dispatchedPayload);
      assert.strictEqual(dispatchedPayload.identifier, customerPhone);
      assert.strictEqual(dispatchedPayload.otp, '654321');
      assert.strictEqual(dispatchedPayload.purpose, 'login');

      // Reset back to dev provider
      setOtpProvider(new DevOtpProvider());
    });

    test('2. Provider failure throws clean AppError without exposing internal keys', async () => {
      class FailingOtpProvider extends OtpProvider {
        async sendOtp() {
          throw new AppError('Failed to deliver OTP SMS via MSG91.', HTTP_STATUS.BAD_GATEWAY, ERROR_CODES.INTERNAL_ERROR);
        }
      }

      setOtpProvider(new FailingOtpProvider());

      let caughtError = null;
      try {
        await smsService.sendOtpSms({ phone: customerPhone, otp: '123456', purpose: 'login' });
      } catch (err) {
        caughtError = err;
      } finally {
        setOtpProvider(new DevOtpProvider());
      }

      assert.ok(caughtError, 'Expected an error to be thrown');
      assert.strictEqual(caughtError.statusCode, 502);
      assert.doesNotMatch(caughtError.message, /secret_key_12345/);
    });

    test('3. Factory createOtpProvider produces correct instances', () => {
      const dev = createOtpProvider('development');
      assert.ok(dev instanceof DevOtpProvider);

      const msg91 = createOtpProvider('msg91');
      assert.ok(msg91 instanceof Msg91OtpProvider);

      const fast2sms = createOtpProvider('fast2sms');
      assert.ok(fast2sms instanceof Fast2SmsOtpProvider);

      const defaultDev = createOtpProvider('unknown_provider');
      assert.ok(defaultDev instanceof DevOtpProvider);
    });
  });

  describe('SECTION C: OTP Security', () => {
    test('1. devOtp is omitted when NODE_ENV is production', async () => {
      const originalEnv = config.nodeEnv;
      config.nodeEnv = 'production';

      const result = await authService.sendOtp({ identifier: customerPhone, purpose: 'login' });
      assert.strictEqual(result.devOtp, undefined);

      config.nodeEnv = originalEnv;
    });

    test('2. Expired OTP is rejected', async () => {
      const testPhone = '9876543210';
      await OtpVerification.create({
        identifier: testPhone,
        otpHash: 'd74ff0ee8da3b9806b18c877dbf29bbde50b5bd8e4dad7a3a725000feb82e8f1', // 123456
        purpose: 'login',
        expiresAt: new Date(Date.now() - 10000), // Expired 10 seconds ago
        attempts: 0,
      });

      try {
        await authService.verifyOtp({ identifier: testPhone, otp: '123456', purpose: 'login' });
        assert.fail('Should reject expired OTP');
      } catch (err) {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /expired/i);
      }
    });

    test('3. Invalid OTP code is rejected', async () => {
      await authService.sendOtp({ identifier: customerPhone, purpose: 'login' });

      try {
        await authService.verifyOtp({ identifier: customerPhone, otp: '999999', purpose: 'login' });
        assert.fail('Should reject invalid OTP');
      } catch (err) {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /invalid/i);
      }
    });

    test('4. Maximum verification attempt limit is enforced', async () => {
      const testPhone = '9876543211';
      await OtpVerification.create({
        identifier: testPhone,
        otpHash: 'd74ff0ee8da3b9806b18c877dbf29bbde50b5bd8e4dad7a3a725000feb82e8f1', // 123456
        purpose: 'login',
        expiresAt: new Date(Date.now() + 300000),
        attempts: 3, // Already reached max attempts
      });

      try {
        await authService.verifyOtp({ identifier: testPhone, otp: '123456', purpose: 'login' });
        assert.fail('Should reject max attempt limit');
      } catch (err) {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /exceeded/i);
      }
    });
  });

  describe('SECTION D: Phone Validation & Normalization', () => {
    test('1. Valid Indian phone number formats normalize correctly', () => {
      assert.strictEqual(normalizePhoneNumber('9876543210'), '9876543210');
      assert.strictEqual(normalizePhoneNumber('+91 98765 43210'), '9876543210');
      assert.strictEqual(normalizePhoneNumber('+91+919876543210'), '9876543210');
      assert.strictEqual(normalizePhoneNumber('919876543210'), '9876543210');
      assert.strictEqual(normalizePhoneNumber('+91-98765-43210'), '9876543210');
    });

    test('2. International E.164 and country code formatting works', () => {
      assert.strictEqual(formatE164('9876543210'), '+919876543210');
      assert.strictEqual(formatWithCountryCode('9876543210'), '919876543210');
    });

    test('3. Indian mobile phone validator correctly accepts/rejects', () => {
      assert.strictEqual(isValidIndianPhone('9876543210'), true);
      assert.strictEqual(isValidIndianPhone('8876543210'), true);
      assert.strictEqual(isValidIndianPhone('7876543210'), true);
      assert.strictEqual(isValidIndianPhone('6876543210'), true);
      assert.strictEqual(isValidIndianPhone('5876543210'), false); // Starts with 5
      assert.strictEqual(isValidIndianPhone('12345'), false); // Short
    });
  });

  describe('SECTION E: Configuration & Credential Safety', () => {
    test('1. Msg91OtpProvider throws safe Bad Gateway when API key is unconfigured', async () => {
      const originalKey = config.smsApiKey;
      config.smsApiKey = '';

      const provider = new Msg91OtpProvider();
      try {
        await provider.sendOtp({ identifier: '9876543210', otp: '123456', purpose: 'login' });
        assert.fail('Should fail without API key');
      } catch (err) {
        assert.strictEqual(err.statusCode, 502);
      } finally {
        config.smsApiKey = originalKey;
      }
    });

    test('2. .env.example contains placeholder values only', () => {
      const envExamplePath = path.resolve(process.cwd(), '.env.example');
      const content = fs.readFileSync(envExamplePath, 'utf8');

      assert.ok(content.includes('SMS_PROVIDER='));
      assert.ok(content.includes('SMS_API_KEY='));
      assert.doesNotMatch(content, /SMS_API_KEY=\s*[A-Za-z0-9]{20,}/); // No real keys committed
    });
  });

  describe('SECTION F: Regression Verification', () => {
    test('1. Admin Dashboard GET /api/admin/dashboard returns 200', async () => {
      const res = await request('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
    });

    test('2. Admin Customers GET /api/admin/customers returns 200', async () => {
      const res = await request('/api/admin/customers', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.data.customers));
    });

    test('3. Admin Enquiries GET /api/admin/enquiries returns 200', async () => {
      const res = await request('/api/admin/enquiries', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.data.enquiries));
    });

    test('4. Admin Sessions GET /api/admin/sessions returns 200', async () => {
      const res = await request('/api/admin/sessions', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.data.sessions));
    });

    test('5. Admin Reports GET /api/admin/reports/summary returns 200', async () => {
      const res = await request('/api/admin/reports/summary', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
    });

    test('6. Admin CMS GET /api/admin/cms/banners returns 200', async () => {
      const res = await request('/api/admin/cms/banners', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
    });
  });
});
