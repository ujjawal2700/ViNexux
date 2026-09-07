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
import { EmailProvider } from '../src/integrations/email/EmailProvider.js';
import { DevEmailProvider } from '../src/integrations/email/DevEmailProvider.js';
import { SmtpEmailProvider } from '../src/integrations/email/SmtpEmailProvider.js';
import { setEmailProvider, createEmailProvider } from '../src/integrations/email/index.js';
import { emailService } from '../src/services/email/email.service.js';
import { authService } from '../src/services/auth.service.js';
import { AppError } from '../src/utils/AppError.js';
import { HTTP_STATUS } from '../src/constants/httpStatusCodes.js';

let server;
const PORT = 5092;

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

describe('Phase 8.2 — Email / SMTP Integration Test Suite', () => {
  let testEmail = `test_email_${Date.now()}@example.com`;
  let adminEmail = `admin_email_${Date.now()}@example.com`;

  let testUser;
  let adminUser;
  let adminToken;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongodbUri);
    }

    server = app.listen(PORT);

    // Cleanup existing test records
    await User.deleteMany({ email: { $in: [testEmail, adminEmail] } });
    await OtpVerification.deleteMany({ identifier: { $in: [testEmail, adminEmail] } });

    // Create test user and admin user
    testUser = await User.create({
      fullName: 'Email Test Customer',
      name: 'Email Test Customer',
      email: testEmail,
      phone: `91${Date.now().toString().slice(-8)}`,
      passwordHash: '$2a$10$e8Za3.XhMv4M810gqX.d4.d9d9.8d8d8d8d8d8d8d8d8d8d8d',
      role: 'customer',
      isEmailVerified: true,
      accountStatus: 'active',
      status: 'active',
    });

    adminUser = await User.create({
      fullName: 'Email Test Admin',
      name: 'Email Test Admin',
      email: adminEmail,
      phone: `92${Date.now().toString().slice(-8)}`,
      passwordHash: '$2a$10$e8Za3.XhMv4M810gqX.d4.d9d9.8d8d8d8d8d8d8d8d8d8d8d',
      role: 'admin',
      isEmailVerified: true,
      accountStatus: 'active',
      status: 'active',
    });

    // Authenticate Admin
    await authService.sendOtp({ identifier: adminEmail, purpose: 'login' });
    const adminRes = await authService.verifyOtp({ identifier: adminEmail, otp: '123456', purpose: 'login' });
    adminToken = adminRes.accessToken;
  });

  after(async () => {
    if (server) {
      server.close();
    }
    await User.deleteMany({ email: { $in: [testEmail, adminEmail] } });
    await OtpVerification.deleteMany({ identifier: { $in: [testEmail, adminEmail] } });
    setEmailProvider(new DevEmailProvider());
  });

  describe('SECTION 1: Provider Abstraction & Factory', () => {
    test('1. createEmailProvider("development") returns DevEmailProvider instance', () => {
      const provider = createEmailProvider('development');
      assert.ok(provider instanceof DevEmailProvider);
    });

    test('2. createEmailProvider("smtp") returns SmtpEmailProvider instance', () => {
      const provider = createEmailProvider('smtp');
      assert.ok(provider instanceof SmtpEmailProvider);
    });

    test('3. Default provider fallback returns DevEmailProvider', () => {
      const provider = createEmailProvider('unknown_provider');
      assert.ok(provider instanceof DevEmailProvider);
    });
  });

  describe('SECTION 2: Email Service & Payload Dispatch', () => {
    test('1. DevEmailProvider safely logs dispatch without throwing', async () => {
      const result = await emailService.sendEmail({
        to: testEmail,
        subject: 'Test Subject',
        text: 'Plain text email body',
        html: '<p>HTML email body</p>',
      });
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.provider, 'development');
      assert.ok(result.messageId);
    });

    test('2. Missing recipient or subject throws validation AppError', async () => {
      try {
        await emailService.sendEmail({ to: '', subject: 'Subject' });
        assert.fail('Should fail missing recipient');
      } catch (err) {
        assert.strictEqual(err.statusCode, 400);
      }

      try {
        await emailService.sendEmail({ to: testEmail, subject: '' });
        assert.fail('Should fail missing subject');
      } catch (err) {
        assert.strictEqual(err.statusCode, 400);
      }
    });

    test('3. Custom mock provider receives correct email arguments', async () => {
      let capturedPayload = null;

      class MockEmailProvider extends EmailProvider {
        async sendEmail({ to, subject, html, text, from }) {
          capturedPayload = { to, subject, html, text, from };
          return { success: true, provider: 'mock', messageId: 'mock-123' };
        }
      }

      setEmailProvider(new MockEmailProvider());

      await emailService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Welcome to Vinexus',
        html: '<b>Hello</b>',
        text: 'Hello',
      });

      assert.ok(capturedPayload);
      assert.strictEqual(capturedPayload.to, 'recipient@example.com');
      assert.strictEqual(capturedPayload.subject, 'Welcome to Vinexus');
      assert.strictEqual(capturedPayload.html, '<b>Hello</b>');
      assert.strictEqual(capturedPayload.text, 'Hello');

      setEmailProvider(new DevEmailProvider());
    });
  });

  describe('SECTION 3: Provider Error & Credential Protection', () => {
    test('1. SmtpEmailProvider throws safe Bad Gateway when credentials are missing', async () => {
      const originalHost = config.emailHost;
      const originalUser = config.emailUser;
      config.emailHost = '';
      config.emailUser = '';

      const smtpProvider = new SmtpEmailProvider();

      try {
        await smtpProvider.sendEmail({
          to: testEmail,
          subject: 'Test',
          text: 'Body',
        });
        assert.fail('Should throw when credentials are missing');
      } catch (err) {
        assert.strictEqual(err.statusCode, 502);
        assert.doesNotMatch(err.message, /password/i);
      } finally {
        config.emailHost = originalHost;
        config.emailUser = originalUser;
      }
    });

    test('2. SmtpEmailProvider catches transporter failures cleanly without leaking secrets', async () => {
      class FailingTransporter {
        async sendMail() {
          throw new Error('SMTP Connection Refused on auth pass=secret_password_123');
        }
      }

      const failingSmtp = new SmtpEmailProvider(new FailingTransporter());

      try {
        await failingSmtp.sendEmail({
          to: testEmail,
          subject: 'Failure Test',
          text: 'Body',
        });
        assert.fail('Should throw on transport failure');
      } catch (err) {
        assert.strictEqual(err.statusCode, 502);
        assert.doesNotMatch(err.message, /secret_password_123/);
        assert.match(err.message, /Failed to deliver email/i);
      }
    });
  });

  describe('SECTION 4: OTP Email Integration & Security', () => {
    test('1. sendOtp dispatches HTML/text OTP email when identifier is email', async () => {
      let captured = null;

      class OtpMockEmailProvider extends EmailProvider {
        async sendEmail({ to, subject, html, text }) {
          captured = { to, subject, html, text };
          return { success: true, messageId: 'otp-email-123' };
        }
      }

      setEmailProvider(new OtpMockEmailProvider());

      const res = await authService.sendOtp({ identifier: testEmail, purpose: 'login' });

      assert.ok(captured);
      assert.strictEqual(captured.to, testEmail);
      assert.match(captured.subject, /Vinexus/i);
      assert.match(captured.html, /Verification Code/i);
      assert.ok(res.expiresAt);

      setEmailProvider(new DevEmailProvider());
    });

    test('2. devOtp is omitted from sendOtp response in production mode', async () => {
      const originalEnv = config.nodeEnv;
      config.nodeEnv = 'production';

      const res = await authService.sendOtp({ identifier: testEmail, purpose: 'login' });
      assert.strictEqual(res.devOtp, undefined);

      config.nodeEnv = originalEnv;
    });

    test('3. Email OTP verification returns valid session & access token', async () => {
      await authService.sendOtp({ identifier: testEmail, purpose: 'login' });

      // Session cleanup for single session assertion in test
      await Session.deleteMany({ userId: testUser._id });

      const verifyRes = await authService.verifyOtp({
        identifier: testEmail,
        otp: '123456',
        purpose: 'login',
      });

      assert.strictEqual(verifyRes.sessionConflict, false);
      assert.ok(verifyRes.accessToken);
      assert.strictEqual(verifyRes.user.email, testEmail);
    });

    test('4. Incorrect email OTP code is rejected with 400 Bad Request', async () => {
      await authService.sendOtp({ identifier: testEmail, purpose: 'login' });

      try {
        await authService.verifyOtp({ identifier: testEmail, otp: '999999', purpose: 'login' });
        assert.fail('Should reject invalid OTP');
      } catch (err) {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /invalid/i);
      }
    });
  });

  describe('SECTION 5: Environment & Credential Safety Check', () => {
    test('1. .env.example contains email placeholders and no real secrets', () => {
      const envExamplePath = path.resolve(process.cwd(), '.env.example');
      const content = fs.readFileSync(envExamplePath, 'utf8');

      assert.ok(content.includes('EMAIL_PROVIDER='));
      assert.ok(content.includes('EMAIL_HOST='));
      assert.ok(content.includes('EMAIL_USER='));
      assert.ok(content.includes('EMAIL_PASSWORD='));
      assert.doesNotMatch(content, /EMAIL_PASSWORD=\s*[A-Za-z0-9]{15,}/); // No real secrets
    });
  });

  describe('SECTION 6: Regression Verification', () => {
    test('1. GET /api/admin/dashboard returns 200', async () => {
      const res = await request('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
    });

    test('2. GET /api/admin/customers returns 200', async () => {
      const res = await request('/api/admin/customers', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.data.customers));
    });

    test('3. GET /api/admin/enquiries returns 200', async () => {
      const res = await request('/api/admin/enquiries', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.data.enquiries));
    });

    test('4. GET /api/admin/sessions returns 200', async () => {
      const res = await request('/api/admin/sessions', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.data.sessions));
    });

    test('5. GET /api/admin/reports/summary returns 200', async () => {
      const res = await request('/api/admin/reports/summary', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
    });

    test('6. GET /api/admin/cms/banners returns 200', async () => {
      const res = await request('/api/admin/cms/banners', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
    });
  });
});
