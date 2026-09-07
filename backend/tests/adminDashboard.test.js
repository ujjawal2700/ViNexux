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
const PORT = 5013;

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

const assert = (condition, message) => {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  } else {
    console.log(`  ✓ ${message}`);
  }
};

const runAdminDashboardTests = async () => {
  try {
    console.log('===========================================================');
    console.log('🚀 VINEXUS PHASE 7 - ADMIN FOUNDATION & DASHBOARD API TEST SUITE');
    console.log('===========================================================\n');

    await mongoose.connect(config.mongodbUri);
    console.log('✅ Connected to MongoDB for Admin Dashboard testing');

    server = app.listen(PORT, '127.0.0.1');
    await new Promise((r) => setTimeout(r, 500));
    console.log(`✅ Test server running on http://127.0.0.1:${PORT}\n`);

    const timestamp = Date.now();
    const customerPhone = `91${timestamp.toString().slice(-8)}`;
    const dealerPhone = `92${timestamp.toString().slice(-8)}`;
    const adminPhone = `93${timestamp.toString().slice(-8)}`;

    // 1. Customer User Setup
    console.log('1. Setting up Customer user...');
    const custSignup = await request('/api/auth/signup', { method: 'POST' }, {
      fullName: 'Dashboard Test Customer',
      email: `cust_dash_${timestamp}@example.com`,
      phone: customerPhone,
      password: 'CustomerPassword123!',
      role: 'customer',
    });
    const custVerify = await request('/api/auth/verify-otp', { method: 'POST' }, {
      identifier: customerPhone,
      otp: custSignup.body.data?.devOtp || '123456',
      purpose: 'signup',
    });
    const customerToken = custVerify.body.data.accessToken;

    // 2. Dealer User Setup
    console.log('2. Setting up Dealer user...');
    const dealerSignup = await request('/api/auth/signup', { method: 'POST' }, {
      fullName: 'Dashboard Test Dealer',
      email: `dealer_dash_${timestamp}@example.com`,
      phone: dealerPhone,
      password: 'DealerPassword123!',
      role: 'dealer',
    });
    const dealerVerify = await request('/api/auth/verify-otp', { method: 'POST' }, {
      identifier: dealerPhone,
      otp: dealerSignup.body.data?.devOtp || '123456',
      purpose: 'signup',
    });
    const dealerToken = dealerVerify.body.data.accessToken;

    // 3. Admin User Setup (create user as customer then promote to admin role in DB)
    console.log('3. Setting up Admin user...');
    const adminSignup = await request('/api/auth/signup', { method: 'POST' }, {
      fullName: 'Dashboard Test Admin',
      email: `admin_dash_${timestamp}@example.com`,
      phone: adminPhone,
      password: 'AdminPassword123!',
      role: 'customer',
    });
    const adminVerify = await request('/api/auth/verify-otp', { method: 'POST' }, {
      identifier: adminPhone,
      otp: adminSignup.body.data?.devOtp || '123456',
      purpose: 'signup',
    });
    const adminToken = adminVerify.body.data.accessToken;
    const adminUserId = adminVerify.body.data.user.id;
    await User.updateOne({ _id: adminUserId }, { role: 'admin' });

    console.log('\n--- SECURITY & RBAC TESTS ---');

    // TEST 1: No Token -> 401
    console.log('\nTest 1: GET /api/admin/dashboard without token');
    const noTokenRes = await request('/api/admin/dashboard');
    assert(noTokenRes.status === 401, 'Returns HTTP 401 Unauthorized when no token provided');
    assert(noTokenRes.body.success === false, 'Response success is false');

    // TEST 2: Customer Token -> 403
    console.log('\nTest 2: GET /api/admin/dashboard with Customer token');
    const custRes = await request('/api/admin/dashboard', {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(custRes.status === 403, 'Returns HTTP 403 Forbidden for customer role');
    assert(custRes.body.success === false, 'Response success is false');

    // TEST 3: Dealer Token -> 403
    console.log('\nTest 3: GET /api/admin/dashboard with Dealer token');
    const dealerRes = await request('/api/admin/dashboard', {
      headers: { Authorization: `Bearer ${dealerToken}` },
    });
    assert(dealerRes.status === 403, 'Returns HTTP 403 Forbidden for dealer role');
    assert(dealerRes.body.success === false, 'Response success is false');

    // TEST 4: Admin Token -> 200
    console.log('\nTest 4: GET /api/admin/dashboard with Admin token');
    const adminRes = await request('/api/admin/dashboard', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminRes.status === 200, 'Returns HTTP 200 OK for admin role');
    assert(adminRes.body.success === true, 'Response success is true');
    assert(adminRes.body.message === 'Admin dashboard summary retrieved successfully', 'Correct success message returned');

    const data = adminRes.body.data;
    console.log('\n--- SUMMARY DATA ACCURACY & STRUCTURE TESTS ---');
    console.log('Dashboard Data Response:', JSON.stringify(data, null, 2));

    assert(typeof data.customers?.total === 'number', 'customers.total is a number');
    assert(typeof data.dealers?.total === 'number', 'dealers.total is a number');
    assert(typeof data.dealers?.pending === 'number', 'dealers.pending is a number');
    assert(typeof data.dealers?.approved === 'number', 'dealers.approved is a number');
    assert(typeof data.products?.total === 'number', 'products.total is a number');
    assert(typeof data.products?.active === 'number', 'products.active is a number');
    assert(typeof data.products?.inactive === 'number', 'products.inactive is a number');
    assert(typeof data.categories?.total === 'number', 'categories.total is a number');
    assert(typeof data.categories?.active === 'number', 'categories.active is a number');
    assert(typeof data.categories?.inactive === 'number', 'categories.inactive is a number');
    assert(typeof data.enquiries?.total === 'number', 'enquiries.total is a number');
    assert(typeof data.enquiries?.new === 'number', 'enquiries.new is a number');
    assert(typeof data.enquiries?.contacted === 'number', 'enquiries.contacted is a number');
    assert(typeof data.enquiries?.inProgress === 'number', 'enquiries.inProgress is a number');
    assert(typeof data.enquiries?.closed === 'number', 'enquiries.closed is a number');
    assert(typeof data.enquiries?.spam === 'number', 'enquiries.spam is a number');

    // DB Count Comparisons
    const expectedCustomers = await User.countDocuments({ role: 'customer' });
    const expectedDealers = await User.countDocuments({ role: 'dealer' });
    const expectedPendingDealers = await DealerProfile.countDocuments({ status: 'pending' });
    const expectedApprovedDealers = await DealerProfile.countDocuments({ status: 'approved' });
    const expectedTotalProducts = await Product.countDocuments({});
    const expectedActiveProducts = await Product.countDocuments({ isActive: true });
    const expectedInactiveProducts = await Product.countDocuments({ isActive: false });
    const expectedTotalCategories = await Category.countDocuments({});
    const expectedActiveCategories = await Category.countDocuments({ isActive: true });
    const expectedInactiveCategories = await Category.countDocuments({ isActive: false });
    const expectedTotalEnquiries = await Enquiry.countDocuments({});
    const expectedNewEnquiries = await Enquiry.countDocuments({ status: 'new' });
    const expectedContactedEnquiries = await Enquiry.countDocuments({ status: 'contacted' });
    const expectedInProgressEnquiries = await Enquiry.countDocuments({ status: 'in-progress' });
    const expectedClosedEnquiries = await Enquiry.countDocuments({ status: 'closed' });
    const expectedSpamEnquiries = await Enquiry.countDocuments({ status: 'spam' });

    assert(data.customers.total === expectedCustomers, `customers.total matches DB count (${expectedCustomers})`);
    assert(data.dealers.total === expectedDealers, `dealers.total matches DB count (${expectedDealers})`);
    assert(data.dealers.pending === expectedPendingDealers, `dealers.pending matches DB count (${expectedPendingDealers})`);
    assert(data.dealers.approved === expectedApprovedDealers, `dealers.approved matches DB count (${expectedApprovedDealers})`);
    assert(data.products.total === expectedTotalProducts, `products.total matches DB count (${expectedTotalProducts})`);
    assert(data.products.active === expectedActiveProducts, `products.active matches DB count (${expectedActiveProducts})`);
    assert(data.products.inactive === expectedInactiveProducts, `products.inactive matches DB count (${expectedInactiveProducts})`);
    assert(data.categories.total === expectedTotalCategories, `categories.total matches DB count (${expectedTotalCategories})`);
    assert(data.categories.active === expectedActiveCategories, `categories.active matches DB count (${expectedActiveCategories})`);
    assert(data.categories.inactive === expectedInactiveCategories, `categories.inactive matches DB count (${expectedInactiveCategories})`);
    assert(data.enquiries.total === expectedTotalEnquiries, `enquiries.total matches DB count (${expectedTotalEnquiries})`);
    assert(data.enquiries.new === expectedNewEnquiries, `enquiries.new matches DB count (${expectedNewEnquiries})`);
    assert(data.enquiries.contacted === expectedContactedEnquiries, `enquiries.contacted matches DB count (${expectedContactedEnquiries})`);
    assert(data.enquiries.inProgress === expectedInProgressEnquiries, `enquiries.inProgress matches DB count (${expectedInProgressEnquiries})`);
    assert(data.enquiries.closed === expectedClosedEnquiries, `enquiries.closed matches DB count (${expectedClosedEnquiries})`);
    assert(data.enquiries.spam === expectedSpamEnquiries, `enquiries.spam matches DB count (${expectedSpamEnquiries})`);

    console.log('\n===========================================================');
    console.log('🎉 ALL ADMIN DASHBOARD TESTS PASSED SUCCESSFULLY!');
    console.log('===========================================================\n');
  } catch (error) {
    console.error('❌ Test suite failed with error:', error);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
    await mongoose.disconnect();
  }
};

runAdminDashboardTests();
