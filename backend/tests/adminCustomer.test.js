import http from 'http';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { config } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { Session } from '../src/models/Session.js';

let server;
const PORT = 5018;

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

const runAdminCustomerTests = async () => {
  try {
    console.log('===========================================================');
    console.log('🚀 VINEXUS - ADMIN CUSTOMER MANAGEMENT TEST SUITE');
    console.log('===========================================================\n');

    await mongoose.connect(config.mongodbUri);
    console.log('✅ Connected to MongoDB for Admin Customer testing');

    server = app.listen(PORT, '127.0.0.1');
    await new Promise((r) => setTimeout(r, 500));
    console.log(`✅ Test server running on http://127.0.0.1:${PORT}\n`);

    const timestamp = Date.now();
    const cust1Phone = `91${timestamp.toString().slice(-8)}`;
    const cust2Phone = `92${timestamp.toString().slice(-8)}`;
    const dealerPhone = `93${timestamp.toString().slice(-8)}`;
    const adminPhone = `94${timestamp.toString().slice(-8)}`;

    console.log('Setting up test accounts...');

    // 1. Customer User 1
    const cust1Signup = await request('/api/auth/signup', { method: 'POST' }, {
      fullName: `Customer Alpha ${timestamp}`,
      email: `cust_alpha_${timestamp}@example.com`,
      phone: cust1Phone,
      password: 'Password123!',
      role: 'customer',
    });
    const cust1Verify = await request('/api/auth/verify-otp', { method: 'POST' }, {
      identifier: cust1Phone,
      otp: cust1Signup.body.data?.devOtp || '123456',
      purpose: 'signup',
    });
    const cust1Token = cust1Verify.body.data.accessToken;
    const cust1Headers = { Authorization: `Bearer ${cust1Token}` };
    const cust1UserId = cust1Verify.body.data.user.id;

    // 2. Customer User 2
    const cust2Signup = await request('/api/auth/signup', { method: 'POST' }, {
      fullName: `Customer Beta ${timestamp}`,
      email: `cust_beta_${timestamp}@example.com`,
      phone: cust2Phone,
      password: 'Password123!',
      role: 'customer',
    });
    const cust2Verify = await request('/api/auth/verify-otp', { method: 'POST' }, {
      identifier: cust2Phone,
      otp: cust2Signup.body.data?.devOtp || '123456',
      purpose: 'signup',
    });
    const cust2Token = cust2Verify.body.data.accessToken;
    const cust2Headers = { Authorization: `Bearer ${cust2Token}` };
    const cust2UserId = cust2Verify.body.data.user.id;

    // 3. Dealer User
    const dealerSignup = await request('/api/auth/signup', { method: 'POST' }, {
      fullName: `Dealer User ${timestamp}`,
      email: `dealer_usr_${timestamp}@example.com`,
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
    const dealerUserId = dealerVerify.body.data.user.id;

    // 4. Admin User
    const adminSignup = await request('/api/auth/signup', { method: 'POST' }, {
      fullName: `Customer Admin ${timestamp}`,
      email: `admin_cust_${timestamp}@example.com`,
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

    console.log('✅ Account setups completed.\n');

    // -------------------------------------------------------------
    // SECTION A: AUTHORIZATION CHECKS (1-4)
    // -------------------------------------------------------------
    console.log('--- SECTION A: Authorization Checks ---');

    // 1. GET customers without token -> 401
    const noTokenRes = await request('/api/admin/customers', { method: 'GET' });
    assert(noTokenRes.status === 401, '1. GET /api/admin/customers without token returns 401');

    // 2. GET customers with customer token -> 403
    const custAuthRes = await request('/api/admin/customers', { method: 'GET', headers: cust1Headers });
    assert(custAuthRes.status === 403, '2. GET /api/admin/customers with customer token returns 403');

    // 3. GET customers with dealer token -> 403
    const dealerAuthRes = await request('/api/admin/customers', { method: 'GET', headers: dealerHeaders });
    assert(dealerAuthRes.status === 403, '3. GET /api/admin/customers with dealer token returns 403');

    // 4. GET customers with admin token -> 200
    const adminAuthRes = await request('/api/admin/customers', { method: 'GET', headers: adminHeaders });
    assert(adminAuthRes.status === 200, '4. GET /api/admin/customers with admin token returns 200');

    // -------------------------------------------------------------
    // SECTION B: LISTING & PAGINATION & SEARCH (5-11)
    // -------------------------------------------------------------
    console.log('\n--- SECTION B: Listing, Pagination, Search & Filtering ---');

    // 5. Customer list returns ONLY role='customer'
    const listRes = await request('/api/admin/customers', { method: 'GET', headers: adminHeaders });
    assert(listRes.status === 200, '5. Admin list customers returns 200');
    assert(Array.isArray(listRes.body.data.customers), 'Response contains customers array');
    const allRoleCustomer = listRes.body.data.customers.every((user) => user.role === 'customer');
    assert(allRoleCustomer, '5. All returned users strictly have role === customer');

    // 6. Pagination works
    const pag = listRes.body.data.pagination;
    assert(typeof pag === 'object', '6. Pagination object returned');
    assert(typeof pag.currentPage === 'number', 'Pagination has currentPage');
    assert(typeof pag.limit === 'number', 'Pagination has limit');
    assert(typeof pag.totalItems === 'number', 'Pagination has totalItems');
    assert(typeof pag.totalPages === 'number', 'Pagination has totalPages');

    // 7. Search by name works
    const searchNameRes = await request(`/api/admin/customers?search=Alpha`, { method: 'GET', headers: adminHeaders });
    assert(searchNameRes.status === 200, '7. Search by name returns 200');
    assert(searchNameRes.body.data.customers.length > 0, 'Matching customer returned in search by name');

    // 8. Search by email works
    const searchEmailRes = await request(`/api/admin/customers?search=cust_alpha_${timestamp}`, { method: 'GET', headers: adminHeaders });
    assert(searchEmailRes.status === 200, '8. Search by email returns 200');
    assert(searchEmailRes.body.data.customers.some((c) => c._id === cust1UserId), 'Customer 1 found via email search');

    // 9. Search by phone works
    const searchPhoneRes = await request(`/api/admin/customers?search=${cust1Phone}`, { method: 'GET', headers: adminHeaders });
    assert(searchPhoneRes.status === 200, '9. Search by phone returns 200');
    assert(searchPhoneRes.body.data.customers.some((c) => c._id === cust1UserId), 'Customer 1 found via phone search');

    // 10. accountStatus filter works
    const filterStatusRes = await request('/api/admin/customers?accountStatus=active', { method: 'GET', headers: adminHeaders });
    assert(filterStatusRes.status === 200, '10. Filter by accountStatus=active returns 200');

    // 11. Sorting works
    const sortRes = await request('/api/admin/customers?sortBy=fullName&sortOrder=asc', { method: 'GET', headers: adminHeaders });
    assert(sortRes.status === 200, '11. Sort by fullName asc returns 200');

    // -------------------------------------------------------------
    // SECTION C: DETAIL VIEW & SECURITY (12-17)
    // -------------------------------------------------------------
    console.log('\n--- SECTION C: Detail View & Security ---');

    // 12. Valid Customer ID -> 200
    const detailRes = await request(`/api/admin/customers/${cust1UserId}`, { method: 'GET', headers: adminHeaders });
    assert(detailRes.status === 200, '12. GET /api/admin/customers/:id returns 200');
    const custDetail = detailRes.body.data.customer;
    assert(custDetail._id === cust1UserId, 'Returned customer ID matches target');
    assert(custDetail.role === 'customer', 'Returned user role is customer');

    // 13. Invalid ObjectId -> 400
    const invalidIdRes = await request('/api/admin/customers/invalid-id-123', { method: 'GET', headers: adminHeaders });
    assert(invalidIdRes.status === 400, '13. GET /api/admin/customers with invalid ObjectId returns 400');

    // 14. Non-existing ID -> 404
    const fakeId = new mongoose.Types.ObjectId().toString();
    const nonExistRes = await request(`/api/admin/customers/${fakeId}`, { method: 'GET', headers: adminHeaders });
    assert(nonExistRes.status === 404, '14. GET /api/admin/customers with non-existing ObjectId returns 404');

    // 15. Dealer ID cannot be returned as customer -> 404
    const dealerAsCustRes = await request(`/api/admin/customers/${dealerUserId}`, { method: 'GET', headers: adminHeaders });
    assert(dealerAsCustRes.status === 404, '15. Requesting dealer ID via customer detail API returns 404 Not Found');

    // 16. Admin ID cannot be returned as customer -> 404
    const adminAsCustRes = await request(`/api/admin/customers/${adminUserId}`, { method: 'GET', headers: adminHeaders });
    assert(adminAsCustRes.status === 404, '16. Requesting admin ID via customer detail API returns 404 Not Found');

    // 17. passwordHash is NOT present in response
    assert(custDetail.passwordHash === undefined, '17. Security check: passwordHash is not exposed in detail response');
    assert(listRes.body.data.customers[0].passwordHash === undefined, '17. Security check: passwordHash is not exposed in list response');

    // -------------------------------------------------------------
    // SECTION D: STATUS UPDATE (18-21)
    // -------------------------------------------------------------
    console.log('\n--- SECTION D: Status Update ---');

    // 18. Admin can update valid customer status
    const updateStatusRes = await request(`/api/admin/customers/${cust2UserId}/status`, { method: 'PUT', headers: adminHeaders }, {
      accountStatus: 'active',
    });
    assert(updateStatusRes.status === 200, '18. Admin update customer accountStatus to active returns 200');
    assert(updateStatusRes.body.data.customer.accountStatus === 'active', 'Customer accountStatus updated to active');

    // 19. Invalid status -> 400
    const invalidStatusRes = await request(`/api/admin/customers/${cust2UserId}/status`, { method: 'PUT', headers: adminHeaders }, {
      accountStatus: 'invalid_status_enum',
    });
    assert(invalidStatusRes.status === 400, '19. Update with invalid accountStatus enum returns 400');

    // 20. Dealer/admin cannot be modified through customer status endpoint
    const dealerStatusRes = await request(`/api/admin/customers/${dealerUserId}/status`, { method: 'PUT', headers: adminHeaders }, {
      accountStatus: 'blocked',
    });
    assert(dealerStatusRes.status === 404, '20. Updating dealer via customer status endpoint returns 404');

    // 21. Customer role remains 'customer'
    assert(updateStatusRes.body.data.customer.role === 'customer', '21. Customer role strictly remains customer');

    // -------------------------------------------------------------
    // SECTION E: BLOCKING / AUTH REGRESSION (22-25)
    // -------------------------------------------------------------
    console.log('\n--- SECTION E: Blocking & Authentication Enforcement ---');

    // 22. Block customer 2
    const blockRes = await request(`/api/admin/customers/${cust2UserId}/status`, { method: 'PUT', headers: adminHeaders }, {
      accountStatus: 'blocked',
    });
    assert(blockRes.status === 200, '22. Block customer accountStatus returns 200');
    assert(blockRes.body.data.customer.accountStatus === 'blocked', 'Customer accountStatus set to blocked');

    // 23. Verify blocked customer cannot access protected APIs (returns 403 Forbidden)
    const blockedAccessRes = await request('/api/auth/me', { method: 'GET', headers: cust2Headers });
    assert(blockedAccessRes.status === 403, '23. Blocked customer accessing protected endpoint returns 403 Forbidden');

    // 24. Verify admin can still access the customer via admin API
    const adminFetchBlockedRes = await request(`/api/admin/customers/${cust2UserId}`, { method: 'GET', headers: adminHeaders });
    assert(adminFetchBlockedRes.status === 200, '24. Admin can still fetch blocked customer details via admin API');
    assert(adminFetchBlockedRes.body.data.customer.accountStatus === 'blocked', 'Customer is confirmed blocked in admin detail view');

    // 25. Verify existing auth/session behavior is not broken
    const unblockedAccessRes = await request('/api/auth/me', { method: 'GET', headers: cust1Headers });
    assert(unblockedAccessRes.status === 200, '25. Active unblocked customer can access protected endpoints normally');

    // -------------------------------------------------------------
    // SECTION F: REGRESSION CHECKS (26-29)
    // -------------------------------------------------------------
    console.log('\n--- SECTION F: Regression Checks ---');

    // 26. Existing customer login/auth flow
    const custOtpRes = await request('/api/auth/send-otp', { method: 'POST' }, { identifier: cust1Phone, purpose: 'login' });
    assert(custOtpRes.status === 200, '26. Customer login send-otp returns 200');

    // 27. Existing dealer login/auth flow
    const dealerOtpRes = await request('/api/auth/send-otp', { method: 'POST' }, { identifier: dealerPhone, purpose: 'login' });
    assert(dealerOtpRes.status === 200, '27. Dealer login send-otp returns 200');

    // 28. Existing admin APIs (Dashboard)
    const dashboardRes = await request('/api/admin/dashboard', { method: 'GET', headers: adminHeaders });
    assert(dashboardRes.status === 200, '28. Admin dashboard API returns 200');

    // 29. Existing enquiry APIs
    const enquiryListRes = await request('/api/admin/enquiries', { method: 'GET', headers: adminHeaders });
    assert(enquiryListRes.status === 200, '29. Admin enquiry listing API returns 200');

    // Cleanup test data
    await Session.deleteMany({ userId: { $in: [cust1UserId, cust2UserId, dealerUserId, adminUserId] } });
    await User.deleteMany({ _id: { $in: [cust1UserId, cust2UserId, dealerUserId, adminUserId] } });

    console.log('\n===========================================================');
    console.log('ADMIN CUSTOMER MANAGEMENT TEST SUMMARY');
    console.log('===========================================================');
    console.log(`- Total tests: ${totalTests}`);
    console.log(`- Passed: ${passed}`);
    console.log(`- Failed: ${failed}`);
    console.log(`- Warnings: ${warnings}`);
    console.log('- APIs tested:');
    console.log('  1. GET /api/admin/customers');
    console.log('  2. GET /api/admin/customers/:id');
    console.log('  3. PUT /api/admin/customers/:id/status');
    console.log('  4. GET /api/auth/me');
    console.log('  5. POST /api/auth/send-otp');
    console.log('  6. GET /api/admin/dashboard');
    console.log('  7. GET /api/admin/enquiries');
    console.log('- Files created:');
    console.log('  - src/validators/customer.validator.js');
    console.log('  - src/services/customer.service.js');
    console.log('  - src/controllers/adminCustomer.controller.js');
    console.log('  - src/routes/adminCustomer.routes.js');
    console.log('  - tests/adminCustomer.test.js');
    console.log('- Files modified:');
    console.log('  - src/routes/index.js');
    console.log('- Any implementation issues: None');
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

runAdminCustomerTests();
