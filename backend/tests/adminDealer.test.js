import http from 'http';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { config } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { DealerProfile } from '../src/models/DealerProfile.js';
import { Product } from '../src/models/Product.js';
import { Category } from '../src/models/Category.js';
import { DealerPricing } from '../src/models/DealerPricing.js';

let server;
const PORT = 5016;

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

const runAdminDealerTests = async () => {
  try {
    console.log('===========================================================');
    console.log('🚀 VINEXUS - ADMIN DEALER & KYC API INTEGRATION TEST SUITE');
    console.log('===========================================================\n');

    await mongoose.connect(config.mongodbUri);
    console.log('✅ Connected to MongoDB for Admin Dealer testing');

    server = app.listen(PORT, '127.0.0.1');
    await new Promise((r) => setTimeout(r, 500));
    console.log(`✅ Test server running on http://127.0.0.1:${PORT}\n`);

    const timestamp = Date.now();
    const customerPhone = `91${timestamp.toString().slice(-8)}`;
    const dealerPhone = `92${timestamp.toString().slice(-8)}`;
    const adminPhone = `93${timestamp.toString().slice(-8)}`;

    // Account setups
    console.log('Setting up test accounts (Customer, Dealer, Admin)...');
    
    // 1. Customer Account
    const custSignup = await request('/api/auth/signup', { method: 'POST' }, {
      fullName: 'Dealer Admin Customer',
      email: `cust_adm_${timestamp}@example.com`,
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
    const customerHeaders = { Authorization: `Bearer ${customerToken}` };

    // 2. Dealer Account & Profile Creation
    const dealerSignup = await request('/api/auth/signup', { method: 'POST' }, {
      fullName: 'Apex Distro Manager',
      email: `dealer_adm_${timestamp}@example.com`,
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
    const dealerHeaders = { Authorization: `Bearer ${dealerToken}` };
    const dealerUserId = dealerVerify.body.data.user.id;

    // Create Dealer Profile (Status: pending)
    const createProfileRes = await request('/api/dealers/profile', { method: 'POST', headers: dealerHeaders }, {
      companyName: `Apex Distro ${timestamp}`,
      gstin: `27AAAAA${timestamp.toString().slice(-4)}A1Z5`,
      pan: `ABCDE${timestamp.toString().slice(-4)}F`,
      businessAddress: {
        street: '100 Industrial Estate',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
      kycDocuments: [
        { type: 'gst', url: 'https://cdn.vinexus.com/docs/gst_apex.pdf' },
        { type: 'pan', url: 'https://cdn.vinexus.com/docs/pan_apex.pdf' },
      ],
    });
    assert(createProfileRes.status === 201, 'Dealer profile creation returns 201');
    const dealerProfileId = createProfileRes.body.data.profile._id;

    // 3. Admin Account Setup
    const adminSignup = await request('/api/auth/signup', { method: 'POST' }, {
      fullName: 'System Administrator',
      email: `admin_adm_${timestamp}@example.com`,
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
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };
    const adminUserId = adminVerify.body.data.user.id;
    await User.updateOne({ _id: adminUserId }, { role: 'admin' });

    console.log('✅ Accounts initialized successfully.\n');

    // -------------------------------------------------------------
    // SECTION 1: GET /api/admin/dealers (Authentication & Listing)
    // -------------------------------------------------------------
    console.log('--- SECTION 1: GET /api/admin/dealers ---');
    
    // No token -> 401
    const noTokenRes = await request('/api/admin/dealers', { method: 'GET' });
    assert(noTokenRes.status === 401, 'GET /api/admin/dealers without token returns 401');

    // Customer token -> 403
    const custTokenRes = await request('/api/admin/dealers', { method: 'GET', headers: customerHeaders });
    assert(custTokenRes.status === 403, 'GET /api/admin/dealers with customer token returns 403');

    // Dealer token -> 403
    const dealerTokenRes = await request('/api/admin/dealers', { method: 'GET', headers: dealerHeaders });
    assert(dealerTokenRes.status === 403, 'GET /api/admin/dealers with dealer token returns 403');

    // Admin token -> 200
    const adminListRes = await request('/api/admin/dealers', { method: 'GET', headers: adminHeaders });
    assert(adminListRes.status === 200, 'GET /api/admin/dealers with admin token returns 200');
    assert(Array.isArray(adminListRes.body.data.dealers), 'Response contains dealers array');
    assert(typeof adminListRes.body.data.pagination === 'object', 'Response contains pagination object');
    assert(typeof adminListRes.body.data.pagination.currentPage === 'number', 'Pagination has numeric currentPage');
    assert(typeof adminListRes.body.data.pagination.limit === 'number', 'Pagination has numeric limit');
    assert(typeof adminListRes.body.data.pagination.totalItems === 'number', 'Pagination has numeric totalItems');
    assert(typeof adminListRes.body.data.pagination.totalPages === 'number', 'Pagination has numeric totalPages');

    // Security Check: passwordHash MUST NOT be exposed in list
    const sampleDealer = adminListRes.body.data.dealers[0];
    if (sampleDealer && sampleDealer.userId) {
      assert(sampleDealer.userId.passwordHash === undefined, 'Security check: passwordHash is not exposed in list');
    }

    // -------------------------------------------------------------
    // SECTION 2: GET /api/admin/dealers/:id (Detail & Validation)
    // -------------------------------------------------------------
    console.log('\n--- SECTION 2: GET /api/admin/dealers/:id ---');

    // Admin -> 200 for valid ID
    const getDetailRes = await request(`/api/admin/dealers/${dealerProfileId}`, { method: 'GET', headers: adminHeaders });
    assert(getDetailRes.status === 200, 'GET /api/admin/dealers/:id returns 200');
    assert(getDetailRes.body.data.profile._id === dealerProfileId, 'Returned profile ID matches target ID');
    assert(getDetailRes.body.data.profile.userId.passwordHash === undefined, 'Security check: passwordHash is not exposed in detail view');

    // Invalid MongoDB ID -> 400
    const invalidIdRes = await request('/api/admin/dealers/invalid-id-123', { method: 'GET', headers: adminHeaders });
    assert(invalidIdRes.status === 400, 'GET /api/admin/dealers with invalid ObjectId returns 400');

    // Non-existing dealer ID -> 404
    const fakeId = new mongoose.Types.ObjectId().toString();
    const nonExistRes = await request(`/api/admin/dealers/${fakeId}`, { method: 'GET', headers: adminHeaders });
    assert(nonExistRes.status === 404, 'GET /api/admin/dealers with non-existing ObjectId returns 404');

    // -------------------------------------------------------------
    // SECTION 3: PUT /api/admin/dealers/:id/kyc/reject (Rejection)
    // -------------------------------------------------------------
    console.log('\n--- SECTION 3: PUT /api/admin/dealers/:id/kyc/reject ---');

    // Customer/Dealer token -> 403
    const rejectCustRes = await request(`/api/admin/dealers/${dealerProfileId}/kyc/reject`, { method: 'PUT', headers: customerHeaders }, { rejectionReason: 'Reason' });
    assert(rejectCustRes.status === 403, 'Reject KYC with customer token returns 403');
    const rejectDealerRes = await request(`/api/admin/dealers/${dealerProfileId}/kyc/reject`, { method: 'PUT', headers: dealerHeaders }, { rejectionReason: 'Reason' });
    assert(rejectDealerRes.status === 403, 'Reject KYC with dealer token returns 403');

    // Missing rejectionReason -> 400
    const missingReasonRes = await request(`/api/admin/dealers/${dealerProfileId}/kyc/reject`, { method: 'PUT', headers: adminHeaders }, {});
    assert(missingReasonRes.status === 400, 'Reject KYC missing rejectionReason returns 400');

    // Empty rejectionReason -> 400
    const emptyReasonRes = await request(`/api/admin/dealers/${dealerProfileId}/kyc/reject`, { method: 'PUT', headers: adminHeaders }, { rejectionReason: '   ' });
    assert(emptyReasonRes.status === 400, 'Reject KYC empty rejectionReason returns 400');

    // Too long rejectionReason (> 500 chars) -> 400
    const tooLongReason = 'A'.repeat(501);
    const longReasonRes = await request(`/api/admin/dealers/${dealerProfileId}/kyc/reject`, { method: 'PUT', headers: adminHeaders }, { rejectionReason: tooLongReason });
    assert(longReasonRes.status === 400, 'Reject KYC rejectionReason > 500 chars returns 400');

    // Invalid dealer ID -> 400
    const rejectInvalidIdRes = await request('/api/admin/dealers/invalid-id-123/kyc/reject', { method: 'PUT', headers: adminHeaders }, { rejectionReason: 'Valid reason' });
    assert(rejectInvalidIdRes.status === 400, 'Reject KYC with invalid ObjectId returns 400');

    // Non-existing dealer -> 404
    const rejectNonExistRes = await request(`/api/admin/dealers/${fakeId}/kyc/reject`, { method: 'PUT', headers: adminHeaders }, { rejectionReason: 'Valid reason' });
    assert(rejectNonExistRes.status === 404, 'Reject KYC non-existing dealer returns 404');

    // Valid Rejection -> 200
    const validRejectRes = await request(`/api/admin/dealers/${dealerProfileId}/kyc/reject`, { method: 'PUT', headers: adminHeaders }, {
      rejectionReason: 'GST Certificate document image is blurry. Please re-upload.',
    });
    assert(validRejectRes.status === 200, 'Admin reject KYC with valid reason returns 200');
    assert(validRejectRes.body.data.profile.status === 'rejected', 'Status updated to rejected');
    assert(validRejectRes.body.data.profile.rejectionReason === 'GST Certificate document image is blurry. Please re-upload.', 'Rejection reason saved');
    assert(validRejectRes.body.data.profile.kycReviewedBy?._id === adminUserId || validRejectRes.body.data.profile.kycReviewedBy === adminUserId, 'kycReviewedBy set to admin ID');
    assert(Boolean(validRejectRes.body.data.profile.kycReviewedAt), 'kycReviewedAt timestamp set');
    assert(validRejectRes.body.data.profile.kycReviewAction === 'rejected', 'kycReviewAction set to rejected');

    // -------------------------------------------------------------
    // SECTION 4: PUT /api/admin/dealers/:id/kyc/approve (Approval)
    // -------------------------------------------------------------
    console.log('\n--- SECTION 4: PUT /api/admin/dealers/:id/kyc/approve ---');

    // Customer/Dealer token -> 403
    const approveCustRes = await request(`/api/admin/dealers/${dealerProfileId}/kyc/approve`, { method: 'PUT', headers: customerHeaders });
    assert(approveCustRes.status === 403, 'Approve KYC with customer token returns 403');
    const approveDealerRes = await request(`/api/admin/dealers/${dealerProfileId}/kyc/approve`, { method: 'PUT', headers: dealerHeaders });
    assert(approveDealerRes.status === 403, 'Approve KYC with dealer token returns 403');

    // Invalid dealer ID -> 400
    const approveInvalidIdRes = await request('/api/admin/dealers/invalid-id-123/kyc/approve', { method: 'PUT', headers: adminHeaders });
    assert(approveInvalidIdRes.status === 400, 'Approve KYC invalid ObjectId returns 400');

    // Non-existing dealer -> 404
    const approveNonExistRes = await request(`/api/admin/dealers/${fakeId}/kyc/approve`, { method: 'PUT', headers: adminHeaders });
    assert(approveNonExistRes.status === 404, 'Approve KYC non-existing dealer returns 404');

    // Valid Approval -> 200
    const validApproveRes = await request(`/api/admin/dealers/${dealerProfileId}/kyc/approve`, { method: 'PUT', headers: adminHeaders });
    assert(validApproveRes.status === 200, 'Admin approve KYC returns 200');
    assert(validApproveRes.body.data.profile.status === 'approved', 'Status updated to approved');
    assert(!validApproveRes.body.data.profile.rejectionReason, 'rejectionReason cleared');
    assert(validApproveRes.body.data.profile.kycReviewedBy?._id === adminUserId || validApproveRes.body.data.profile.kycReviewedBy === adminUserId, 'kycReviewedBy set to admin ID');
    assert(Boolean(validApproveRes.body.data.profile.kycReviewedAt), 'kycReviewedAt timestamp set');
    assert(validApproveRes.body.data.profile.kycReviewAction === 'approved', 'kycReviewAction set to approved');
    assert(validApproveRes.body.data.profile.userId.accountStatus === 'active', 'Related User accountStatus set to active');
    assert(validApproveRes.body.data.profile.userId.passwordHash === undefined, 'Security check: passwordHash is not exposed in approve response');

    // -------------------------------------------------------------
    // SECTION 5: PUT /api/admin/dealers/:id/revoke (Revocation)
    // -------------------------------------------------------------
    console.log('\n--- SECTION 5: PUT /api/admin/dealers/:id/revoke ---');

    // Customer/Dealer token -> 403
    const revokeCustRes = await request(`/api/admin/dealers/${dealerProfileId}/revoke`, { method: 'PUT', headers: customerHeaders });
    assert(revokeCustRes.status === 403, 'Revoke dealer with customer token returns 403');
    const revokeDealerRes = await request(`/api/admin/dealers/${dealerProfileId}/revoke`, { method: 'PUT', headers: dealerHeaders });
    assert(revokeDealerRes.status === 403, 'Revoke dealer with dealer token returns 403');

    // Invalid dealer ID -> 400
    const revokeInvalidIdRes = await request('/api/admin/dealers/invalid-id-123/revoke', { method: 'PUT', headers: adminHeaders });
    assert(revokeInvalidIdRes.status === 400, 'Revoke dealer invalid ObjectId returns 400');

    // Non-existing dealer -> 404
    const revokeNonExistRes = await request(`/api/admin/dealers/${fakeId}/revoke`, { method: 'PUT', headers: adminHeaders });
    assert(revokeNonExistRes.status === 404, 'Revoke dealer non-existing dealer returns 404');

    // Valid Revocation -> 200
    const validRevokeRes = await request(`/api/admin/dealers/${dealerProfileId}/revoke`, { method: 'PUT', headers: adminHeaders }, {
      reason: 'Breach of dealer compliance policies',
    });
    assert(validRevokeRes.status === 200, 'Admin revoke dealer status returns 200');
    assert(validRevokeRes.body.data.profile.status === 'rejected', 'Status reverted to non-approved (rejected)');
    assert(validRevokeRes.body.data.profile.kycReviewedBy?._id === adminUserId || validRevokeRes.body.data.profile.kycReviewedBy === adminUserId, 'kycReviewedBy set to admin ID');
    assert(Boolean(validRevokeRes.body.data.profile.kycReviewedAt), 'kycReviewedAt set');
    assert(validRevokeRes.body.data.profile.kycReviewAction === 'revoked', 'kycReviewAction set to revoked');

    // -------------------------------------------------------------
    // SECTION 6: Dealer Listing Filters & Pagination
    // -------------------------------------------------------------
    console.log('\n--- SECTION 6: Dealer Listing Filters & Pagination ---');

    // Filter status=pending
    const filterPending = await request('/api/admin/dealers?status=pending', { method: 'GET', headers: adminHeaders });
    assert(filterPending.status === 200, 'Filter status=pending returns 200');

    // Filter status=approved
    const filterApproved = await request('/api/admin/dealers?status=approved', { method: 'GET', headers: adminHeaders });
    assert(filterApproved.status === 200, 'Filter status=approved returns 200');

    // Filter status=rejected
    const filterRejected = await request('/api/admin/dealers?status=rejected', { method: 'GET', headers: adminHeaders });
    assert(filterRejected.status === 200, 'Filter status=rejected returns 200');

    // City & State filter
    const filterCityState = await request('/api/admin/dealers?city=Mumbai&state=Maharashtra', { method: 'GET', headers: adminHeaders });
    assert(filterCityState.status === 200, 'Filter by city and state returns 200');

    // Search filter
    const filterSearch = await request(`/api/admin/dealers?search=Apex`, { method: 'GET', headers: adminHeaders });
    assert(filterSearch.status === 200, 'Search filter returns 200');

    // SortBy & SortOrder
    const filterSort = await request('/api/admin/dealers?sortBy=companyName&sortOrder=asc', { method: 'GET', headers: adminHeaders });
    assert(filterSort.status === 200, 'SortBy and SortOrder query returns 200');

    // Valid Pagination page=1 & limit=5
    const filterPage = await request('/api/admin/dealers?page=1&limit=5', { method: 'GET', headers: adminHeaders });
    assert(filterPage.status === 200, 'Pagination page=1&limit=5 returns 200');
    assert(filterPage.body.data.pagination.limit === 5, 'Pagination limit matches requested limit 5');

    // Invalid limit > 100 -> 400
    const invalidLimitRes = await request('/api/admin/dealers?limit=150', { method: 'GET', headers: adminHeaders });
    assert(invalidLimitRes.status === 400, 'Query with limit > 100 returns 400');

    // Invalid page <= 0 -> 400
    const invalidPageRes = await request('/api/admin/dealers?page=0', { method: 'GET', headers: adminHeaders });
    assert(invalidPageRes.status === 400, 'Query with page=0 returns 400');

    // -------------------------------------------------------------
    // SECTION 7: Regression Checks & Pricing Verification
    // -------------------------------------------------------------
    console.log('\n--- SECTION 7: Regression & Dealer Pricing Integration ---');

    // 1. Existing Dealer Self-Service APIs
    const getProfileRes = await request('/api/dealers/profile', { method: 'GET', headers: dealerHeaders });
    assert(getProfileRes.status === 200, 'Dealer self-service GET /api/dealers/profile returns 200');

    const updateProfileRes = await request('/api/dealers/profile', { method: 'PUT', headers: dealerHeaders }, {
      companyName: `Apex Distro Updated ${timestamp}`,
    });
    assert(updateProfileRes.status === 200, 'Dealer self-service PUT /api/dealers/profile returns 200');

    // 2. Existing Auth APIs
    const sendOtpRes = await request('/api/auth/send-otp', { method: 'POST' }, {
      identifier: dealerPhone,
      purpose: 'login',
    });
    assert(sendOtpRes.status === 200, 'Auth send-otp POST /api/auth/send-otp returns 200');

    const verifyOtpRes = await request('/api/auth/verify-otp', { method: 'POST' }, {
      identifier: dealerPhone,
      otp: sendOtpRes.body.data?.devOtp || '123456',
      purpose: 'login',
    });
    assert(verifyOtpRes.status === 200, 'Auth verify-otp POST /api/auth/verify-otp returns 200');

    const meRes = await request('/api/auth/me', { method: 'GET', headers: dealerHeaders });
    assert(meRes.status === 200, 'Auth me GET /api/auth/me returns 200');

    // 3. Category & Product & Pricing Fallback Integration
    const getCatRes = await request('/api/categories', { method: 'GET' });
    assert(getCatRes.status === 200, 'Public Category API GET /api/categories returns 200');

    const getProdRes = await request('/api/products', { method: 'GET' });
    assert(getProdRes.status === 200, 'Public Product API GET /api/products returns 200');

    // Create Category & Product for pricing verification
    const category = await Category.create({
      name: `Test Wine Cat ${timestamp}`,
      slug: `wine-cat-${timestamp}`,
      description: 'Test category',
    });

    const product = await Product.create({
      name: `Premium Pinot Noir ${timestamp}`,
      slug: `pinot-noir-${timestamp}`,
      sku: `SKU-PN-${timestamp}`,
      description: 'Fine red wine',
      standardPrice: 1000,
      dealerPrice: 800,
      stockQuantity: 100,
      categoryId: category._id,
    });

    // Create custom DealerPricing record (600) for dealer Profile
    await DealerPricing.create({
      dealerId: dealerProfileId,
      productId: product._id,
      price: 600,
      moq: 1,
      isActive: true,
    });

    // Re-approve dealer for pricing check
    await request(`/api/admin/dealers/${dealerProfileId}/kyc/approve`, { method: 'PUT', headers: adminHeaders });

    // Approved dealer adds product to cart -> receives custom DealerPricing (600)
    const approveCartRes = await request('/api/cart/items', { method: 'POST', headers: dealerHeaders }, {
      productId: product._id.toString(),
      quantity: 2,
    });
    assert(approveCartRes.status === 200, 'Approved dealer adds item to cart returns 200');
    assert(approveCartRes.body.data.items[0].priceSnapshot === 600, 'Approved dealer receives custom DealerPricing snapshot (600)');

    // Revoke dealer -> price snapshot falls back strictly to standardPrice (1000)
    await request(`/api/admin/dealers/${dealerProfileId}/revoke`, { method: 'PUT', headers: adminHeaders });

    const revokeCartRes = await request('/api/cart/items', { method: 'POST', headers: dealerHeaders }, {
      productId: product._id.toString(),
      quantity: 2,
    });
    assert(revokeCartRes.status === 200, 'Revoked dealer adds item to cart returns 200');
    assert(revokeCartRes.body.data.items[0].priceSnapshot === 1000, 'Revoked dealer falls back to standardPrice snapshot (1000)');

    // Cleanup test data
    await Category.findByIdAndDelete(category._id);
    await Product.findByIdAndDelete(product._id);
    await DealerPricing.deleteMany({ dealerId: dealerProfileId });
    await DealerProfile.findByIdAndDelete(dealerProfileId);
    await User.deleteMany({ _id: { $in: [dealerUserId, adminUserId] } });

    console.log('\n===========================================================');
    console.log('ADMIN DEALER TEST SUMMARY');
    console.log('===========================================================');
    console.log(`- Total tests: ${totalTests}`);
    console.log(`- Passed: ${passed}`);
    console.log(`- Failed: ${failed}`);
    console.log(`- Warnings: ${warnings}`);
    console.log('- APIs tested:');
    console.log('  1. GET /api/admin/dealers');
    console.log('  2. GET /api/admin/dealers/:id');
    console.log('  3. PUT /api/admin/dealers/:id/kyc/approve');
    console.log('  4. PUT /api/admin/dealers/:id/kyc/reject');
    console.log('  5. PUT /api/admin/dealers/:id/revoke');
    console.log('  6. GET /api/dealers/profile');
    console.log('  7. PUT /api/dealers/profile');
    console.log('  8. POST /api/auth/send-otp & POST /api/auth/verify-otp');
    console.log('  9. GET /api/auth/me');
    console.log('  10. GET /api/categories');
    console.log('  11. GET /api/products');
    console.log('  12. POST /api/cart/items');
    console.log('- Any implementation issue found: None');
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

runAdminDealerTests();
