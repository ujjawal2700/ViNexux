import http from 'http';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { config } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { Category } from '../src/models/Category.js';
import { Product } from '../src/models/Product.js';
import { DealerProfile } from '../src/models/DealerProfile.js';
import { DealerPricing } from '../src/models/DealerPricing.js';
import { Cart } from '../src/models/Cart.js';
import { Enquiry } from '../src/models/Enquiry.js';

let server;
const PORT = 5015;

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

const runAdminProductTests = async () => {
  try {
    console.log('===========================================================');
    console.log('🚀 VINEXUS PHASE 7 STEP 3 - ADMIN PRODUCT MANAGEMENT API TEST SUITE');
    console.log('===========================================================\n');

    await mongoose.connect(config.mongodbUri);
    console.log('✅ Connected to MongoDB for Admin Product testing');

    server = app.listen(PORT, '127.0.0.1');
    await new Promise((r) => setTimeout(r, 500));
    console.log(`✅ Test server running on http://127.0.0.1:${PORT}\n`);

    const timestamp = Date.now();
    const customerPhone = `91${timestamp.toString().slice(-8)}`;
    const dealerPhone = `92${timestamp.toString().slice(-8)}`;
    const adminPhone = `93${timestamp.toString().slice(-8)}`;

    // 1. Account Setup
    console.log('Setting up test accounts (Customer, Dealer, Admin)...');
    const custSignup = await request('/api/auth/signup', { method: 'POST' }, {
      fullName: 'Product Test Customer',
      email: `cust_prod_${timestamp}@example.com`,
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

    const dealerSignup = await request('/api/auth/signup', { method: 'POST' }, {
      fullName: 'Product Test Dealer',
      email: `dealer_prod_${timestamp}@example.com`,
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

    const adminSignup = await request('/api/auth/signup', { method: 'POST' }, {
      fullName: 'Product Test Admin',
      email: `admin_prod_${timestamp}@example.com`,
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
    console.log('✅ Accounts created & Admin promoted successfully.\n');

    // Create Category for Product tests
    const categoryRes = await Category.create({
      name: `Pipes & Fittings ${timestamp}`,
      slug: `pipes-fittings-${timestamp}`,
      isActive: true,
    });
    const categoryId = categoryRes._id.toString();

    // Create Inactive Category for testing inactive category rejection
    const inactiveCategoryRes = await Category.create({
      name: `Obsolete Pipes ${timestamp}`,
      slug: `obsolete-pipes-${timestamp}`,
      isActive: false,
    });
    const inactiveCategoryId = inactiveCategoryRes._id.toString();

    console.log('--- CORE RBAC & PRODUCT CRUD TESTS ---');

    // TEST 1: No token -> 401
    console.log('\nTest 1: POST /api/admin/products without token (expect 401)');
    const noTokenRes = await request('/api/admin/products', { method: 'POST' }, {
      sku: `SKU-NO-TOKEN-${timestamp}`,
      name: 'No Token Product',
      categoryId,
    });
    assert(noTokenRes.status === 401, 'Returns HTTP 401 Unauthorized');

    // TEST 2: Customer token -> 403
    console.log('\nTest 2: POST /api/admin/products with Customer token (expect 403)');
    const custRes = await request('/api/admin/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
    }, {
      sku: `SKU-CUST-${timestamp}`,
      name: 'Customer Product',
      categoryId,
    });
    assert(custRes.status === 403, 'Returns HTTP 403 Forbidden for customer role');

    // TEST 3: Dealer token -> 403
    console.log('\nTest 3: POST /api/admin/products with Dealer token (expect 403)');
    const dealerRes = await request('/api/admin/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${dealerToken}` },
    }, {
      sku: `SKU-DEALER-${timestamp}`,
      name: 'Dealer Product',
      categoryId,
    });
    assert(dealerRes.status === 403, 'Returns HTTP 403 Forbidden for dealer role');

    // TEST 4: Admin create product -> 201
    console.log('\nTest 4: POST /api/admin/products with Admin token (expect 201)');
    const prodSku1 = `PVC-TEST-100-${timestamp.toString().slice(-4)}`;
    const createRes = await request('/api/admin/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    }, {
      sku: prodSku1,
      name: 'HDPE Water Pipe 100mm',
      categoryId,
      description: 'High-density polyethylene pipe for irrigation',
      images: [{ url: 'https://example.com/hdpe100.jpg', altText: 'HDPE Pipe' }],
      specifications: [{ key: 'Pressure', value: '10 Bar' }],
      standardPrice: 500,
      dealerPrice: 400,
      isFeatured: true,
      isActive: true,
    });
    assert(createRes.status === 201, 'Returns HTTP 201 Created for admin product creation');
    assert(createRes.body.data.sku === prodSku1, 'Product SKU matches');
    assert(createRes.body.data.standardPrice === 500, 'Product standardPrice matches (500)');
    assert(createRes.body.data.dealerPrice === 400, 'Product dealerPrice matches (400)');
    const prodId1 = createRes.body.data._id;

    // TEST 5: Admin list products -> 200
    console.log('\nTest 5: GET /api/admin/products?page=1&limit=20');
    const listRes = await request('/api/admin/products?page=1&limit=20', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(listRes.status === 200, 'Returns HTTP 200 OK');
    assert(Array.isArray(listRes.body.data.products), 'Products list is array');

    // TEST 6: Admin get product -> 200
    console.log('\nTest 6: GET /api/admin/products/:id');
    const getRes = await request(`/api/admin/products/${prodId1}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(getRes.status === 200, 'Returns HTTP 200 OK');
    assert(getRes.body.data._id === prodId1, 'Returned product ID matches');

    // TEST 7: Admin update product -> 200
    console.log('\nTest 7: PUT /api/admin/products/:id');
    const updateRes = await request(`/api/admin/products/${prodId1}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
    }, {
      name: 'HDPE Water Pipe 100mm Super',
      standardPrice: 550,
    });
    assert(updateRes.status === 200, 'Returns HTTP 200 OK');
    assert(updateRes.body.data.name === 'HDPE Water Pipe 100mm Super', 'Product name updated');
    assert(updateRes.body.data.standardPrice === 550, 'Standard price updated to 550');

    // TEST 8: Duplicate SKU -> rejected
    console.log('\nTest 8: POST /api/admin/products with duplicate SKU (expect 400)');
    const dupRes = await request('/api/admin/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    }, {
      sku: prodSku1,
      name: 'Duplicate Product',
      categoryId,
    });
    assert(dupRes.status === 400, 'Returns HTTP 400 Bad Request for duplicate SKU');

    // TEST 9: Invalid product ID -> rejected
    console.log('\nTest 9: GET /api/admin/products/invalid-id-123 (expect 400)');
    const invalidIdRes = await request('/api/admin/products/invalid-id-123', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(invalidIdRes.status === 400, 'Returns HTTP 400 Bad Request for invalid product ID format');

    // TEST 10: Invalid category ID -> rejected
    console.log('\nTest 10: POST /api/admin/products with invalid categoryId format (expect 400)');
    const invalidCatRes = await request('/api/admin/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    }, {
      sku: `SKU-INV-CAT-${timestamp}`,
      name: 'Invalid Category Product',
      categoryId: 'invalid-cat-id-123',
    });
    assert(invalidCatRes.status === 400, 'Returns HTTP 400 Bad Request for invalid categoryId format');

    // TEST 11: Non-existing category -> rejected
    console.log('\nTest 11: POST /api/admin/products with non-existing categoryId (expect 404)');
    const fakeCatId = new mongoose.Types.ObjectId().toString();
    const fakeCatRes = await request('/api/admin/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    }, {
      sku: `SKU-FAKE-CAT-${timestamp}`,
      name: 'Fake Category Product',
      categoryId: fakeCatId,
    });
    assert(fakeCatRes.status === 404, 'Returns HTTP 404 Not Found for non-existing category');

    // TEST 12 & 13: Admin deactivate product -> 200, verify isActive=false
    console.log('\nTest 12 & 13: DELETE /api/admin/products/:id (Deactivate product)');
    const deleteRes = await request(`/api/admin/products/${prodId1}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(deleteRes.status === 200, 'Returns HTTP 200 OK for product deactivation');
    assert(deleteRes.body.data.deactivated === true, 'deactivated flag is true');
    assert(deleteRes.body.data.product.isActive === false, 'product.isActive is false');

    // TEST 14: Public product API still works
    console.log('\nTest 14: Public GET /api/products & GET /api/products/:id');
    const publicListRes = await request('/api/products');
    assert(publicListRes.status === 200, 'Public GET /api/products returns 200 OK');

    const publicGetRes = await request(`/api/products/${prodId1}`);
    assert(publicGetRes.status === 200, 'Public GET /api/products/:id returns 200 OK');

    // Re-activate prodId1 for downstream Cart/Enquiry/DealerPricing tests
    await Product.updateOne({ _id: prodId1 }, { isActive: true, standardPrice: 500, dealerPrice: 400 });

    console.log('\n--- VERY IMPORTANT PRICE SNAPSHOT REGRESSION TESTS ---');

    // Step A & B: Add product to cart as customer (Initial Price = 500)
    console.log('Step A & B: Customer adds product (price=500) to Cart...');
    const cartAddRes = await request('/api/cart/items', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
    }, {
      productId: prodId1,
      quantity: 3,
    });
    assert(cartAddRes.status === 200, 'Cart item added successfully');

    // Step C: Confirm Cart.items.priceSnapshot contains 500
    const cartDb1 = await Cart.findOne({ userId: custVerify.body.data.user.id });
    const cartItem1 = cartDb1.items.find((i) => i.productId.toString() === prodId1);
    assert(cartItem1.priceSnapshot === 500, 'Cart item priceSnapshot is 500');

    // Step D: Admin changes product price to 750
    console.log('Step D: Admin updates product standardPrice from 500 to 750...');
    const adminPriceUpdate1 = await request(`/api/admin/products/${prodId1}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
    }, {
      standardPrice: 750,
    });
    assert(adminPriceUpdate1.status === 200, 'Product standardPrice updated to 750');

    // Step E: Existing Cart.items.priceSnapshot MUST NOT change (remains 500)
    console.log('Step E: Verifying existing Cart priceSnapshot remains 500...');
    const cartDb2 = await Cart.findOne({ userId: custVerify.body.data.user.id });
    const cartItem2 = cartDb2.items.find((i) => i.productId.toString() === prodId1);
    assert(cartItem2.priceSnapshot === 500, 'Cart priceSnapshot strictly preserved at 500 despite product price update to 750');

    // Step F & G: Create enquiry from cart -> Enquiry.items.priceShown MUST contain 500
    console.log('Step F & G: Creating Enquiry from Cart...');
    const enquiryRes = await request('/api/enquiries', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
    }, {
      contactName: 'Product Test Customer',
      contactEmail: `cust_prod_${timestamp}@example.com`,
      contactPhone: customerPhone,
    });
    assert(enquiryRes.status === 201, 'Enquiry created successfully');
    const enquiryId = enquiryRes.body.data.enquiry._id;
    const enquiryDb1 = await Enquiry.findById(enquiryId);
    const enquiryItem1 = enquiryDb1.items.find((i) => i.productId.toString() === prodId1);
    assert(enquiryItem1.priceShown === 500, 'Enquiry item priceShown strictly matches snapshot (500)');

    // Step H: Admin updates product price again to 999 -> Existing Cart & Enquiry priceShown MUST NOT change
    console.log('Step H: Admin updates product standardPrice again to 999...');
    await request(`/api/admin/products/${prodId1}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
    }, {
      standardPrice: 999,
    });
    const enquiryDb2 = await Enquiry.findById(enquiryId);
    const enquiryItem2 = enquiryDb2.items.find((i) => i.productId.toString() === prodId1);
    assert(enquiryItem2.priceShown === 500, 'Historical Enquiry priceShown strictly preserved at 500 after second product price update (999)');

    console.log('\n--- DEALER PRICING COMPATIBILITY TESTS ---');

    // Setup Approved Dealer Profile & Custom DealerPricing
    const dealerUser = await User.findOne({ phone: dealerPhone });
    const dealerProfile = await DealerProfile.create({
      userId: dealerUser._id,
      companyName: `Dealer Pipe Corp ${timestamp}`,
      gstin: `27AAAAA${timestamp.toString().slice(-4)}A1Z5`,
      pan: `AAAAA${timestamp.toString().slice(-4)}A`,
      status: 'approved',
    });
    dealerUser.accountStatus = 'active';
    dealerUser.dealerProfileId = dealerProfile._id;
    await dealerUser.save();

    // Create custom DealerPricing record (price = 250) for this product
    await DealerPricing.create({
      dealerId: dealerProfile._id,
      productId: prodId1,
      price: 250,
      moq: 10,
      isActive: true,
    });

    // Dealer adds product to cart -> should pick up custom DealerPricing (250)
    console.log('Testing Approved Dealer Cart price calculation (Custom DealerPricing)...');
    const dealerCartRes = await request('/api/cart/items', {
      method: 'POST',
      headers: { Authorization: `Bearer ${dealerToken}` },
    }, {
      productId: prodId1,
      quantity: 10,
    });
    assert(dealerCartRes.status === 200, 'Approved dealer cart add OK');
    const dealerCartDb = await Cart.findOne({ userId: dealerUser._id });
    const dealerCartItem = dealerCartDb.items.find((i) => i.productId.toString() === prodId1);
    assert(dealerCartItem.priceSnapshot === 250, 'Approved dealer custom DealerPricing snapshot (250) correctly applied');

    // Admin updates product price to 1200 -> DealerPricing record remains intact
    console.log('Testing Admin product update does not alter custom DealerPricing...');
    await request(`/api/admin/products/${prodId1}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
    }, {
      standardPrice: 1200,
    });

    const dealerPricingCheck = await DealerPricing.findOne({ dealerId: dealerProfile._id, productId: prodId1 });
    assert(dealerPricingCheck !== null && dealerPricingCheck.price === 250, 'Custom DealerPricing (250) preserved intact after admin product update');

    console.log('\n===========================================================');
    console.log('🎉 ALL ADMIN PRODUCT & PRICE SNAPSHOT REGRESSION TESTS PASSED!');
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

runAdminProductTests();
