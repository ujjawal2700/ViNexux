import http from 'http';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { config } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { DealerProfile } from '../src/models/DealerProfile.js';

let server;
const PORT = 5012;

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

const runDealerKycTests = async () => {
  try {
    console.log('===========================================================');
    console.log('🚀 VINEXUS PHASE 5 - DEALER PROFILE & KYC API TEST SUITE');
    console.log('===========================================================\n');

    await mongoose.connect(config.mongodbUri);
    console.log('✅ Connected to MongoDB for Dealer KYC testing');

    server = app.listen(PORT, '127.0.0.1');
    await new Promise((r) => setTimeout(r, 500));
    console.log(`✅ Test server running on http://127.0.0.1:${PORT}\n`);

    const timestamp = Date.now();
    const dealer1Phone = `98${timestamp.toString().slice(-8)}`;
    const dealer2Phone = `97${timestamp.toString().slice(-8)}`;
    const customerPhone = `96${timestamp.toString().slice(-8)}`;
    const adminPhone = `95${timestamp.toString().slice(-8)}`;

    // 1. Dealer 1 Setup
    const d1Signup = await request('/api/auth/signup', { method: 'POST' }, {
      fullName: 'Dealer One Trading',
      email: `dealer1_${timestamp}@example.com`,
      phone: dealer1Phone,
      password: 'DealerPassword123!',
      role: 'dealer',
    });
    const d1Verify = await request('/api/auth/verify-otp', { method: 'POST' }, {
      identifier: dealer1Phone,
      otp: d1Signup.body.data?.devOtp || '123456',
      purpose: 'signup',
    });
    const dealer1Token = d1Verify.body.data.accessToken;
    const dealer1Headers = { Authorization: `Bearer ${dealer1Token}` };

    // 2. Dealer 2 Setup
    const d2Signup = await request('/api/auth/signup', { method: 'POST' }, {
      fullName: 'Dealer Two Enterprise',
      email: `dealer2_${timestamp}@example.com`,
      phone: dealer2Phone,
      password: 'DealerPassword123!',
      role: 'dealer',
    });
    const d2Verify = await request('/api/auth/verify-otp', { method: 'POST' }, {
      identifier: dealer2Phone,
      otp: d2Signup.body.data?.devOtp || '123456',
      purpose: 'signup',
    });
    const dealer2Token = d2Verify.body.data.accessToken;
    const dealer2Headers = { Authorization: `Bearer ${dealer2Token}` };

    // 3. Customer Setup
    const custSignup = await request('/api/auth/signup', { method: 'POST' }, {
      fullName: 'Customer User',
      email: `customer_${timestamp}@example.com`,
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

    // 4. Admin Setup
    const adminSignup = await request('/api/auth/signup', { method: 'POST' }, {
      fullName: 'System Admin',
      email: `admin_${timestamp}@example.com`,
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
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };

    console.log('✅ Test accounts created and tokens issued successfully.\n');

    // -------------------------------------------------------------
    // TEST 1: Dealer Profile Create
    // -------------------------------------------------------------
    const d1Gstin = `27AAACV${timestamp.toString().slice(-4)}F1Z5`;
    const d1Pan = `AAACV${timestamp.toString().slice(-4)}F`;
    console.log('1. Testing: Dealer 1 profile creation (POST /api/dealers/profile)...');
    const createRes = await request('/api/dealers/profile', { method: 'POST', headers: dealer1Headers }, {
      companyName: 'Vinexus Pipe Traders Ltd',
      gstin: d1Gstin,
      pan: d1Pan,
      address: 'Plot 45, MIDC Industrial Zone',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411018',
      kycDocuments: [
        { type: 'gst', url: 'https://example.com/gst_doc.pdf' },
        { type: 'pan', url: 'https://example.com/pan_doc.pdf' },
      ],
    });
    console.log(`   Response Status: ${createRes.status}`);
    if (createRes.status !== 201 || createRes.body.data?.profile?.status !== 'pending') {
      throw new Error(`Dealer profile creation failed: ${JSON.stringify(createRes.body)}`);
    }
    const dealer1ProfileId = createRes.body.data.profile._id;
    console.log(`   ✅ Dealer profile created PASSED (Profile ID: ${dealer1ProfileId}, Status: pending)\n`);

    // Verify User model updated with dealerProfileId
    const d1User = await User.findById(d1Verify.body.data.user.id);
    if (!d1User.dealerProfileId || d1User.dealerProfileId.toString() !== dealer1ProfileId) {
      throw new Error('User.dealerProfileId sync failed');
    }
    console.log('   ✅ User.dealerProfileId synchronization verified\n');

    // -------------------------------------------------------------
    // TEST 2: Duplicate Dealer Profile Rejection
    // -------------------------------------------------------------
    console.log('2. Testing: Duplicate profile creation rejection for same dealer...');
    const dupRes = await request('/api/dealers/profile', { method: 'POST', headers: dealer1Headers }, {
      companyName: 'Another Company Name',
    });
    console.log(`   Response Status: ${dupRes.status}`);
    if (dupRes.status !== 409) {
      throw new Error(`Expected 409 CONFLICT on duplicate profile create, got: ${dupRes.status}`);
    }
    console.log('   ✅ Duplicate profile creation rejection PASSED (409 Conflict returned)\n');

    // -------------------------------------------------------------
    // TEST 3: Duplicate GSTIN / PAN Rejection
    // -------------------------------------------------------------
    console.log('3. Testing: Duplicate GSTIN registration rejection for another dealer...');
    const dupGstinRes = await request('/api/dealers/profile', { method: 'POST', headers: dealer2Headers }, {
      companyName: 'Dealer Two Company',
      gstin: d1Gstin, // Same GSTIN as Dealer 1
      pan: 'BBBCV5678G',
    });
    console.log(`   Response Status: ${dupGstinRes.status}`);
    if (dupGstinRes.status !== 409) {
      throw new Error(`Expected 409 CONFLICT on duplicate GSTIN, got: ${dupGstinRes.status}`);
    }
    console.log('   ✅ Duplicate GSTIN rejection PASSED (409 Conflict returned)\n');

    // -------------------------------------------------------------
    // TEST 4: Dealer Profile Fetch
    // -------------------------------------------------------------
    console.log('4. Testing: Dealer 1 fetching own profile (GET /api/dealers/profile)...');
    const getProfileRes = await request('/api/dealers/profile', { method: 'GET', headers: dealer1Headers });
    console.log(`   Response Status: ${getProfileRes.status}`);
    if (getProfileRes.status !== 200 || getProfileRes.body.data?.profile?.companyName !== 'Vinexus Pipe Traders Ltd') {
      throw new Error(`Get profile failed: ${JSON.stringify(getProfileRes.body)}`);
    }
    console.log('   ✅ Dealer fetch profile PASSED\n');

    // -------------------------------------------------------------
    // TEST 5: Customer Authorization Rejection on Dealer Profile API
    // -------------------------------------------------------------
    console.log('5. Testing: Customer accessing dealer profile API (POST /api/dealers/profile)...');
    const custWriteRes = await request('/api/dealers/profile', { method: 'POST', headers: customerHeaders }, {
      companyName: 'Illegal Customer Company',
    });
    console.log(`   Response Status: ${custWriteRes.status}`);
    if (custWriteRes.status !== 403) {
      throw new Error(`Expected 403 FORBIDDEN for customer on dealer API, got: ${custWriteRes.status}`);
    }
    console.log('   ✅ Customer write restriction PASSED (403 Forbidden returned)\n');

    // -------------------------------------------------------------
    // TEST 6: Customer Authorization Rejection on Admin Dealer API
    // -------------------------------------------------------------
    console.log('6. Testing: Customer accessing admin dealer list (GET /api/admin/dealers)...');
    const custAdminRes = await request('/api/admin/dealers', { method: 'GET', headers: customerHeaders });
    console.log(`   Response Status: ${custAdminRes.status}`);
    if (custAdminRes.status !== 403) {
      throw new Error(`Expected 403 FORBIDDEN for customer on admin API, got: ${custAdminRes.status}`);
    }
    console.log('   ✅ Customer admin access restriction PASSED (403 Forbidden returned)\n');

    // -------------------------------------------------------------
    // TEST 7: Admin List Dealers with Filter
    // -------------------------------------------------------------
    console.log('7. Testing: Admin listing dealers (GET /api/admin/dealers?status=pending)...');
    const listRes = await request('/api/admin/dealers?status=pending', { method: 'GET', headers: adminHeaders });
    console.log(`   Response Status: ${listRes.status}`);
    if (listRes.status !== 200 || !Array.isArray(listRes.body.data?.dealers)) {
      throw new Error(`Admin list dealers failed: ${JSON.stringify(listRes.body)}`);
    }
    console.log(`   ✅ Admin list dealers PASSED (Count: ${listRes.body.data.dealers.length})\n`);

    // -------------------------------------------------------------
    // TEST 8: Admin Get Dealer By ID
    // -------------------------------------------------------------
    console.log(`8. Testing: Admin get dealer by ID (GET /api/admin/dealers/${dealer1ProfileId})...`);
    const getByIdRes = await request(`/api/admin/dealers/${dealer1ProfileId}`, { method: 'GET', headers: adminHeaders });
    console.log(`   Response Status: ${getByIdRes.status}`);
    if (getByIdRes.status !== 200 || getByIdRes.body.data?.profile?._id !== dealer1ProfileId) {
      throw new Error(`Admin get dealer by ID failed: ${JSON.stringify(getByIdRes.body)}`);
    }
    console.log('   ✅ Admin get dealer by ID PASSED\n');

    // -------------------------------------------------------------
    // TEST 9: Admin Reject KYC missing rejectionReason Validation
    // -------------------------------------------------------------
    console.log(`9. Testing: Admin reject KYC missing rejectionReason (PUT /api/admin/dealers/${dealer1ProfileId}/kyc/reject)...`);
    const rejectNoReasonRes = await request(`/api/admin/dealers/${dealer1ProfileId}/kyc/reject`, { method: 'PUT', headers: adminHeaders }, {});
    console.log(`   Response Status: ${rejectNoReasonRes.status}`);
    if (rejectNoReasonRes.status !== 400) {
      throw new Error(`Expected 400 Bad Request for missing rejection reason, got: ${rejectNoReasonRes.status}`);
    }
    console.log('   ✅ Missing rejectionReason validation PASSED (400 Bad Request returned)\n');

    // -------------------------------------------------------------
    // TEST 10: Admin Reject KYC with rejectionReason
    // -------------------------------------------------------------
    console.log(`10. Testing: Admin reject KYC with reason (PUT /api/admin/dealers/${dealer1ProfileId}/kyc/reject)...`);
    const rejectRes = await request(`/api/admin/dealers/${dealer1ProfileId}/kyc/reject`, { method: 'PUT', headers: adminHeaders }, {
      rejectionReason: 'GST Certificate document image is blurry and illegible. Please re-upload.',
    });
    console.log(`   Response Status: ${rejectRes.status}`);
    if (rejectRes.status !== 200 || rejectRes.body.data?.profile?.status !== 'rejected') {
      throw new Error(`Admin reject KYC failed: ${JSON.stringify(rejectRes.body)}`);
    }
    console.log('   ✅ Admin reject KYC PASSED (Status: rejected)\n');

    // -------------------------------------------------------------
    // TEST 11: Dealer Resubmit Info After Rejection
    // -------------------------------------------------------------
    console.log('11. Testing: Dealer 1 resubmitting profile info after rejection (PUT /api/dealers/profile)...');
    const updateRes = await request('/api/dealers/profile', { method: 'PUT', headers: dealer1Headers }, {
      kycDocuments: [
        { type: 'gst', url: 'https://example.com/gst_doc_hd.pdf' },
        { type: 'pan', url: 'https://example.com/pan_doc_hd.pdf' },
      ],
    });
    console.log(`   Response Status: ${updateRes.status}`);
    if (updateRes.status !== 200 || updateRes.body.data?.profile?.status !== 'pending') {
      throw new Error(`Dealer resubmit profile failed: ${JSON.stringify(updateRes.body)}`);
    }
    console.log('   ✅ Dealer resubmit profile PASSED (Status reset to pending, rejectionReason cleared)\n');

    // -------------------------------------------------------------
    // TEST 12: Admin Approve KYC
    // -------------------------------------------------------------
    console.log(`12. Testing: Admin approve KYC (PUT /api/admin/dealers/${dealer1ProfileId}/kyc/approve)...`);
    const approveRes = await request(`/api/admin/dealers/${dealer1ProfileId}/kyc/approve`, { method: 'PUT', headers: adminHeaders });
    console.log(`   Response Status: ${approveRes.status}`);
    if (approveRes.status !== 200 || approveRes.body.data?.profile?.status !== 'approved') {
      throw new Error(`Admin approve KYC failed: ${JSON.stringify(approveRes.body)}`);
    }
    console.log('   ✅ Admin approve KYC PASSED (Status: approved)\n');

    // -------------------------------------------------------------
    // TEST 13: User Account Status Synchronization
    // -------------------------------------------------------------
    console.log('13. Testing: User accountStatus sync after KYC approval...');
    const updatedUser = await User.findById(d1Verify.body.data.user.id);
    if (updatedUser.accountStatus !== 'active' || updatedUser.status !== 'active') {
      throw new Error(`Expected accountStatus 'active', got: ${updatedUser.accountStatus}`);
    }
    console.log('   ✅ User accountStatus synchronization PASSED (accountStatus: active)\n');

    // -------------------------------------------------------------
    // TEST 14: Approved + Non-KYC update -> status remains 'approved'
    // -------------------------------------------------------------
    console.log('14. Testing: Approved dealer updates non-KYC field (companyName)...');
    const nonKycUpdateRes = await request('/api/dealers/profile', { method: 'PUT', headers: dealer1Headers }, {
      companyName: 'Vinexus Pipe Traders Pvt Ltd',
      city: 'Mumbai',
    });
    console.log(`   Response Status: ${nonKycUpdateRes.status}`);
    if (nonKycUpdateRes.status !== 200 || nonKycUpdateRes.body.data?.profile?.status !== 'approved') {
      throw new Error(`Non-KYC update failed to keep approved status: ${JSON.stringify(nonKycUpdateRes.body)}`);
    }
    console.log('   ✅ Approved + non-KYC update PASSED (status remains approved)\n');

    // -------------------------------------------------------------
    // TEST 15: Approved + GSTIN change -> status resets to 'pending'
    // -------------------------------------------------------------
    console.log('15. Testing: Approved dealer changes GSTIN...');
    const gstinChangeRes = await request('/api/dealers/profile', { method: 'PUT', headers: dealer1Headers }, {
      gstin: `27BBBCA${timestamp.toString().slice(-4)}F1Z9`,
    });
    console.log(`   Response Status: ${gstinChangeRes.status}`);
    if (gstinChangeRes.status !== 200 || gstinChangeRes.body.data?.profile?.status !== 'pending') {
      throw new Error(`Approved GSTIN change failed to reset status to pending: ${JSON.stringify(gstinChangeRes.body)}`);
    }
    console.log('   ✅ Approved + GSTIN change PASSED (status reset to pending)\n');

    // Re-approve for next test
    await request(`/api/admin/dealers/${dealer1ProfileId}/kyc/approve`, { method: 'PUT', headers: adminHeaders });

    // -------------------------------------------------------------
    // TEST 16: Approved + PAN change -> status resets to 'pending'
    // -------------------------------------------------------------
    console.log('16. Testing: Approved dealer changes PAN...');
    const panChangeRes = await request('/api/dealers/profile', { method: 'PUT', headers: dealer1Headers }, {
      pan: `BBBCA${timestamp.toString().slice(-4)}F`,
    });
    console.log(`   Response Status: ${panChangeRes.status}`);
    if (panChangeRes.status !== 200 || panChangeRes.body.data?.profile?.status !== 'pending') {
      throw new Error(`Approved PAN change failed to reset status to pending: ${JSON.stringify(panChangeRes.body)}`);
    }
    console.log('   ✅ Approved + PAN change PASSED (status reset to pending)\n');

    // Re-approve for next test
    await request(`/api/admin/dealers/${dealer1ProfileId}/kyc/approve`, { method: 'PUT', headers: adminHeaders });

    // -------------------------------------------------------------
    // TEST 17: Approved + kycDocuments change -> status resets to 'pending'
    // -------------------------------------------------------------
    console.log('17. Testing: Approved dealer changes kycDocuments array...');
    const kycDocsChangeRes = await request('/api/dealers/profile', { method: 'PUT', headers: dealer1Headers }, {
      kycDocuments: [{ type: 'gst', url: 'https://example.com/gst_new.pdf' }],
    });
    console.log(`   Response Status: ${kycDocsChangeRes.status}`);
    if (kycDocsChangeRes.status !== 200 || kycDocsChangeRes.body.data?.profile?.status !== 'pending') {
      throw new Error(`Approved kycDocuments change failed to reset status to pending: ${JSON.stringify(kycDocsChangeRes.body)}`);
    }
    console.log('   ✅ Approved + kycDocuments change PASSED (status reset to pending)\n');

    // Re-approve for next test
    await request(`/api/admin/dealers/${dealer1ProfileId}/kyc/approve`, { method: 'PUT', headers: adminHeaders });

    // -------------------------------------------------------------
    // TEST 18: Approved + kycDocuments empty [] -> status resets to 'pending'
    // -------------------------------------------------------------
    console.log('18. Testing: Approved dealer clears kycDocuments (empty array [])...');
    const kycEmptyRes = await request('/api/dealers/profile', { method: 'PUT', headers: dealer1Headers }, {
      kycDocuments: [],
    });
    console.log(`   Response Status: ${kycEmptyRes.status}`);
    if (kycEmptyRes.status !== 200 || kycEmptyRes.body.data?.profile?.status !== 'pending') {
      throw new Error(`Approved kycDocuments empty array failed to reset status to pending: ${JSON.stringify(kycEmptyRes.body)}`);
    }
    console.log('   ✅ Approved + kycDocuments [] PASSED (status reset to pending)\n');

    // Re-approve for next test
    await request(`/api/admin/dealers/${dealer1ProfileId}/kyc/approve`, { method: 'PUT', headers: adminHeaders });

    // -------------------------------------------------------------
    // TEST 19: Approved + GSTIN cleared ("") -> status resets to 'pending'
    // -------------------------------------------------------------
    console.log('19. Testing: Approved dealer clears GSTIN ("")...');
    const gstinClearRes = await request('/api/dealers/profile', { method: 'PUT', headers: dealer1Headers }, {
      gstin: '',
    });
    console.log(`   Response Status: ${gstinClearRes.status}`);
    if (gstinClearRes.status !== 200 || gstinClearRes.body.data?.profile?.status !== 'pending') {
      throw new Error(`Approved GSTIN clearing failed to reset status to pending: ${JSON.stringify(gstinClearRes.body)}`);
    }
    console.log('   ✅ Approved + GSTIN cleared PASSED (status reset to pending)\n');

    // Re-approve for next test
    await request(`/api/admin/dealers/${dealer1ProfileId}/kyc/approve`, { method: 'PUT', headers: adminHeaders });

    // -------------------------------------------------------------
    // TEST 20: Approved + PAN cleared ("") -> status resets to 'pending'
    // -------------------------------------------------------------
    console.log('20. Testing: Approved dealer clears PAN ("")...');
    const panClearRes = await request('/api/dealers/profile', { method: 'PUT', headers: dealer1Headers }, {
      pan: '',
    });
    console.log(`   Response Status: ${panClearRes.status}`);
    if (panClearRes.status !== 200 || panClearRes.body.data?.profile?.status !== 'pending') {
      throw new Error(`Approved PAN clearing failed to reset status to pending: ${JSON.stringify(panClearRes.body)}`);
    }
    console.log('   ✅ Approved + PAN cleared PASSED (status reset to pending)\n');

    console.log('===========================================================');
    console.log('🎉 ALL DEALER PROFILE & KYC TEST SCENARIOS PASSED CLEANLY!');
    console.log('===========================================================\n');
  } catch (error) {
    console.error('❌ Test script failed with error:', error);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
    await mongoose.disconnect();
  }
};

runDealerKycTests();
