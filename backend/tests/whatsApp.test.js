import test, { before, after, beforeEach, describe } from 'node:test';

import assert from 'node:assert';
import http from 'http';
import mongoose from 'mongoose';

import app from '../src/app.js';
import { config } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { DealerProfile } from '../src/models/DealerProfile.js';
import { Category } from '../src/models/Category.js';
import { Product } from '../src/models/Product.js';
import { Cart } from '../src/models/Cart.js';
import { Enquiry } from '../src/models/Enquiry.js';
import { WhatsAppProvider } from '../src/integrations/whatsapp/WhatsAppProvider.js';
import { DevWhatsAppProvider } from '../src/integrations/whatsapp/DevWhatsAppProvider.js';
import { WhatsAppCloudApiProvider } from '../src/integrations/whatsapp/WhatsAppCloudApiProvider.js';
import { createWhatsAppProvider, getWhatsAppProvider, setWhatsAppProvider } from '../src/integrations/whatsapp/index.js';
import { whatsAppService, WhatsAppService } from '../src/services/whatsapp/whatsapp.service.js';
import { authService } from '../src/services/auth.service.js';
import { approveDealerKyc, rejectDealerKyc } from '../src/services/dealer.service.js';

let server;
const PORT = 5095;

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

describe('Phase 8.5 — WhatsApp Integration Test Suite', () => {
  let devProvider;
  let customerUser;
  let customerToken;
  let dealerUser;
  let dealerProfile;
  let adminUser;
  let adminToken;
  let category;
  let product;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongodbUri);
    }

    server = app.listen(PORT, '127.0.0.1');
    await new Promise((r) => setTimeout(r, 500));

    // Ensure mock DevWhatsAppProvider is active
    devProvider = new DevWhatsAppProvider();
    setWhatsAppProvider(devProvider);

    const ts = Date.now();

    // Customer
    const cEmail = `wa_customer_${ts}@example.com`;
    customerUser = await User.create({
      fullName: 'WhatsApp Customer',
      name: 'WhatsApp Customer',
      email: cEmail,
      phone: `9198${ts.toString().slice(-8)}`,
      role: 'customer',
      isEmailVerified: true,
      accountStatus: 'active',
      status: 'active',
    });
    await authService.sendOtp({ identifier: cEmail, purpose: 'login' });
    const cRes = await authService.verifyOtp({ identifier: cEmail, otp: '123456', purpose: 'login' });
    customerToken = cRes.accessToken;

    // Dealer
    const dEmail = `wa_dealer_${ts}@example.com`;
    dealerUser = await User.create({
      fullName: 'WhatsApp Dealer',
      name: 'WhatsApp Dealer',
      email: dEmail,
      phone: `9197${ts.toString().slice(-8)}`,
      role: 'dealer',
      isEmailVerified: true,
      accountStatus: 'active',
      status: 'active',
    });

    dealerProfile = await DealerProfile.create({
      userId: dealerUser._id,
      companyName: 'WhatsApp Dealer Pvt Ltd',
      gstin: `27AAACW${ts.toString().slice(-4)}F1Z1`,
      pan: `AAACW${ts.toString().slice(-4)}A`,
      status: 'pending',
    });

    // Admin
    const aEmail = `wa_admin_${ts}@example.com`;
    adminUser = await User.create({
      fullName: 'WhatsApp Admin',
      name: 'WhatsApp Admin',
      email: aEmail,
      phone: `9196${ts.toString().slice(-8)}`,
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
      name: `WA Category ${ts}`,
      slug: `wa-category-${ts}`,
      isActive: true,
    });

    product = await Product.create({
      sku: `WA-SKU-${ts}`,
      name: `WA Test Product ${ts}`,
      slug: `wa-test-product-${ts}`,
      categoryId: category._id,
      standardPrice: 1500,
      isActive: true,
    });
  });

  after(async () => {
    if (customerUser) await User.deleteOne({ _id: customerUser._id });
    if (dealerUser) await User.deleteOne({ _id: dealerUser._id });
    if (adminUser) await User.deleteOne({ _id: adminUser._id });
    if (dealerProfile) await DealerProfile.deleteOne({ _id: dealerProfile._id });
    if (category) await Category.deleteOne({ _id: category._id });
    if (product) await Product.deleteOne({ _id: product._id });
    await Enquiry.deleteMany({ contactName: /WhatsApp/ });

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  describe('Section 1: WhatsApp Provider Abstraction & Factory', () => {
    test('1. Abstract WhatsAppProvider throws on sendMessage', async () => {
      const abstractProvider = new WhatsAppProvider();
      await assert.rejects(
        async () => abstractProvider.sendMessage({ phone: '919876543210', event: 'TEST' }),
        /must be implemented/
      );
    });

    test('2. DevWhatsAppProvider simulates sending, returns dev messageId, and records in history', async () => {
      const provider = new DevWhatsAppProvider();
      const res = await provider.sendMessage({
        phone: '919876543210',
        event: 'TEST_EVENT',
        template: 'test_template',
        variables: { key: 'value' },
      });

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.provider, 'development');
      assert.ok(res.messageId.startsWith('dev-whatsapp-'));

      const history = provider.getSentMessages();
      assert.strictEqual(history.length, 1);
      assert.strictEqual(history[0].phone, '919876543210');
      assert.strictEqual(history[0].event, 'TEST_EVENT');
    });

    test('3. WhatsAppCloudApiProvider instantiation & credentials missing check', async () => {
      const cloudProvider = new WhatsAppCloudApiProvider({
        apiUrl: 'https://graph.facebook.com/v18.0',
        accessToken: '',
        phoneNumberId: '',
      });

      const res = await cloudProvider.sendMessage({
        phone: '919876543210',
        event: 'ENQUIRY_CREATED',
      });

      assert.strictEqual(res.success, false);
      assert.strictEqual(res.provider, 'whatsapp_cloud_api');
      assert.ok(res.error.includes('credentials missing'));
    });

    test('4. createWhatsAppProvider factory creates correct provider instance', () => {
      const devInst = createWhatsAppProvider('dev');
      assert.ok(devInst instanceof DevWhatsAppProvider);

      const cloudInst = createWhatsAppProvider('cloud_api');
      assert.ok(cloudInst instanceof WhatsAppCloudApiProvider);

      const defaultInst = createWhatsAppProvider('unknown');
      assert.ok(defaultInst instanceof DevWhatsAppProvider);
    });
  });

  describe('Section 2: Phone Normalization & Recipient Validation', () => {
    test('5. Phone normalization formats 10-digit Indian numbers with +91 country prefix', () => {
      const service = new WhatsAppService();

      assert.strictEqual(service.normalizePhoneNumber('9876543210'), '919876543210');
      assert.strictEqual(service.normalizePhoneNumber('09876543210'), '919876543210');
      assert.strictEqual(service.normalizePhoneNumber('+919876543210'), '919876543210');
      assert.strictEqual(service.normalizePhoneNumber('+91 98765-43210'), '919876543210');
      assert.strictEqual(service.normalizePhoneNumber(''), '');
      assert.strictEqual(service.normalizePhoneNumber(null), '');
    });

    test('6. Recipient validation correctly identifies valid vs invalid phone formats', () => {
      const service = new WhatsAppService();

      assert.strictEqual(service.validateRecipient('9876543210'), true);
      assert.strictEqual(service.validateRecipient('+919876543210'), true);
      assert.strictEqual(service.validateRecipient('123'), false);
      assert.strictEqual(service.validateRecipient('abc'), false);
      assert.strictEqual(service.validateRecipient(null), false);
    });
  });

  describe('Section 3: Required Business Event Notifications via Dev Provider', () => {
    beforeEach(() => {
      devProvider.clearSentMessages();
    });

    test('7. sendEnquiryCreatedNotification constructs correct payload', async () => {
      const enquiryMock = {
        contactPhone: '9876543210',
        contactName: 'John Customer',
        enquiryNumber: 'VNX-100200',
      };

      const res = await whatsAppService.sendEnquiryCreatedNotification(enquiryMock);
      assert.strictEqual(res.success, true);

      const sent = devProvider.getSentMessages();
      assert.strictEqual(sent.length, 1);
      assert.strictEqual(sent[0].event, 'ENQUIRY_CREATED');
      assert.strictEqual(sent[0].phone, '919876543210');
      assert.strictEqual(sent[0].variables.customer_name, 'John Customer');
      assert.strictEqual(sent[0].variables.enquiry_number, 'VNX-100200');
    });

    test('8. sendEnquiryStatusUpdatedNotification constructs correct status payload', async () => {
      const enquiryMock = {
        contactPhone: '+919876543210',
        contactName: 'John Customer',
        enquiryNumber: 'VNX-100200',
      };

      const res = await whatsAppService.sendEnquiryStatusUpdatedNotification(enquiryMock, 'new', 'contacted');
      assert.strictEqual(res.success, true);

      const sent = devProvider.getSentMessages();
      assert.strictEqual(sent.length, 1);
      assert.strictEqual(sent[0].event, 'ENQUIRY_STATUS_UPDATED');
      assert.strictEqual(sent[0].variables.new_status, 'contacted');
    });

    test('9. sendDealerKycApprovedNotification constructs correct KYC payload', async () => {
      const dealerMock = {
        phone: '9876543210',
        companyName: 'Apex Hardware Supplies',
      };

      const res = await whatsAppService.sendDealerKycApprovedNotification(dealerMock);
      assert.strictEqual(res.success, true);

      const sent = devProvider.getSentMessages();
      assert.strictEqual(sent.length, 1);
      assert.strictEqual(sent[0].event, 'KYC_APPROVED');
      assert.strictEqual(sent[0].variables.company_name, 'Apex Hardware Supplies');
    });

    test('10. sendDealerKycRejectedNotification constructs correct rejection reason payload', async () => {
      const dealerMock = {
        phone: '9876543210',
        companyName: 'Apex Hardware Supplies',
      };

      const res = await whatsAppService.sendDealerKycRejectedNotification(dealerMock, 'Invalid GST Certificate');
      assert.strictEqual(res.success, true);

      const sent = devProvider.getSentMessages();
      assert.strictEqual(sent.length, 1);
      assert.strictEqual(sent[0].event, 'KYC_REJECTED');
      assert.strictEqual(sent[0].variables.reason, 'Invalid GST Certificate');
    });
  });

  describe('Section 4: Failure Isolation & Resiliency', () => {
    test('11. Provider failure returns success: false safely without throwing', async () => {
      // Create a failing provider mock
      const failingProvider = {
        async sendMessage() {
          throw new Error('Meta API connection timeout');
        },
      };

      setWhatsAppProvider(failingProvider);

      const res = await whatsAppService.sendNotification({
        phone: '919876543210',
        event: 'TEST_FAIL',
      });

      assert.strictEqual(res.success, false);
      assert.ok(res.error.includes('Meta API connection timeout'));

      // Reset to devProvider
      setWhatsAppProvider(devProvider);
    });

    test('12. Primary business operation (Enquiry Creation) succeeds even if WhatsApp provider fails', async () => {
      // Configure failing provider
      setWhatsAppProvider({
        async sendMessage() {
          throw new Error('WhatsApp service completely down');
        },
      });

      // Prepare Cart
      let cart = await Cart.findOne({ userId: customerUser._id });
      if (!cart) {
        cart = await Cart.create({ userId: customerUser._id, items: [] });
      }
      cart.items = [{ productId: product._id, quantity: 2, priceSnapshot: 1500 }];
      await cart.save();

      // Create Enquiry via API
      const res = await request(
        '/api/enquiries',
        { method: 'POST', headers: { Authorization: `Bearer ${customerToken}` } },
        { message: 'Test enquiry with failing WhatsApp' }
      );

      // Enquiry creation MUST succeed despite WhatsApp failure
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.enquiry.enquiryNumber);

      // Reset to devProvider
      setWhatsAppProvider(devProvider);
    });

    test('13. Primary business operation (Dealer KYC Approval) succeeds even if WhatsApp provider fails', async () => {
      // Configure failing provider
      setWhatsAppProvider({
        async sendMessage() {
          throw new Error('WhatsApp Gateway unavailable');
        },
      });

      // Approve Dealer KYC directly via service
      const approvedProfile = await approveDealerKyc(dealerProfile._id, adminUser._id);
      assert.strictEqual(approvedProfile.status, 'approved');

      // Reset to devProvider
      setWhatsAppProvider(devProvider);
    });
  });

  describe('Section 5: Admin Resend Endpoint & Security Checks', () => {
    let testEnquiry;

    before(async () => {
      testEnquiry = await Enquiry.create({
        enquiryNumber: `VNX-WA-${Date.now().toString().slice(-6)}`,
        userId: customerUser._id,
        userType: 'customer',
        contactName: 'WhatsApp Customer',
        contactEmail: customerUser.email,
        contactPhone: customerUser.phone,
        status: 'new',
        items: [{ productId: product._id, productName: product.name, quantity: 1, priceShown: 1500 }],
      });
    });


    test('14. Unauthenticated request to resend WhatsApp endpoint returns 401 Unauthorized', async () => {
      const res = await request(`/api/admin/enquiries/${testEnquiry._id}/resend-whatsapp`, { method: 'POST' });
      assert.strictEqual(res.status, 401);
    });

    test('15. Customer user request to resend WhatsApp endpoint returns 403 Forbidden', async () => {
      const res = await request(`/api/admin/enquiries/${testEnquiry._id}/resend-whatsapp`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      assert.strictEqual(res.status, 403);
    });

    test('16. Admin user request to resend WhatsApp endpoint returns 200 OK and triggers message', async () => {
      devProvider.clearSentMessages();

      const res = await request(`/api/admin/enquiries/${testEnquiry._id}/resend-whatsapp`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.result.success);

      const sent = devProvider.getSentMessages();
      assert.strictEqual(sent.length, 1);
      assert.strictEqual(sent[0].event, 'ENQUIRY_CREATED');

      // Secret safety check: ensure secrets/tokens are never exposed in response
      const jsonString = JSON.stringify(res.body);
      assert.strictEqual(jsonString.includes('whatsappAccessToken'), false);
      assert.strictEqual(jsonString.includes('WHATSAPP_ACCESS_TOKEN'), false);
    });
  });
});
