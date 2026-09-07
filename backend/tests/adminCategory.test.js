import http from 'http';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { config } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { Category } from '../src/models/Category.js';
import { Product } from '../src/models/Product.js';

let server;
const PORT = 5014;

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

const runAdminCategoryTests = async () => {
  try {
    console.log('===========================================================');
    console.log('🚀 VINEXUS PHASE 7 STEP 2 - ADMIN CATEGORY MANAGEMENT API TEST SUITE');
    console.log('===========================================================\n');

    await mongoose.connect(config.mongodbUri);
    console.log('✅ Connected to MongoDB for Admin Category testing');

    server = app.listen(PORT, '127.0.0.1');
    await new Promise((r) => setTimeout(r, 500));
    console.log(`✅ Test server running on http://127.0.0.1:${PORT}\n`);

    const timestamp = Date.now();
    const customerPhone = `91${timestamp.toString().slice(-8)}`;
    const dealerPhone = `92${timestamp.toString().slice(-8)}`;
    const adminPhone = `93${timestamp.toString().slice(-8)}`;

    // 1. Setup Accounts
    console.log('Setting up test accounts (Customer, Dealer, Admin)...');
    const custSignup = await request('/api/auth/signup', { method: 'POST' }, {
      fullName: 'Category Test Customer',
      email: `cust_cat_${timestamp}@example.com`,
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
      fullName: 'Category Test Dealer',
      email: `dealer_cat_${timestamp}@example.com`,
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
      fullName: 'Category Test Admin',
      email: `admin_cat_${timestamp}@example.com`,
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

    console.log('--- 16 TEST SCENARIOS ---');

    // 1. No token -> 401
    console.log('\nTest 1: No token -> 401 Unauthorized');
    const noTokenRes = await request('/api/admin/categories', { method: 'POST' }, {
      name: 'No Token Category',
      slug: `no-token-${timestamp}`,
    });
    assert(noTokenRes.status === 401, 'Returns HTTP 401 Unauthorized when no token provided');

    // 2. Customer token -> 403
    console.log('\nTest 2: Customer token -> 403 Forbidden');
    const custRes = await request('/api/admin/categories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
    }, {
      name: 'Customer Category',
      slug: `customer-cat-${timestamp}`,
    });
    assert(custRes.status === 403, 'Returns HTTP 403 Forbidden for customer role');

    // 3. Dealer token -> 403
    console.log('\nTest 3: Dealer token -> 403 Forbidden');
    const dealerRes = await request('/api/admin/categories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${dealerToken}` },
    }, {
      name: 'Dealer Category',
      slug: `dealer-cat-${timestamp}`,
    });
    assert(dealerRes.status === 403, 'Returns HTTP 403 Forbidden for dealer role');

    // 4. Admin create category -> 201
    console.log('\nTest 4: Admin create category -> 201 Created');
    const cat1Slug = `ind-equip-${timestamp}`;
    const createRes = await request('/api/admin/categories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    }, {
      name: 'Industrial Equipment',
      slug: cat1Slug,
      parentId: null,
      image: 'https://example.com/ind-equip.jpg',
      description: 'Industrial equipment category description',
      isActive: true,
      sortOrder: 1,
    });
    assert(createRes.status === 201, 'Returns HTTP 201 Created for admin category creation');
    assert(createRes.body.data.name === 'Industrial Equipment', 'Created category name matches');
    assert(createRes.body.data.slug === cat1Slug, 'Created category slug matches');
    const cat1Id = createRes.body.data._id;

    // 5. Admin list categories -> 200
    console.log('\nTest 5: Admin list categories -> 200 OK');
    const listRes = await request('/api/admin/categories?page=1&limit=20&isActive=true', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(listRes.status === 200, 'Returns HTTP 200 OK for categories list');
    assert(Array.isArray(listRes.body.data.categories), 'Categories returned in array');

    // 6. Admin get category by ID -> 200
    console.log('\nTest 6: Admin get category by ID -> 200 OK');
    const getRes = await request(`/api/admin/categories/${cat1Id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(getRes.status === 200, 'Returns HTTP 200 OK for category by ID');
    assert(getRes.body.data._id === cat1Id, 'Retrieved category ID matches');

    // 7. Admin update category -> 200
    console.log('\nTest 7: Admin update category -> 200 OK');
    const updateRes = await request(`/api/admin/categories/${cat1Id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
    }, {
      name: 'Industrial Heavy Equipment',
      slug: cat1Slug,
      sortOrder: 2,
    });
    assert(updateRes.status === 200, 'Returns HTTP 200 OK for category update');
    assert(updateRes.body.data.name === 'Industrial Heavy Equipment', 'Category name updated');

    // 8. Duplicate slug -> rejected
    console.log('\nTest 8: Duplicate slug -> 400 Rejected');
    const dupRes = await request('/api/admin/categories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    }, {
      name: 'Duplicate Equipment',
      slug: cat1Slug,
    });
    assert(dupRes.status === 400, 'Returns HTTP 400 Bad Request for duplicate slug');

    // 9. Invalid category ID -> rejected
    console.log('\nTest 9: Invalid category ID -> 400 Rejected');
    const invalidIdRes = await request('/api/admin/categories/invalid-id-123', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(invalidIdRes.status === 400, 'Returns HTTP 400 Bad Request for invalid category ID format');

    // 10. Invalid parentId -> rejected
    console.log('\nTest 10: Invalid parentId -> 400 Rejected');
    const invalidParentRes = await request('/api/admin/categories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    }, {
      name: 'Subcategory Invalid Parent',
      slug: `sub-invalid-${timestamp}`,
      parentId: 'invalid-parent-id-123',
    });
    assert(invalidParentRes.status === 400, 'Returns HTTP 400 Bad Request for invalid parentId format');

    // 11. Self-parent -> rejected
    console.log('\nTest 11: Self-parent -> 400 Rejected');
    const selfParentRes = await request(`/api/admin/categories/${cat1Id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
    }, {
      parentId: cat1Id,
    });
    assert(selfParentRes.status === 400, 'Returns HTTP 400 Bad Request for self-parenting assignment');

    // Create subcategory for circular hierarchy and safe deactivation tests
    const subCatSlug = `sub-heavy-${timestamp}`;
    const subCatRes = await request('/api/admin/categories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    }, {
      name: 'Heavy Valves',
      slug: subCatSlug,
      parentId: cat1Id,
    });
    const subCatId = subCatRes.body.data._id;

    // 12. Circular parent hierarchy -> rejected
    console.log('\nTest 12: Circular parent hierarchy -> 400 Rejected');
    const circularRes = await request(`/api/admin/categories/${cat1Id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
    }, {
      parentId: subCatId,
    });
    assert(circularRes.status === 400, 'Returns HTTP 400 Bad Request for circular parent assignment');

    // 13. Admin delete/deactivate category -> 200
    console.log('\nTest 13: Admin delete/deactivate category -> 200 OK');
    const deleteSubRes = await request(`/api/admin/categories/${subCatId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(deleteSubRes.status === 200, 'Returns HTTP 200 OK for category deactivation');

    // 14. Verify deactivated category has isActive=false
    console.log('\nTest 14: Verify deactivated category has isActive=false');
    assert(deleteSubRes.body.data.deactivated === true, 'deactivated flag is true');
    assert(deleteSubRes.body.data.category.isActive === false, 'category.isActive is false');

    // 15. Category having dependent product/subcategory is safely deactivated
    console.log('\nTest 15: Category having dependent product/subcategory is safely deactivated');
    await Product.create({
      sku: `PROD-TEST-${timestamp}`,
      name: 'Industrial Valve 100',
      categoryId: cat1Id,
      standardPrice: 500,
      dealerPrice: 400,
      isActive: true,
    });

    const deleteParentRes = await request(`/api/admin/categories/${cat1Id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(deleteParentRes.status === 200, 'Returns HTTP 200 OK for category with dependencies');
    assert(deleteParentRes.body.data.category.isActive === false, 'Dependent category isActive set to false safely');
    assert(deleteParentRes.body.message.includes('safely deactivated'), 'Response message confirms safe deactivation');

    // 16. Existing public category API still works
    console.log('\nTest 16: Existing public category API still works');
    const publicListRes = await request('/api/categories');
    assert(publicListRes.status === 200, 'Public GET /api/categories returns 200 OK');

    const publicGetRes = await request(`/api/categories/${cat1Id}`);
    assert(publicGetRes.status === 200, 'Public GET /api/categories/:id returns 200 OK');
    assert(publicGetRes.body.data._id === cat1Id, 'Public category details match requested ID');

    console.log('\n===========================================================');
    console.log('🎉 ALL 16 ADMIN CATEGORY TEST CASES PASSED CLEANLY!');
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

runAdminCategoryTests();
