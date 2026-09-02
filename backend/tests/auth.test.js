import http from 'http';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { config } from '../src/config/env.js';
import { User } from '../src/models/User.js';

let server;
const PORT = 5008;

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
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
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

const runAuthTests = async () => {
  console.log('[Phase 3 Comprehensive Auth & Security Audit Test] Starting test suite...\n');

  // Connect to MongoDB
  await mongoose.connect(config.mongodbUri);
  console.log('✅ Connected to MongoDB for testing');

  // Start HTTP Server
  server = app.listen(PORT, '127.0.0.1');
  await new Promise((r) => setTimeout(r, 500));
  console.log(`✅ Test server running on http://127.0.0.1:${PORT}\n`);

  try {
    const timestamp = Date.now();
    const testCustomerEmail = `customer.${timestamp}@example.com`;
    const testCustomerPhone = `987654${timestamp.toString().slice(-4)}`;
    const testDealerEmail = `dealer.${timestamp}@example.com`;
    const testDealerPhone = `912345${timestamp.toString().slice(-4)}`;

    // -------------------------------------------------------------
    // 1. Customer Signup (Account status: 'pending', isPhoneVerified: false)
    // -------------------------------------------------------------
    console.log(`1. Testing POST /api/auth/signup (Customer: ${testCustomerEmail})...`);
    const customerSignupRes = await request('/api/auth/signup', { method: 'POST' }, {
      fullName: 'Jane Customer',
      email: testCustomerEmail,
      phone: testCustomerPhone,
      password: 'SecurePassword123!',
      role: 'customer',
    });

    console.log(`   Response Status: ${customerSignupRes.status}`);
    console.log(`   User Status: ${customerSignupRes.body.data?.user?.accountStatus}, PhoneVerified: ${customerSignupRes.body.data?.user?.isPhoneVerified}`);

    if (customerSignupRes.status !== 201 || customerSignupRes.body.data?.user?.accountStatus !== 'pending') {
      throw new Error(`Customer signup failed: ${JSON.stringify(customerSignupRes.body)}`);
    }
    console.log('   ✅ Customer signup created unverified account with accountStatus="pending"\n');

    // -------------------------------------------------------------
    // 2. Dealer Signup
    // -------------------------------------------------------------
    console.log(`2. Testing POST /api/auth/signup (Dealer: ${testDealerEmail})...`);
    const dealerSignupRes = await request('/api/auth/signup', { method: 'POST' }, {
      fullName: 'Acme Hardware Dealer',
      email: testDealerEmail,
      phone: testDealerPhone,
      password: 'DealerPassword123!',
      role: 'dealer',
    });

    console.log(`   Response Status: ${dealerSignupRes.status}`);
    if (dealerSignupRes.status !== 201 || !dealerSignupRes.body.success) {
      throw new Error(`Dealer signup failed: ${JSON.stringify(dealerSignupRes.body)}`);
    }
    console.log('   ✅ Dealer signup passed\n');

    const signupDevOtp = customerSignupRes.body.data?.devOtp || '123456';

    // -------------------------------------------------------------
    // 3. Login OTP Request for Non-Existent User (Expect 404)
    // -------------------------------------------------------------
    console.log('3. Testing POST /api/auth/send-otp for NON-EXISTENT user (expect 404)...');
    const nonExistentOtpRes = await request('/api/auth/send-otp', { method: 'POST' }, {
      identifier: 'nonexistent.user.9999@example.com',
      purpose: 'login',
    });

    console.log(`   Response Status: ${nonExistentOtpRes.status}`);
    if (nonExistentOtpRes.status === 404) {
      console.log('   ✅ Rejected non-existent user login OTP request with 404 Not Found\n');
    } else {
      throw new Error(`Expected 404 for non-existent user login OTP, got: ${nonExistentOtpRes.status}`);
    }

    // -------------------------------------------------------------
    // 4. Verify Signup OTP -> Account Activation to 'active'
    // -------------------------------------------------------------
    console.log(`4. Testing POST /api/auth/verify-otp for Customer Signup (${signupDevOtp})...`);
    const verifySignupOtpRes = await request('/api/auth/verify-otp', { method: 'POST' }, {
      identifier: testCustomerPhone,
      otp: signupDevOtp,
      purpose: 'signup',
    });

    console.log(`   Response Status: ${verifySignupOtpRes.status}`);
    console.log(`   Activated Status: ${verifySignupOtpRes.body.data?.user?.accountStatus}, IsPhoneVerified: ${verifySignupOtpRes.body.data?.user?.isPhoneVerified}`);

    if (
      verifySignupOtpRes.status !== 200 ||
      verifySignupOtpRes.body.data?.user?.accountStatus !== 'active' ||
      !verifySignupOtpRes.body.data?.user?.isPhoneVerified
    ) {
      throw new Error(`Verify signup OTP failed: ${JSON.stringify(verifySignupOtpRes.body)}`);
    }
    console.log('   ✅ Signup phone verified & account activated to "active"\n');

    const session1AccessToken = verifySignupOtpRes.body.data.accessToken;
    const session1RefreshToken = verifySignupOtpRes.body.data.refreshToken;

    // -------------------------------------------------------------
    // 5. Access Protected Endpoint (/me) using JWT Access Token
    // -------------------------------------------------------------
    console.log('5. Testing GET /api/auth/me using JWT Access Token...');
    const meRes1 = await request('/api/auth/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${session1AccessToken}`,
      },
    });

    console.log(`   Response Status: ${meRes1.status}`);
    console.log(`   Authenticated User:`, meRes1.body.data?.user);

    if (meRes1.status !== 200 || meRes1.body.data?.user?.email !== testCustomerEmail) {
      throw new Error(`Failed to access /me with JWT token: ${JSON.stringify(meRes1.body)}`);
    }
    console.log('   ✅ JWT Bearer token authentication passed\n');

    // -------------------------------------------------------------
    // 6. Test Single Active Session Conflict (Simulate 2nd device login)
    // -------------------------------------------------------------
    console.log('6. Requesting Login OTP for 2nd device simulation...');
    const sendLoginOtpRes = await request('/api/auth/send-otp', { method: 'POST' }, {
      identifier: testCustomerEmail,
      purpose: 'login',
    });

    const loginDevOtp = sendLoginOtpRes.body.data?.devOtp || '123456';

    console.log('7. Testing POST /api/auth/verify-otp when active session ALREADY exists (Session Conflict)...');
    const conflictRes = await request('/api/auth/verify-otp', { method: 'POST' }, {
      identifier: testCustomerEmail,
      otp: loginDevOtp,
      purpose: 'login',
    });

    console.log(`   Response Status: ${conflictRes.status}`);
    console.log(`   Session Conflict Detected: ${conflictRes.body.data?.sessionConflict}`);
    console.log(`   Conflict Ticket Received: ${Boolean(conflictRes.body.data?.conflictTicket)}`);

    if (conflictRes.status !== 200 || !conflictRes.body.data?.sessionConflict || !conflictRes.body.data?.conflictTicket) {
      throw new Error(`Session conflict detection failed: ${JSON.stringify(conflictRes.body)}`);
    }
    console.log('   ✅ Active session conflict correctly detected\n');

    const conflictTicket = conflictRes.body.data.conflictTicket;

    // -------------------------------------------------------------
    // 7. Force Login (User confirms session takeover)
    // -------------------------------------------------------------
    console.log('8. Testing POST /api/auth/force-login with conflictTicket...');
    const forceLoginRes = await request('/api/auth/force-login', { method: 'POST' }, {
      conflictTicket,
    });

    console.log(`   Response Status: ${forceLoginRes.status}`);
    console.log(`   New Access Token: ${Boolean(forceLoginRes.body.data?.accessToken)}`);

    if (forceLoginRes.status !== 200 || !forceLoginRes.body.data?.accessToken) {
      throw new Error(`Force login failed: ${JSON.stringify(forceLoginRes.body)}`);
    }
    console.log('   ✅ Force login succeeded, old session revoked, new session created\n');

    const session2AccessToken = forceLoginRes.body.data.accessToken;
    const session2RefreshToken = forceLoginRes.body.data.refreshToken;

    // -------------------------------------------------------------
    // 8. Test Conflict Ticket Single-Use Protection (Re-using ticket must fail)
    // -------------------------------------------------------------
    console.log('9. Testing POST /api/auth/force-login with SAME consumed conflictTicket (expect 400 Bad Request)...');
    const reuseTicketRes = await request('/api/auth/force-login', { method: 'POST' }, {
      conflictTicket,
    });

    console.log(`   Response Status: ${reuseTicketRes.status}`);
    if (reuseTicketRes.status === 400) {
      console.log('   ✅ Re-use of consumed conflict ticket correctly rejected with 400 Bad Request\n');
    } else {
      throw new Error(`Expected 400 for re-used conflict ticket, got: ${reuseTicketRes.status}`);
    }

    // -------------------------------------------------------------
    // 9. Verify Old Device Session Rejection (401 Unauthorized)
    // -------------------------------------------------------------
    console.log('10. Testing GET /api/auth/me using OLD device JWT Access Token (expect 401 Unauthorized)...');
    const oldSessionMeRes = await request('/api/auth/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${session1AccessToken}`,
      },
    });

    console.log(`   Response Status: ${oldSessionMeRes.status}`);
    if (oldSessionMeRes.status === 401) {
      console.log('   ✅ Revoked old device session correctly rejected with 401 Unauthorized\n');
    } else {
      throw new Error(`Expected 401 for old session token, got: ${oldSessionMeRes.status}`);
    }

    // -------------------------------------------------------------
    // 10. Verify New Device Session Acceptance
    // -------------------------------------------------------------
    console.log('11. Testing GET /api/auth/me using NEW device JWT Access Token...');
    const newSessionMeRes = await request('/api/auth/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${session2AccessToken}`,
      },
    });

    console.log(`   Response Status: ${newSessionMeRes.status}`);
    if (newSessionMeRes.status !== 200) {
      throw new Error(`New session access failed: ${JSON.stringify(newSessionMeRes.body)}`);
    }
    console.log('   ✅ New device session accepted\n');

    // -------------------------------------------------------------
    // 11. Refresh Token Rotation
    // -------------------------------------------------------------
    console.log('12. Testing POST /api/auth/refresh-token (Refresh Token Rotation)...');
    const refreshTokenRes = await request('/api/auth/refresh-token', { method: 'POST' }, {
      refreshToken: session2RefreshToken,
    });

    console.log(`   Response Status: ${refreshTokenRes.status}`);
    console.log(`   New Access Token: ${Boolean(refreshTokenRes.body.data?.accessToken)}`);
    console.log(`   New Refresh Token: ${Boolean(refreshTokenRes.body.data?.refreshToken)}`);

    if (refreshTokenRes.status !== 200 || !refreshTokenRes.body.data?.refreshToken) {
      throw new Error(`Refresh token failed: ${JSON.stringify(refreshTokenRes.body)}`);
    }
    console.log('   ✅ Refresh token rotated successfully\n');

    const session3AccessToken = refreshTokenRes.body.data.accessToken;
    const session3RefreshToken = refreshTokenRes.body.data.refreshToken;

    // -------------------------------------------------------------
    // 12. Old Refresh Token Re-use Rejection (401 Unauthorized)
    // -------------------------------------------------------------
    console.log('13. Testing POST /api/auth/refresh-token with OLD Refresh Token (expect 401 Unauthorized)...');
    const oldRefreshTokenRes = await request('/api/auth/refresh-token', { method: 'POST' }, {
      refreshToken: session2RefreshToken,
    });

    console.log(`   Response Status: ${oldRefreshTokenRes.status}`);
    if (oldRefreshTokenRes.status === 401) {
      console.log('   ✅ Re-use of old rotated refresh token correctly rejected with 401 Unauthorized\n');
    } else {
      throw new Error(`Expected 401 for old refresh token, got: ${oldRefreshTokenRes.status}`);
    }

    // -------------------------------------------------------------
    // 13. Logout
    // -------------------------------------------------------------
    console.log('14. Testing POST /api/auth/logout...');
    const logoutRes = await request('/api/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session3AccessToken}`,
      },
    });

    console.log(`   Response Status: ${logoutRes.status}`);
    if (logoutRes.status !== 200 || !logoutRes.body.success) {
      throw new Error(`Logout failed: ${JSON.stringify(logoutRes.body)}`);
    }
    console.log('   ✅ Logout succeeded & session deactivated\n');

    // -------------------------------------------------------------
    // 14. Logged Out Access Token Rejection
    // -------------------------------------------------------------
    console.log('15. Testing GET /api/auth/me after Logout (expect 401 Unauthorized)...');
    const postLogoutMeRes = await request('/api/auth/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${session3AccessToken}`,
      },
    });

    console.log(`   Response Status: ${postLogoutMeRes.status}`);
    if (postLogoutMeRes.status === 401) {
      console.log('   ✅ Logged-out token correctly rejected with 401 Unauthorized\n');
    } else {
      throw new Error(`Expected 401 after logout, got: ${postLogoutMeRes.status}`);
    }

    // -------------------------------------------------------------
    // 15. Blocked User Account Rejection
    // -------------------------------------------------------------
    console.log('16. Testing Blocked Account rejection...');
    // Create new session for customer
    const sendBlockedOtpRes = await request('/api/auth/send-otp', { method: 'POST' }, {
      identifier: testCustomerEmail,
      purpose: 'login',
    });
    const blockedOtp = sendBlockedOtpRes.body.data.devOtp || '123456';
    const verifyBlockedRes = await request('/api/auth/verify-otp', { method: 'POST' }, {
      identifier: testCustomerEmail,
      otp: blockedOtp,
      purpose: 'login',
    });
    const blockedUserAccessToken = verifyBlockedRes.body.data.accessToken;

    // Block user in database directly
    await User.updateOne({ email: testCustomerEmail }, { accountStatus: 'blocked', status: 'blocked' });

    const blockedMeRes = await request('/api/auth/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${blockedUserAccessToken}`,
      },
    });

    console.log(`   Response Status: ${blockedMeRes.status}`);
    if (blockedMeRes.status === 403 || blockedMeRes.status === 401) {
      console.log('   ✅ Blocked account correctly rejected\n');
    } else {
      throw new Error(`Expected 403/401 for blocked user, got: ${blockedMeRes.status}`);
    }

    console.log('===========================================================');
    console.log('🎉 ALL 16 SECURITY AUDIT INTEGRATION TEST CASES PASSED SUCCESSFULLY!');
    console.log('===========================================================');
  } finally {
    if (server) {
      server.close();
    }
    await mongoose.disconnect();
  }
};

runAuthTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
