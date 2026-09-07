import http from 'http';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { config } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { DealerProfile } from '../src/models/DealerProfile.js';
import { Product } from '../src/models/Product.js';
import { Category } from '../src/models/Category.js';
import { Enquiry } from '../src/models/Enquiry.js';

let server;
const PORT = 5020;

const request = (path, options = {}, body = null) => {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: '127.0.0.1',
      port: PORT,
      path,
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
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

let totalTests = 0;
let passed = 0;
let failed = 0;
let warnings = 0;

const assert = (condition, message) => {
  totalTests++;
  if (!condition) {
    failed++;
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  } else {
    passed++;
    console.log(`  ✓ ${message}`);
  }
};

const runAdminReportsTests = async () => {
  try {
    console.log('===========================================================');
    console.log('🚀 VINEXUS - ADMIN REPORTS TEST SUITE');
    console.log('===========================================================\n');

    await mongoose.connect(config.mongodbUri);
    console.log('✅ Connected to MongoDB for Admin Reports testing');

    server = app.listen(PORT, '127.0.0.1');
    await new Promise((r) => setTimeout(r, 500));
    console.log(`✅ Test server running on http://127.0.0.1:${PORT}\n`);

    const timestamp = Date.now();
    const custPhone = `91${timestamp.toString().slice(-8)}`;
    const dealerPhone = `92${timestamp.toString().slice(-8)}`;
    const adminPhone = `93${timestamp.toString().slice(-8)}`;

    console.log('Setting up test accounts...');

    // 1. Customer Account
    const custSignup = await request('/api/auth/signup', { method: 'POST' }, {
      fullName: `Report Customer ${timestamp}`,
      email: `cust_rep_${timestamp}@example.com`,
      phone: custPhone,
      password: 'Password123!',
      role: 'customer',
    });
    const custVerify = await request('/api/auth/verify-otp', { method: 'POST' }, {
      identifier: custPhone,
      otp: custSignup.body.data?.devOtp || '123456',
      purpose: 'signup',
    });
    const custToken = custVerify.body.data.accessToken;
    const custHeaders = { Authorization: `Bearer ${custToken}` };
    const custUserId = custVerify.body.data.user.id;

    // 2. Dealer Account & Profile
    const dealerSignup = await request('/api/auth/signup', { method: 'POST' }, {
      fullName: `Report Dealer ${timestamp}`,
      email: `dealer_rep_${timestamp}@example.com`,
      phone: dealerPhone,
      password: 'Password123!',
      role: 'dealer',
    });
    const dealerVerify = await request('/api/auth/verify-otp', { method: 'POST' }, {
      identifier: dealerPhone,
      otp: dealerSignup.body.data?.devOtp || '123456',
      purpose: 'signup',
    });
    const dealerToken = dealerVerify.body.data.accessToken;
    const dealerHeaders = { Authorization: `Bearer ${dealerToken}` };

    const createProfileRes = await request('/api/dealers/profile', { method: 'POST', headers: dealerHeaders }, {
      companyName: `Report Distro ${timestamp}`,
      gstin: `27AAAAA${timestamp.toString().slice(-4)}B1Z5`,
      pan: `ABCDE${timestamp.toString().slice(-4)}G`,
      businessAddress: { street: '1 Street', city: 'Delhi', state: 'Delhi', pincode: '110001' },
      kycDocuments: [{ type: 'gst', url: 'https://cdn.vinexus.com/gst.pdf' }],
    });
    const dealerProfileId = createProfileRes.body.data.profile._id;

    // 3. Admin Account
    const adminSignup = await request('/api/auth/signup', { method: 'POST' }, {
      fullName: `Report Admin ${timestamp}`,
      email: `admin_rep_${timestamp}@example.com`,
      phone: adminPhone,
      password: 'Password123!',
      role: 'customer',
    });
    const adminVerify = await request('/api/auth/verify-otp', { method: 'POST' }, {
      identifier: adminPhone,
      otp: adminSignup.body.data?.devOtp || '123456',
      purpose: 'signup',
    });
    const adminToken = adminVerify.body.data.accessToken;
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };
    const adminUserId = adminVerify.body.data.user.id;
    await User.updateOne({ _id: adminUserId }, { role: 'admin' });

    // Create Category & Product & Enquiry
    const category = await Category.create({ name: `Report Cat ${timestamp}`, slug: `rep-cat-${timestamp}`, isActive: true });
    const product = await Product.create({
      name: `Report Product ${timestamp}`,
      slug: `rep-prod-${timestamp}`,
      sku: `SKU-REP-${timestamp}`,
      standardPrice: 1500,
      stockQuantity: 20,
      categoryId: category._id,
      isActive: true,
    });

    await request('/api/cart/items', { method: 'POST', headers: custHeaders }, { productId: product._id.toString(), quantity: 2 });
    const enquiryRes = await request('/api/enquiries', { method: 'POST', headers: custHeaders }, { message: 'Report enquiry test' });
    const enquiryId = enquiryRes.body.data.enquiry._id;

    console.log('✅ Accounts, Catalog & Enquiry setup completed.\n');

    // -------------------------------------------------------------
    // SECTION A: AUTHORIZATION
    // -------------------------------------------------------------
    console.log('--- SECTION A: Authorization Checks ---');

    // No token -> 401
    const noTokenRes = await request('/api/admin/reports/summary', { method: 'GET' });
    assert(noTokenRes.status === 401, '1. GET /api/admin/reports/summary without token returns 401');

    // Customer token -> 403
    const custAuthRes = await request('/api/admin/reports/summary', { method: 'GET', headers: custHeaders });
    assert(custAuthRes.status === 403, '2. GET /api/admin/reports/summary with customer token returns 403');

    // Dealer token -> 403
    const dealerAuthRes = await request('/api/admin/reports/summary', { method: 'GET', headers: dealerHeaders });
    assert(dealerAuthRes.status === 403, '3. GET /api/admin/reports/summary with dealer token returns 403');

    // Admin token -> 200
    const adminAuthRes = await request('/api/admin/reports/summary', { method: 'GET', headers: adminHeaders });
    assert(adminAuthRes.status === 200, '4. GET /api/admin/reports/summary with admin token returns 200');

    // -------------------------------------------------------------
    // SECTION B: SUMMARY REPORT
    // -------------------------------------------------------------
    console.log('\n--- SECTION B: Platform Summary Report ---');

    const summaryRes = await request('/api/admin/reports/summary', { method: 'GET', headers: adminHeaders });
    assert(summaryRes.status === 200, 'Summary endpoint returns 200');
    const summaryData = summaryRes.body.data;
    assert(typeof summaryData.customers === 'object', 'Summary includes customers metrics');
    assert(typeof summaryData.customers.total === 'number', 'customers.total is a number');
    assert(typeof summaryData.customers.active === 'number', 'customers.active is a number');
    assert(typeof summaryData.customers.blocked === 'number', 'customers.blocked is a number');

    assert(typeof summaryData.dealers === 'object', 'Summary includes dealers metrics');
    assert(typeof summaryData.dealers.total === 'number', 'dealers.total is a number');
    assert(typeof summaryData.dealers.pending === 'number', 'dealers.pending is a number');
    assert(typeof summaryData.dealers.approved === 'number', 'dealers.approved is a number');

    assert(typeof summaryData.products === 'object', 'Summary includes products metrics');
    assert(typeof summaryData.products.total === 'number', 'products.total is a number');
    assert(typeof summaryData.products.active === 'number', 'products.active is a number');

    assert(typeof summaryData.categories === 'object', 'Summary includes categories metrics');
    assert(typeof summaryData.categories.total === 'number', 'categories.total is a number');

    assert(typeof summaryData.enquiries === 'object', 'Summary includes enquiries metrics');
    assert(typeof summaryData.enquiries.total === 'number', 'enquiries.total is a number');
    assert(typeof summaryData.enquiries.new === 'number', 'enquiries.new is a number');

    // -------------------------------------------------------------
    // SECTION C: ENQUIRY REPORT
    // -------------------------------------------------------------
    console.log('\n--- SECTION C: Enquiry Analytics Report ---');

    const enqReportRes = await request('/api/admin/reports/enquiries', { method: 'GET', headers: adminHeaders });
    assert(enqReportRes.status === 200, 'GET /api/admin/reports/enquiries returns 200');
    assert(typeof enqReportRes.body.data.total === 'number', 'Enquiry report contains total');
    assert(typeof enqReportRes.body.data.filteredCount === 'number', 'Enquiry report contains filteredCount');
    assert(typeof enqReportRes.body.data.statusBreakdown === 'object', 'Enquiry report contains statusBreakdown');
    assert(typeof enqReportRes.body.data.userTypeBreakdown === 'object', 'Enquiry report contains userTypeBreakdown');
    assert(Array.isArray(enqReportRes.body.data.enquiries), 'Enquiry report contains enquiries array');
    assert(typeof enqReportRes.body.data.pagination === 'object', 'Enquiry report contains pagination');

    // Status filter
    const enqStatusFilter = await request('/api/admin/reports/enquiries?status=new', { method: 'GET', headers: adminHeaders });
    assert(enqStatusFilter.status === 200, 'Enquiry report status=new filter returns 200');

    // userType filter
    const enqUserTypeFilter = await request('/api/admin/reports/enquiries?userType=customer', { method: 'GET', headers: adminHeaders });
    assert(enqUserTypeFilter.status === 200, 'Enquiry report userType=customer filter returns 200');

    // Date range filter
    const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const endDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const enqDateFilter = await request(`/api/admin/reports/enquiries?startDate=${startDate}&endDate=${endDate}`, { method: 'GET', headers: adminHeaders });
    assert(enqDateFilter.status === 200, 'Enquiry report date range filter returns 200');

    // -------------------------------------------------------------
    // SECTION D: DEALER REPORT
    // -------------------------------------------------------------
    console.log('\n--- SECTION D: Dealer Analytics Report ---');

    const dealerReportRes = await request('/api/admin/reports/dealers', { method: 'GET', headers: adminHeaders });
    assert(dealerReportRes.status === 200, 'GET /api/admin/reports/dealers returns 200');
    assert(typeof dealerReportRes.body.data.total === 'number', 'Dealer report contains total');
    assert(typeof dealerReportRes.body.data.filteredCount === 'number', 'Dealer report contains filteredCount');
    assert(typeof dealerReportRes.body.data.statusBreakdown === 'object', 'Dealer report contains statusBreakdown');
    assert(Array.isArray(dealerReportRes.body.data.dealers), 'Dealer report contains dealers array');

    // Status filter
    const dealerStatusFilter = await request('/api/admin/reports/dealers?status=pending', { method: 'GET', headers: adminHeaders });
    assert(dealerStatusFilter.status === 200, 'Dealer report status=pending filter returns 200');

    // -------------------------------------------------------------
    // SECTION E: CUSTOMER REPORT
    // -------------------------------------------------------------
    console.log('\n--- SECTION E: Customer Analytics Report ---');

    const custReportRes = await request('/api/admin/reports/customers', { method: 'GET', headers: adminHeaders });
    assert(custReportRes.status === 200, 'GET /api/admin/reports/customers returns 200');
    assert(typeof custReportRes.body.data.total === 'number', 'Customer report contains total');
    assert(typeof custReportRes.body.data.filteredCount === 'number', 'Customer report contains filteredCount');
    assert(typeof custReportRes.body.data.statusBreakdown === 'object', 'Customer report contains statusBreakdown');
    assert(Array.isArray(custReportRes.body.data.customers), 'Customer report contains customers array');

    // accountStatus filter
    const custStatusFilter = await request('/api/admin/reports/customers?accountStatus=active', { method: 'GET', headers: adminHeaders });
    assert(custStatusFilter.status === 200, 'Customer report accountStatus=active filter returns 200');

    // -------------------------------------------------------------
    // SECTION F: SECURITY & PRIVACY
    // -------------------------------------------------------------
    console.log('\n--- SECTION F: Security & Privacy ---');

    const sampleCust = custReportRes.body.data.customers[0];
    if (sampleCust) {
      assert(sampleCust.passwordHash === undefined, 'Security check: passwordHash is not exposed in customer report');
      assert(sampleCust.currentSessionId === undefined, 'Security check: currentSessionId is not exposed in customer report');
    }

    const sampleEnq = enqReportRes.body.data.enquiries[0];
    if (sampleEnq && sampleEnq.userId) {
      assert(sampleEnq.userId.passwordHash === undefined, 'Security check: passwordHash is not exposed in enquiry user population');
    }

    // -------------------------------------------------------------
    // SECTION G: REGRESSION CHECKS
    // -------------------------------------------------------------
    console.log('\n--- SECTION G: Regression Checks ---');

    // Admin Dashboard
    const dashboardRes = await request('/api/admin/dashboard', { method: 'GET', headers: adminHeaders });
    assert(dashboardRes.status === 200, 'Admin dashboard API returns 200');

    // Admin Customers
    const adminCustRes = await request('/api/admin/customers', { method: 'GET', headers: adminHeaders });
    assert(adminCustRes.status === 200, 'Admin customers API returns 200');

    // Admin Dealers
    const adminDealerRes = await request('/api/admin/dealers', { method: 'GET', headers: adminHeaders });
    assert(adminDealerRes.status === 200, 'Admin dealers API returns 200');

    // Admin Enquiries
    const adminEnqRes = await request('/api/admin/enquiries', { method: 'GET', headers: adminHeaders });
    assert(adminEnqRes.status === 200, 'Admin enquiries API returns 200');

    // Admin Sessions
    const adminSessRes = await request('/api/admin/sessions', { method: 'GET', headers: adminHeaders });
    assert(adminSessRes.status === 200, 'Admin sessions API returns 200');

    // Auth OTP send
    const authOtpRes = await request('/api/auth/send-otp', { method: 'POST' }, { identifier: custPhone, purpose: 'login' });
    assert(authOtpRes.status === 200, 'Auth send-otp API returns 200');

    // Cleanup test data
    await Category.findByIdAndDelete(category._id);
    await Product.findByIdAndDelete(product._id);
    await DealerProfile.findByIdAndDelete(dealerProfileId);
    await Enquiry.findByIdAndDelete(enquiryId);
    await User.deleteMany({ _id: { $in: [custUserId, adminUserId] } });

    console.log('\n===========================================================');
    console.log('ADMIN REPORTS TEST SUMMARY');
    console.log('===========================================================');
    console.log(`- Total tests: ${totalTests}`);
    console.log(`- Passed: ${passed}`);
    console.log(`- Failed: ${failed}`);
    console.log(`- Warnings: ${warnings}`);
    console.log('- APIs tested:');
    console.log('  1. GET /api/admin/reports/summary');
    console.log('  2. GET /api/admin/reports/enquiries');
    console.log('  3. GET /api/admin/reports/dealers');
    console.log('  4. GET /api/admin/reports/customers');
    console.log('  5. GET /api/admin/dashboard');
    console.log('  6. GET /api/admin/customers');
    console.log('  7. GET /api/admin/dealers');
    console.log('  8. GET /api/admin/enquiries');
    console.log('  9. GET /api/admin/sessions');
    console.log('  10. POST /api/auth/send-otp');
    console.log('- Files created:');
    console.log('  - src/validators/report.validator.js');
    console.log('  - src/services/report.service.js');
    console.log('  - src/controllers/adminReport.controller.js');
    console.log('  - src/routes/adminReport.routes.js');
    console.log('  - tests/adminReports.test.js');
    console.log('- Files modified:');
    console.log('  - src/routes/index.js');
    console.log('- Any implementation concerns: None');
    console.log('- Unimplemented PRD features: Financial analytics, payment metrics, and orders reporting were intentionally excluded as checkout/payment/orders are not in the current implementation scope.');
    console.log('===========================================================\n');

  } catch (err) {
    console.error('❌ Test execution error:', err);
  } finally {
    if (server) {
      server.close();
    }
    await mongoose.disconnect();
  }
};

runAdminReportsTests();
