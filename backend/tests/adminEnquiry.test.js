import http from 'http';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { config } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { Category } from '../src/models/Category.js';
import { Product } from '../src/models/Product.js';
import { Cart } from '../src/models/Cart.js';
import { Enquiry } from '../src/models/Enquiry.js';

let server;
const PORT = 5017;

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

const runAdminEnquiryTests = async () => {
  try {
    console.log('===========================================================');
    console.log('🚀 VINEXUS - ADMIN ENQUIRY / LEAD MANAGEMENT TEST SUITE');
    console.log('===========================================================\n');

    await mongoose.connect(config.mongodbUri);
    console.log('✅ Connected to MongoDB for Admin Enquiry testing');

    server = app.listen(PORT, '127.0.0.1');
    await new Promise((r) => setTimeout(r, 500));
    console.log(`✅ Test server running on http://127.0.0.1:${PORT}\n`);

    const timestamp = Date.now();
    const custPhone = `91${timestamp.toString().slice(-8)}`;
    const cust2Phone = `92${timestamp.toString().slice(-8)}`;
    const dealerPhone = `93${timestamp.toString().slice(-8)}`;
    const adminPhone = `94${timestamp.toString().slice(-8)}`;

    console.log('Setting up test accounts and catalog data...');

    // 1. Customer User 1
    const custSignup = await request('/api/auth/signup', { method: 'POST' }, {
      fullName: 'Enquiry Customer One',
      email: `cust1_enq_${timestamp}@example.com`,
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

    // 2. Customer User 2 (for authorization checks)
    const cust2Signup = await request('/api/auth/signup', { method: 'POST' }, {
      fullName: 'Enquiry Customer Two',
      email: `cust2_enq_${timestamp}@example.com`,
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

    // 3. Dealer User
    const dealerSignup = await request('/api/auth/signup', { method: 'POST' }, {
      fullName: 'Enquiry Dealer User',
      email: `dealer_enq_${timestamp}@example.com`,
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
      fullName: 'Lead Admin Manager',
      email: `admin_enq_${timestamp}@example.com`,
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

    // Create Category & Product for Cart/Enquiry operations
    const category = await Category.create({
      name: `Industrial Valves ${timestamp}`,
      slug: `industrial-valves-${timestamp}`,
      isActive: true,
    });

    const product = await Product.create({
      name: `Heavy Duty Ball Valve ${timestamp}`,
      slug: `ball-valve-${timestamp}`,
      sku: `SKU-BV-${timestamp}`,
      standardPrice: 2500,
      stockQuantity: 50,
      categoryId: category._id,
      isActive: true,
    });

    console.log('✅ Accounts & Product setup completed.\n');

    // -------------------------------------------------------------
    // SECTION A: AUTHENTICATION CHECKS (1-4)
    // -------------------------------------------------------------
    console.log('--- SECTION A: Authentication Checks ---');
    
    // 1. No token -> 401
    const noTokenRes = await request('/api/admin/enquiries', { method: 'GET' });
    assert(noTokenRes.status === 401, '1. GET /api/admin/enquiries without token returns 401');

    // 2. Customer -> 403
    const custAuthRes = await request('/api/admin/enquiries', { method: 'GET', headers: custHeaders });
    assert(custAuthRes.status === 403, '2. GET /api/admin/enquiries with customer token returns 403');

    // 3. Dealer -> 403
    const dealerAuthRes = await request('/api/admin/enquiries', { method: 'GET', headers: dealerHeaders });
    assert(dealerAuthRes.status === 403, '3. GET /api/admin/enquiries with dealer token returns 403');

    // 4. Admin -> 200
    const adminAuthRes = await request('/api/admin/enquiries', { method: 'GET', headers: adminHeaders });
    assert(adminAuthRes.status === 200, '4. GET /api/admin/enquiries with admin token returns 200');

    // Create an initial test Enquiry from Customer 1 Cart for detailed testing
    await request('/api/cart/items', { method: 'POST', headers: custHeaders }, {
      productId: product._id.toString(),
      quantity: 3,
    });

    const createEnqRes = await request('/api/enquiries', { method: 'POST', headers: custHeaders }, {
      message: 'Initial enquiry message for lead management test',
      deliveryAddress: {
        line1: '456 Commercial Street',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411001',
      },
    });
    assert(createEnqRes.status === 201, 'Customer creates enquiry from cart returns 201');
    const testEnquiryId = createEnqRes.body.data.enquiry._id;
    const testEnquiryNumber = createEnqRes.body.data.enquiry.enquiryNumber;
    assert(testEnquiryId !== undefined, 'Enquiry ID is created');

    // Verify cart is cleared after enquiry creation
    const checkCartRes = await request('/api/cart', { method: 'GET', headers: custHeaders });
    assert(checkCartRes.body.data.items.length === 0, 'Cart is cleared after successful enquiry creation');

    // -------------------------------------------------------------
    // SECTION B: LISTING & PAGINATION & FILTERS & SEARCH (5-9)
    // -------------------------------------------------------------
    console.log('\n--- SECTION B: Listing, Pagination, Filters & Search ---');

    // 5. Admin List Enquiries
    const listRes = await request('/api/admin/enquiries', { method: 'GET', headers: adminHeaders });
    assert(listRes.status === 200, '5. Admin list enquiries returns 200');
    assert(Array.isArray(listRes.body.data.enquiries), 'Enquiries array is present');

    // 6. Pagination Structure
    assert(typeof listRes.body.data.pagination === 'object', '6. Pagination object is present');
    assert(typeof listRes.body.data.pagination.currentPage === 'number', 'Pagination has currentPage');
    assert(typeof listRes.body.data.pagination.limit === 'number', 'Pagination has limit');
    assert(typeof listRes.body.data.pagination.totalItems === 'number', 'Pagination has totalItems');
    assert(typeof listRes.body.data.pagination.totalPages === 'number', 'Pagination has totalPages');

    // 7. Status Filter
    const filterStatusRes = await request('/api/admin/enquiries?status=new', { method: 'GET', headers: adminHeaders });
    assert(filterStatusRes.status === 200, '7. Filter by status=new returns 200');

    // 8. UserType Filter
    const filterUserTypeRes = await request('/api/admin/enquiries?userType=customer', { method: 'GET', headers: adminHeaders });
    assert(filterUserTypeRes.status === 200, '8. Filter by userType=customer returns 200');

    // 9. Search Filter (by enquiryNumber / contactName / contactEmail)
    const searchRes = await request(`/api/admin/enquiries?search=${testEnquiryNumber}`, { method: 'GET', headers: adminHeaders });
    assert(searchRes.status === 200, '9. Search by enquiryNumber returns 200');
    assert(searchRes.body.data.enquiries.length > 0, 'Search returned target enquiry');

    // -------------------------------------------------------------
    // SECTION C: DETAIL VIEW (10-12)
    // -------------------------------------------------------------
    console.log('\n--- SECTION C: Detail View ---');

    // 10. Valid Enquiry Detail -> 200
    const detailRes = await request(`/api/admin/enquiries/${testEnquiryId}`, { method: 'GET', headers: adminHeaders });
    assert(detailRes.status === 200, '10. GET /api/admin/enquiries/:id returns 200');
    const enqDetail = detailRes.body.data.enquiry;
    assert(enqDetail._id === testEnquiryId, 'Enquiry ID matches target');
    assert(enqDetail.contactName !== undefined, 'Contains contactName');
    assert(enqDetail.contactEmail !== undefined, 'Contains contactEmail');
    assert(enqDetail.contactPhone !== undefined, 'Contains contactPhone');
    assert(enqDetail.deliveryAddress?.city === 'Pune', 'Contains deliveryAddress');
    assert(Array.isArray(enqDetail.items) && enqDetail.items.length > 0, 'Contains items array');
    assert(enqDetail.items[0].productName === `Heavy Duty Ball Valve ${timestamp}`, 'Contains productName snapshot');
    assert(enqDetail.items[0].quantity === 3, 'Contains item quantity');
    assert(enqDetail.items[0].priceShown === 2500, 'Contains item priceShown snapshot (2500)');
    assert(enqDetail.status === 'new', 'Initial status is new');
    assert(enqDetail.userId.passwordHash === undefined, 'Security check: passwordHash is not exposed in detail view');

    // 11. Invalid ID -> 400
    const invalidIdRes = await request('/api/admin/enquiries/invalid-id-123', { method: 'GET', headers: adminHeaders });
    assert(invalidIdRes.status === 400, '11. GET /api/admin/enquiries with invalid ObjectId returns 400');

    // 12. Non-existing ID -> 404
    const fakeId = new mongoose.Types.ObjectId().toString();
    const nonExistRes = await request(`/api/admin/enquiries/${fakeId}`, { method: 'GET', headers: adminHeaders });
    assert(nonExistRes.status === 404, '12. GET /api/admin/enquiries with non-existing ObjectId returns 404');

    // -------------------------------------------------------------
    // SECTION D: STATUS TRANSITIONS & VALIDATION (13-17)
    // -------------------------------------------------------------
    console.log('\n--- SECTION D: Status Transitions & Validation ---');

    // 13. new -> contacted
    const step1Res = await request(`/api/admin/enquiries/${testEnquiryId}`, { method: 'PUT', headers: adminHeaders }, { status: 'contacted' });
    assert(step1Res.status === 200, '13. Update status new -> contacted returns 200');
    assert(step1Res.body.data.enquiry.status === 'contacted', 'Status updated to contacted');

    // 14. contacted -> in-progress
    const step2Res = await request(`/api/admin/enquiries/${testEnquiryId}`, { method: 'PUT', headers: adminHeaders }, { status: 'in-progress' });
    assert(step2Res.status === 200, '14. Update status contacted -> in-progress returns 200');
    assert(step2Res.body.data.enquiry.status === 'in-progress', 'Status updated to in-progress');

    // 15. in-progress -> closed
    const step3Res = await request(`/api/admin/enquiries/${testEnquiryId}`, { method: 'PUT', headers: adminHeaders }, { status: 'closed' });
    assert(step3Res.status === 200, '15. Update status in-progress -> closed returns 200');
    assert(step3Res.body.data.enquiry.status === 'closed', 'Status updated to closed');

    // Create a second enquiry for testing new -> spam transition
    await request('/api/cart/items', { method: 'POST', headers: custHeaders }, { productId: product._id.toString(), quantity: 1 });
    const spamEnqRes = await request('/api/enquiries', { method: 'POST', headers: custHeaders }, { message: 'Spam test' });
    const spamEnquiryId = spamEnqRes.body.data.enquiry._id;

    // 16. new -> spam
    const spamStepRes = await request(`/api/admin/enquiries/${spamEnquiryId}`, { method: 'PUT', headers: adminHeaders }, { status: 'spam' });
    assert(spamStepRes.status === 200, '16. Update status new -> spam returns 200');
    assert(spamStepRes.body.data.enquiry.status === 'spam', 'Status updated to spam');

    // 17. Invalid status or disallowed transition -> 400
    const invalidStatusRes = await request(`/api/admin/enquiries/${testEnquiryId}`, { method: 'PUT', headers: adminHeaders }, { status: 'invalid_status_value' });
    assert(invalidStatusRes.status === 400, '17. Update with invalid status enum returns 400');

    // Disallowed transition (closed -> new)
    const badTransitionRes = await request(`/api/admin/enquiries/${testEnquiryId}`, { method: 'PUT', headers: adminHeaders }, { status: 'new' });
    assert(badTransitionRes.status === 400, '17. Disallowed transition (closed -> new) returns 400');

    // -------------------------------------------------------------
    // SECTION E: ADMIN NOTES (18-20)
    // -------------------------------------------------------------
    console.log('\n--- SECTION E: Admin Notes ---');

    // 18. Add admin note
    const note1Res = await request(`/api/admin/enquiries/${testEnquiryId}`, { method: 'PUT', headers: adminHeaders }, {
      note: 'First follow-up call completed with customer. Requested product catalogue.',
    });
    assert(note1Res.status === 200, '18. Add admin note returns 200');
    assert(note1Res.body.data.enquiry.notes.length === 1, 'Notes array length is 1');
    assert(note1Res.body.data.enquiry.notes[0].note === 'First follow-up call completed with customer. Requested product catalogue.', 'Note content saved correctly');

    // 19. Verify adminId matches authenticated admin
    const noteAdminId = note1Res.body.data.enquiry.notes[0].adminId._id || note1Res.body.data.enquiry.notes[0].adminId;
    assert(noteAdminId === adminUserId, '19. Note adminId matches authenticated admin ID');

    // 20. Add second note and verify first note remains intact
    const note2Res = await request(`/api/admin/enquiries/${testEnquiryId}`, { method: 'PUT', headers: adminHeaders }, {
      adminNote: 'Second note: Discount proposal sent to customer.',
    });
    assert(note2Res.status === 200, '20. Add second admin note returns 200');
    assert(note2Res.body.data.enquiry.notes.length === 2, 'Notes array length is now 2');
    assert(note2Res.body.data.enquiry.notes[0].note === 'First follow-up call completed with customer. Requested product catalogue.', 'First note remains intact (not overwritten)');
    assert(note2Res.body.data.enquiry.notes[1].note === 'Second note: Discount proposal sent to customer.', 'Second note appended correctly');

    // Empty note validation -> 400
    const emptyNoteRes = await request(`/api/admin/enquiries/${testEnquiryId}`, { method: 'PUT', headers: adminHeaders }, { note: '   ' });
    assert(emptyNoteRes.status === 400, 'Empty whitespace note returns 400');

    // -------------------------------------------------------------
    // SECTION F: ASSIGNMENT (21-22)
    // -------------------------------------------------------------
    console.log('\n--- SECTION F: Assignment ---');

    // 21. Assign to valid admin
    const assignRes = await request(`/api/admin/enquiries/${testEnquiryId}`, { method: 'PUT', headers: adminHeaders }, {
      assignedTo: adminUserId,
    });
    assert(assignRes.status === 200, '21. Assign enquiry to valid admin returns 200');
    const assignedAdminId = assignRes.body.data.enquiry.assignedTo._id || assignRes.body.data.enquiry.assignedTo;
    assert(assignedAdminId === adminUserId, 'assignedTo field updated to admin ID');

    // 22. Assign to non-admin user (customer) -> 400
    const assignNonAdminRes = await request(`/api/admin/enquiries/${testEnquiryId}`, { method: 'PUT', headers: adminHeaders }, {
      assignedTo: custUserId,
    });
    assert(assignNonAdminRes.status === 400, '22. Assigning enquiry to non-admin user returns 400');

    // -------------------------------------------------------------
    // SECTION G: PRICE SNAPSHOT REGRESSION (23-24)
    // -------------------------------------------------------------
    console.log('\n--- SECTION G: Price Snapshot Regression ---');

    // Update Product standardPrice from 2500 to 9999 in database
    await Product.findByIdAndUpdate(product._id, { standardPrice: 9999, dealerPrice: 8888 });

    // 23. Verify Product price change DOES NOT change enquiry.items[0].priceShown
    const checkSnapshotRes = await request(`/api/admin/enquiries/${testEnquiryId}`, { method: 'GET', headers: adminHeaders });
    assert(checkSnapshotRes.status === 200, 'Fetch enquiry detail after product price modification returns 200');
    assert(checkSnapshotRes.body.data.enquiry.items[0].priceShown === 2500, '23. enquiry.items[0].priceShown remains unchanged at historical snapshot (2500)');

    // 24. Verify Admin status/note update DOES NOT change enquiry item snapshots
    await request(`/api/admin/enquiries/${testEnquiryId}`, { method: 'PUT', headers: adminHeaders }, { note: 'Third note for snapshot check' });
    const checkSnapshot2Res = await request(`/api/admin/enquiries/${testEnquiryId}`, { method: 'GET', headers: adminHeaders });
    assert(checkSnapshot2Res.body.data.enquiry.items[0].productName === `Heavy Duty Ball Valve ${timestamp}`, '24. Admin update does not modify enquiry productName');
    assert(checkSnapshot2Res.body.data.enquiry.items[0].quantity === 3, '24. Admin update does not modify enquiry quantity');
    assert(checkSnapshot2Res.body.data.enquiry.items[0].priceShown === 2500, '24. Admin update does not modify enquiry priceShown');

    // -------------------------------------------------------------
    // SECTION H: EXISTING FUNCTIONALITY & REGRESSION (25-26)
    // -------------------------------------------------------------
    console.log('\n--- SECTION H: Existing Customer/Dealer APIs Regression ---');

    // 25. Existing customer enquiry listing API
    const myEnqRes = await request('/api/enquiries', { method: 'GET', headers: custHeaders });
    assert(myEnqRes.status === 200, '25. Customer GET /api/enquiries returns 200');
    assert(Array.isArray(myEnqRes.body.data.enquiries), 'Returns customer enquiries array');

    const myEnqDetailRes = await request(`/api/enquiries/${testEnquiryId}`, { method: 'GET', headers: custHeaders });
    assert(myEnqDetailRes.status === 200, '26. Customer GET /api/enquiries/:id returns 200');

    // Customer 2 cannot access Customer 1's enquiry
    const unauthorizedEnqRes = await request(`/api/enquiries/${testEnquiryId}`, { method: 'GET', headers: cust2Headers });
    assert(unauthorizedEnqRes.status === 404, 'Customer 2 accessing Customer 1 enquiry returns 404 Not Found (Access Control)');

    // Cleanup test data
    await Category.findByIdAndDelete(category._id);
    await Product.findByIdAndDelete(product._id);
    await Cart.deleteMany({ userId: { $in: [custUserId] } });
    await Enquiry.deleteMany({ _id: { $in: [testEnquiryId, spamEnquiryId] } });
    await User.deleteMany({ _id: { $in: [custUserId, adminUserId] } });

    console.log('\n===========================================================');
    console.log('ADMIN ENQUIRY TEST SUMMARY');
    console.log('===========================================================');
    console.log(`- Total tests: ${totalTests}`);
    console.log(`- Passed: ${passed}`);
    console.log(`- Failed: ${failed}`);
    console.log(`- Warnings: ${warnings}`);
    console.log('- APIs tested:');
    console.log('  1. GET /api/admin/enquiries');
    console.log('  2. GET /api/admin/enquiries/:id');
    console.log('  3. PUT /api/admin/enquiries/:id');
    console.log('  4. PUT /api/admin/enquiries/:id/status');
    console.log('  5. POST /api/enquiries');
    console.log('  6. GET /api/enquiries');
    console.log('  7. GET /api/enquiries/:id');
    console.log('  8. POST /api/cart/items');
    console.log('  9. GET /api/cart');
    console.log('- Files changed:');
    console.log('  - src/services/enquiry.service.js');
    console.log('  - src/validators/enquiry.validator.js');
    console.log('  - src/routes/adminEnquiry.routes.js');
    console.log('  - tests/adminEnquiry.test.js');
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

runAdminEnquiryTests();
