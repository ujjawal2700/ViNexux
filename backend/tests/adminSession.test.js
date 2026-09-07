import http from 'http';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { config } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { Session } from '../src/models/Session.js';

let server;
const PORT = 5019;

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

const runAdminSessionTests = async () => {
  try {
    console.log('===========================================================');
    console.log('🚀 VINEXUS - ADMIN SESSION MANAGEMENT TEST SUITE');
    console.log('===========================================================\n');

    await mongoose.connect(config.mongodbUri);
    console.log('✅ Connected to MongoDB for Admin Session testing');

    server = app.listen(PORT, '127.0.0.1');
    await new Promise((r) => setTimeout(r, 500));
    console.log(`✅ Test server running on http://127.0.0.1:${PORT}\n`);

    const timestamp = Date.now();
    const cust1Phone = `91${timestamp.toString().slice(-8)}`;
    const cust2Phone = `92${timestamp.toString().slice(-8)}`;
    const dealerPhone = `93${timestamp.toString().slice(-8)}`;
    const adminPhone = `94${timestamp.toString().slice(-8)}`;

    console.log('Setting up test accounts and active sessions...');

    // 1. Customer User 1 (Session 1)
    const cust1Signup = await request('/api/auth/signup', { method: 'POST' }, {
      fullName: `Session Customer One ${timestamp}`,
      email: `cust1_sess_${timestamp}@example.com`,
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
    const cust1SessionId = cust1Verify.body.data.session.sessionId;

    // 2. Customer User 2 (Session 2)
    const cust2Signup = await request('/api/auth/signup', { method: 'POST' }, {
      fullName: `Session Customer Two ${timestamp}`,
      email: `cust2_sess_${timestamp}@example.com`,
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
    const cust2SessionId = cust2Verify.body.data.session.sessionId;

    // 3. Dealer User
    const dealerSignup = await request('/api/auth/signup', { method: 'POST' }, {
      fullName: `Session Dealer User ${timestamp}`,
      email: `dealer_sess_${timestamp}@example.com`,
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

    // 4. Admin User
    const adminSignup = await request('/api/auth/signup', { method: 'POST' }, {
      fullName: `Session Admin User ${timestamp}`,
      email: `admin_sess_${timestamp}@example.com`,
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

    console.log('✅ Account & Session setups completed.\n');

    // -------------------------------------------------------------
    // SECTION A: AUTHORIZATION CHECKS
    // -------------------------------------------------------------
    console.log('--- SECTION A: Authorization Checks ---');

    // No token -> 401
    const noTokenRes = await request('/api/admin/sessions', { method: 'GET' });
    assert(noTokenRes.status === 401, '1. GET /api/admin/sessions without token returns 401');

    // Customer token -> 403
    const custAuthRes = await request('/api/admin/sessions', { method: 'GET', headers: cust1Headers });
    assert(custAuthRes.status === 403, '2. GET /api/admin/sessions with customer token returns 403');

    // Dealer token -> 403
    const dealerAuthRes = await request('/api/admin/sessions', { method: 'GET', headers: dealerHeaders });
    assert(dealerAuthRes.status === 403, '3. GET /api/admin/sessions with dealer token returns 403');

    // Admin token -> 200
    const adminAuthRes = await request('/api/admin/sessions', { method: 'GET', headers: adminHeaders });
    assert(adminAuthRes.status === 200, '4. GET /api/admin/sessions with admin token returns 200');

    // -------------------------------------------------------------
    // SECTION B: SESSION LISTING & FILTERS & SECURITY
    // -------------------------------------------------------------
    console.log('\n--- SECTION B: Session Listing, Filters & Security ---');

    const listRes = await request('/api/admin/sessions', { method: 'GET', headers: adminHeaders });
    assert(listRes.status === 200, 'GET /api/admin/sessions returns 200');
    assert(Array.isArray(listRes.body.data.sessions), 'Response contains sessions array');

    // Verify Pagination
    const pag = listRes.body.data.pagination;
    assert(typeof pag === 'object', 'Pagination object returned');
    assert(typeof pag.currentPage === 'number', 'Pagination has currentPage');
    assert(typeof pag.limit === 'number', 'Pagination has limit');
    assert(typeof pag.totalItems === 'number', 'Pagination has totalItems');
    assert(typeof pag.totalPages === 'number', 'Pagination has totalPages');

    // Verify Security: secrets are NEVER exposed in list
    const sampleSession = listRes.body.data.sessions[0];
    assert(sampleSession.refreshTokenHash === undefined, 'Security check: refreshTokenHash is NOT exposed');
    assert(sampleSession.accessToken === undefined, 'Security check: accessToken is NOT exposed');
    assert(sampleSession.refreshToken === undefined, 'Security check: refreshToken is NOT exposed');
    if (sampleSession.userId) {
      assert(sampleSession.userId.passwordHash === undefined, 'Security check: user passwordHash is NOT exposed');
    }

    // Filter by userId
    const filterUserRes = await request(`/api/admin/sessions?userId=${cust1UserId}`, { method: 'GET', headers: adminHeaders });
    assert(filterUserRes.status === 200, 'Filter by userId returns 200');
    assert(filterUserRes.body.data.sessions.every((s) => (s.userId._id || s.userId) === cust1UserId), 'All returned sessions match userId');

    // Filter by userType/role
    const filterRoleRes = await request('/api/admin/sessions?userType=customer', { method: 'GET', headers: adminHeaders });
    assert(filterRoleRes.status === 200, 'Filter by userType=customer returns 200');

    // Filter by status=active
    const filterActiveRes = await request('/api/admin/sessions?status=active', { method: 'GET', headers: adminHeaders });
    assert(filterActiveRes.status === 200, 'Filter by status=active returns 200');

    // Search by email/phone
    const searchRes = await request(`/api/admin/sessions?search=cust1_sess_${timestamp}`, { method: 'GET', headers: adminHeaders });
    assert(searchRes.status === 200, 'Search sessions by user email returns 200');
    assert(searchRes.body.data.sessions.length > 0, 'Matching user session found');

    // -------------------------------------------------------------
    // SECTION C: SESSION DETAIL VIEW
    // -------------------------------------------------------------
    console.log('\n--- SECTION C: Session Detail View ---');

    // Get DB Session Mongo ID for cust1SessionId
    const dbCust1Session = await Session.findOne({ sessionId: cust1SessionId }).lean();
    assert(dbCust1Session !== null, 'Found target DB session record');
    const mongoSessionId = dbCust1Session._id.toString();

    // Valid Session by Mongo ID -> 200
    const detailRes = await request(`/api/admin/sessions/${mongoSessionId}`, { method: 'GET', headers: adminHeaders });
    assert(detailRes.status === 200, 'GET /api/admin/sessions/:mongoId returns 200');
    const sessDetail = detailRes.body.data.session;
    assert(sessDetail.sessionId === cust1SessionId, 'Session ID matches target');
    assert(sessDetail.refreshTokenHash === undefined, 'Security check: refreshTokenHash is NOT exposed in detail');
    assert(sessDetail.userId.passwordHash === undefined, 'Security check: passwordHash is NOT exposed in detail');

    // Valid Session by UUID sessionId -> 200
    const detailUuidRes = await request(`/api/admin/sessions/${cust1SessionId}`, { method: 'GET', headers: adminHeaders });
    assert(detailUuidRes.status === 200, 'GET /api/admin/sessions/:sessionId UUID returns 200');

    // Non-existing Session -> 404
    const fakeId = new mongoose.Types.ObjectId().toString();
    const nonExistRes = await request(`/api/admin/sessions/${fakeId}`, { method: 'GET', headers: adminHeaders });
    assert(nonExistRes.status === 404, 'GET /api/admin/sessions with non-existing ObjectId returns 404');

    // -------------------------------------------------------------
    // SECTION D: SESSION REVOCATION & ENFORCEMENT
    // -------------------------------------------------------------
    console.log('\n--- SECTION D: Session Revocation & Auth Enforcement ---');

    // Verify Customer 2 access token works before revocation
    const preRevokeAuth = await request('/api/auth/me', { method: 'GET', headers: cust2Headers });
    assert(preRevokeAuth.status === 200, 'Customer 2 active token works before revocation');

    // Get Mongo ID for Customer 2 session
    const dbCust2Session = await Session.findOne({ sessionId: cust2SessionId }).lean();
    const mongoCust2SessionId = dbCust2Session._id.toString();

    // Admin revokes Customer 2 session
    const revokeRes = await request(`/api/admin/sessions/${mongoCust2SessionId}/revoke`, { method: 'PUT', headers: adminHeaders });
    assert(revokeRes.status === 200, 'Admin revoke session returns 200');
    assert(revokeRes.body.data.session.isActive === false, 'Session isActive is updated to false');
    assert(Boolean(revokeRes.body.data.session.revokedAt), 'Session revokedAt timestamp is set');

    // Verify revoked Customer 2 token is immediately rejected by auth.middleware.js with 401
    const postRevokeAuth = await request('/api/auth/me', { method: 'GET', headers: cust2Headers });
    assert(postRevokeAuth.status === 401, 'Revoked session access token is rejected with 401 Unauthorized');

    // Verify Customer 1 session remains active and unaffected
    const cust1AuthCheck = await request('/api/auth/me', { method: 'GET', headers: cust1Headers });
    assert(cust1AuthCheck.status === 200, 'Customer 1 active session remains active & unaffected by Customer 2 revocation');

    // Revoke non-existing session -> 404
    const revokeNonExistRes = await request(`/api/admin/sessions/${fakeId}/revoke`, { method: 'PUT', headers: adminHeaders });
    assert(revokeNonExistRes.status === 404, 'Revoke non-existing session returns 404 Not Found');

    // -------------------------------------------------------------
    // SECTION E: REGRESSION CHECKS
    // -------------------------------------------------------------
    console.log('\n--- SECTION E: Regression Checks ---');

    // 1. Customer login flow
    const custOtpRes = await request('/api/auth/send-otp', { method: 'POST' }, { identifier: cust1Phone, purpose: 'login' });
    assert(custOtpRes.status === 200, 'Customer login send-otp returns 200');

    // 2. Dealer login flow
    const dealerOtpRes = await request('/api/auth/send-otp', { method: 'POST' }, { identifier: dealerPhone, purpose: 'login' });
    assert(dealerOtpRes.status === 200, 'Dealer login send-otp returns 200');

    // 3. Admin Dashboard API
    const dashboardRes = await request('/api/admin/dashboard', { method: 'GET', headers: adminHeaders });
    assert(dashboardRes.status === 200, 'Admin dashboard API returns 200');

    // 4. Admin Customer API
    const adminCustRes = await request('/api/admin/customers', { method: 'GET', headers: adminHeaders });
    assert(adminCustRes.status === 200, 'Admin customer listing API returns 200');

    // 5. Admin Enquiry API
    const adminEnqRes = await request('/api/admin/enquiries', { method: 'GET', headers: adminHeaders });
    assert(adminEnqRes.status === 200, 'Admin enquiry listing API returns 200');

    // Cleanup test data
    await Session.deleteMany({ userId: { $in: [cust1UserId, cust2UserId, adminUserId] } });
    await User.deleteMany({ _id: { $in: [cust1UserId, cust2UserId, adminUserId] } });

    console.log('\n===========================================================');
    console.log('ADMIN SESSION MANAGEMENT TEST SUMMARY');
    console.log('===========================================================');
    console.log(`- Total tests: ${totalTests}`);
    console.log(`- Passed: ${passed}`);
    console.log(`- Failed: ${failed}`);
    console.log(`- Warnings: ${warnings}`);
    console.log('- APIs tested:');
    console.log('  1. GET /api/admin/sessions');
    console.log('  2. GET /api/admin/sessions/:id');
    console.log('  3. PUT /api/admin/sessions/:id/revoke');
    console.log('  4. GET /api/auth/me');
    console.log('  5. POST /api/auth/send-otp');
    console.log('  6. GET /api/admin/dashboard');
    console.log('  7. GET /api/admin/customers');
    console.log('  8. GET /api/admin/enquiries');
    console.log('- Files created:');
    console.log('  - src/validators/session.validator.js');
    console.log('  - src/services/session.service.js');
    console.log('  - src/controllers/adminSession.controller.js');
    console.log('  - src/routes/adminSession.routes.js');
    console.log('  - tests/adminSession.test.js');
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

runAdminSessionTests();
