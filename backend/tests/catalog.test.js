import http from 'http';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { config } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { Category } from '../src/models/Category.js';

let server;
const PORT = 5011;

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

const runCatalogTests = async () => {
  console.log('===========================================================');
  console.log('🚀 VINEXUS PHASE 4 - CATALOG API TEST SUITE (17-STEP VERIFICATION)');
  console.log('===========================================================\n');

  // Connect to MongoDB
  await mongoose.connect(config.mongodbUri);
  console.log('✅ Connected to MongoDB for catalog testing');

  // Start HTTP Server
  server = app.listen(PORT, '127.0.0.1');
  await new Promise((r) => setTimeout(r, 500));
  console.log(`✅ Test server running on http://127.0.0.1:${PORT}\n`);

  try {
    const timestamp = Date.now();

    // Setup 1: Register Customer & Dealer tokens
    const customerSignupRes = await request('/api/auth/signup', { method: 'POST' }, {
      fullName: 'Customer Test',
      email: `customer.test.${timestamp}@example.com`,
      phone: `987650${timestamp.toString().slice(-4)}`,
      password: 'CustomerPassword123!',
      role: 'customer',
    });
    const customerOtp = customerSignupRes.body.data?.devOtp || '123456';
    const customerVerifyRes = await request('/api/auth/verify-otp', { method: 'POST' }, {
      identifier: `987650${timestamp.toString().slice(-4)}`,
      otp: customerOtp,
      purpose: 'signup',
    });
    const customerToken = customerVerifyRes.body.data.accessToken;

    const dealerSignupRes = await request('/api/auth/signup', { method: 'POST' }, {
      fullName: 'Dealer Test',
      email: `dealer.test.${timestamp}@example.com`,
      phone: `912340${timestamp.toString().slice(-4)}`,
      password: 'DealerPassword123!',
      role: 'dealer',
    });
    const dealerOtp = dealerSignupRes.body.data?.devOtp || '123456';
    const dealerVerifyRes = await request('/api/auth/verify-otp', { method: 'POST' }, {
      identifier: `912340${timestamp.toString().slice(-4)}`,
      otp: dealerOtp,
      purpose: 'signup',
    });
    const dealerToken = dealerVerifyRes.body.data.accessToken;

    // Setup 2: Register Admin token
    const adminSignupRes = await request('/api/auth/signup', { method: 'POST' }, {
      fullName: 'Admin Test',
      email: `admin.test.${timestamp}@example.com`,
      phone: `998870${timestamp.toString().slice(-4)}`,
      password: 'AdminPassword123!',
      role: 'customer',
    });
    const adminOtp = adminSignupRes.body.data?.devOtp || '123456';
    const adminVerifyRes = await request('/api/auth/verify-otp', { method: 'POST' }, {
      identifier: `998870${timestamp.toString().slice(-4)}`,
      otp: adminOtp,
      purpose: 'signup',
    });
    const adminToken = adminVerifyRes.body.data.accessToken;
    const adminUserId = adminVerifyRes.body.data.user.id;

    // Set role to 'admin' in MongoDB directly
    await User.updateOne({ _id: adminUserId }, { role: 'admin' });

    const adminHeaders = { Authorization: `Bearer ${adminToken}` };
    const customerHeaders = { Authorization: `Bearer ${customerToken}` };
    const dealerHeaders = { Authorization: `Bearer ${dealerToken}` };

    console.log('✅ Test accounts setup complete: Admin, Customer, Dealer tokens ready.\n');

    let catId1, catId2, productId1;

    // -------------------------------------------------------------
    // TEST 1: Category Create
    // -------------------------------------------------------------
    console.log('1. Testing: Category Create (POST /api/categories as ADMIN)...');
    const catCreateRes = await request('/api/categories', { method: 'POST', headers: adminHeaders }, {
      name: `Pipes & Fittings ${timestamp}`,
      description: 'Industrial PVC and Steel Pipes',
      sortOrder: 1,
    });
    console.log(`   Response Status: ${catCreateRes.status}`);
    if (catCreateRes.status !== 201 || !catCreateRes.body.data?._id) {
      throw new Error(`Category Create failed: ${JSON.stringify(catCreateRes.body)}`);
    }
    catId1 = catCreateRes.body.data._id;
    console.log(`   ✅ Category Create PASSED (ID: ${catId1})\n`);

    // -------------------------------------------------------------
    // TEST 2: Category List
    // -------------------------------------------------------------
    console.log('2. Testing: Category List (GET /api/categories)...');
    const catListRes = await request('/api/categories?page=1&limit=20&sortBy=sortOrder&sortOrder=asc');
    console.log(`   Response Status: ${catListRes.status}`);
    if (catListRes.status !== 200 || !Array.isArray(catListRes.body.data?.categories)) {
      throw new Error(`Category List failed: ${JSON.stringify(catListRes.body)}`);
    }
    console.log(`   ✅ Category List PASSED (Total: ${catListRes.body.data?.pagination?.total})\n`);

    // -------------------------------------------------------------
    // TEST 3: Category Get by ID
    // -------------------------------------------------------------
    console.log(`3. Testing: Category Get by ID (GET /api/categories/${catId1})...`);
    const catGetRes = await request(`/api/categories/${catId1}`);
    console.log(`   Response Status: ${catGetRes.status}`);
    if (catGetRes.status !== 200 || catGetRes.body.data?._id !== catId1) {
      throw new Error(`Category Get by ID failed: ${JSON.stringify(catGetRes.body)}`);
    }
    console.log(`   ✅ Category Get by ID PASSED\n`);

    // -------------------------------------------------------------
    // TEST 4: Category Update
    // -------------------------------------------------------------
    console.log(`4. Testing: Category Update (PUT /api/categories/${catId1})...`);
    const catUpdateRes = await request(`/api/categories/${catId1}`, { method: 'PUT', headers: adminHeaders }, {
      description: 'Updated Pipes description',
      sortOrder: 5,
    });
    console.log(`   Response Status: ${catUpdateRes.status}`);
    if (catUpdateRes.status !== 200 || catUpdateRes.body.data?.sortOrder !== 5) {
      throw new Error(`Category Update failed: ${JSON.stringify(catUpdateRes.body)}`);
    }
    console.log(`   ✅ Category Update PASSED\n`);

    // -------------------------------------------------------------
    // TEST 5: Category hierarchy
    // -------------------------------------------------------------
    console.log('5. Testing: Category hierarchy (Subcategory creation with parentId)...');
    const childCatRes = await request('/api/categories', { method: 'POST', headers: adminHeaders }, {
      name: `PVC Pipes ${timestamp}`,
      parentId: catId1,
      sortOrder: 2,
    });
    console.log(`   Response Status: ${childCatRes.status}`);
    if (childCatRes.status !== 201 || childCatRes.body.data?.parentId !== catId1) {
      throw new Error(`Category hierarchy failed: ${JSON.stringify(childCatRes.body)}`);
    }
    catId2 = childCatRes.body.data._id;
    console.log(`   ✅ Category hierarchy PASSED (Subcategory ID: ${catId2})\n`);

    // -------------------------------------------------------------
    // TEST 6: Circular hierarchy rejection
    // -------------------------------------------------------------
    console.log(`6. Testing: Circular hierarchy rejection (Assigning child ${catId2} as parent of ${catId1})...`);
    const circularRes = await request(`/api/categories/${catId1}`, { method: 'PUT', headers: adminHeaders }, {
      parentId: catId2,
    });
    console.log(`   Response Status: ${circularRes.status}`);
    if (circularRes.status === 400 && !circularRes.body.success) {
      console.log(`   ✅ Circular hierarchy rejection PASSED (400 Bad Request returned)\n`);
    } else {
      throw new Error(`Expected 400 for circular hierarchy, got: ${circularRes.status}`);
    }

    // -------------------------------------------------------------
    // TEST 7: Category soft delete
    // -------------------------------------------------------------
    console.log(`7. Testing: Category soft delete (DELETE /api/categories/${catId2})...`);
    const catDeleteRes = await request(`/api/categories/${catId2}`, { method: 'DELETE', headers: adminHeaders });
    console.log(`   Response Status: ${catDeleteRes.status}`);
    if (catDeleteRes.status !== 200 || catDeleteRes.body.data?.category?.isActive !== false) {
      throw new Error(`Category soft delete failed: ${JSON.stringify(catDeleteRes.body)}`);
    }
    console.log(`   ✅ Category soft delete PASSED (isActive = false)\n`);

    // Re-activate child category for product tests
    await Category.updateOne({ _id: catId2 }, { isActive: true });

    // -------------------------------------------------------------
    // TEST 8: Product Create
    // -------------------------------------------------------------
    const productSku1 = `PVC-PIPE-100-${timestamp.toString().slice(-4)}`;
    console.log(`8. Testing: Product Create (POST /api/products as ADMIN)...`);
    const prodCreateRes = await request('/api/products', { method: 'POST', headers: adminHeaders }, {
      sku: productSku1,
      name: `Heavy Duty PVC Pipe 100mm ${timestamp}`,
      categoryId: catId2,
      description: 'High pressure PVC pipe for drainage and water transport',
      images: [{ url: 'https://example.com/pvc1.jpg', altText: 'PVC Pipe', sortOrder: 1 }],
      specifications: [{ key: 'Diameter', value: '100mm' }, { key: 'Length', value: '6 Meters' }],
      isFeatured: true,
      isActive: true,
    });
    console.log(`   Response Status: ${prodCreateRes.status}`);
    if (prodCreateRes.status !== 201 || !prodCreateRes.body.data?._id) {
      throw new Error(`Product Create failed: ${JSON.stringify(prodCreateRes.body)}`);
    }
    productId1 = prodCreateRes.body.data._id;
    console.log(`   ✅ Product Create PASSED (Product ID: ${productId1}, SKU: ${prodCreateRes.body.data?.sku})\n`);

    // -------------------------------------------------------------
    // TEST 9: Product List
    // -------------------------------------------------------------
    console.log('9. Testing: Product List (GET /api/products)...');
    const prodListRes = await request('/api/products?page=1&limit=20&sortBy=createdAt&sortOrder=desc');
    console.log(`   Response Status: ${prodListRes.status}`);
    if (prodListRes.status !== 200 || !Array.isArray(prodListRes.body.data?.products)) {
      throw new Error(`Product List failed: ${JSON.stringify(prodListRes.body)}`);
    }
    console.log(`   ✅ Product List PASSED (Total: ${prodListRes.body.data?.pagination?.total})\n`);

    // -------------------------------------------------------------
    // TEST 10: Product Search
    // -------------------------------------------------------------
    console.log(`10. Testing: Product Search (GET /api/products?search=PVC%20Pipe)...`);
    const prodSearchRes = await request('/api/products?search=PVC%20Pipe');
    console.log(`   Response Status: ${prodSearchRes.status}`);
    if (prodSearchRes.status !== 200 || prodSearchRes.body.data?.products?.length < 1) {
      throw new Error(`Product Search failed: ${JSON.stringify(prodSearchRes.body)}`);
    }
    console.log(`   ✅ Product Search PASSED (Matches found: ${prodSearchRes.body.data?.products?.length})\n`);

    // -------------------------------------------------------------
    // TEST 11: Product Filter
    // -------------------------------------------------------------
    console.log(`11. Testing: Product Filter (GET /api/products?categoryId=${catId2}&isFeatured=true&isActive=true)...`);
    const prodFilterRes = await request(`/api/products?categoryId=${catId2}&isFeatured=true&isActive=true`);
    console.log(`   Response Status: ${prodFilterRes.status}`);
    if (prodFilterRes.status !== 200 || prodFilterRes.body.data?.products?.length < 1) {
      throw new Error(`Product Filter failed: ${JSON.stringify(prodFilterRes.body)}`);
    }
    console.log(`   ✅ Product Filter PASSED\n`);

    // -------------------------------------------------------------
    // TEST 12: Product Get by ID
    // -------------------------------------------------------------
    console.log(`12. Testing: Product Get by ID (GET /api/products/${productId1})...`);
    const prodGetRes = await request(`/api/products/${productId1}`);
    console.log(`   Response Status: ${prodGetRes.status}`);
    if (prodGetRes.status !== 200 || prodGetRes.body.data?._id !== productId1) {
      throw new Error(`Product Get by ID failed: ${JSON.stringify(prodGetRes.body)}`);
    }
    console.log(`   ✅ Product Get by ID PASSED (Category: ${prodGetRes.body.data?.categoryId?.name})\n`);

    // -------------------------------------------------------------
    // TEST 13: Product Update
    // -------------------------------------------------------------
    console.log(`13. Testing: Product Update (PUT /api/products/${productId1})...`);
    const prodUpdateRes = await request(`/api/products/${productId1}`, { method: 'PUT', headers: adminHeaders }, {
      description: 'Updated PVC pipe specifications',
      isFeatured: false,
    });
    console.log(`   Response Status: ${prodUpdateRes.status}`);
    if (prodUpdateRes.status !== 200 || prodUpdateRes.body.data?.isFeatured !== false) {
      throw new Error(`Product Update failed: ${JSON.stringify(prodUpdateRes.body)}`);
    }
    console.log(`   ✅ Product Update PASSED\n`);

    // -------------------------------------------------------------
    // TEST 14: Product soft delete
    // -------------------------------------------------------------
    console.log(`14. Testing: Product soft delete (DELETE /api/products/${productId1})...`);
    const prodDeleteRes = await request(`/api/products/${productId1}`, { method: 'DELETE', headers: adminHeaders });
    console.log(`   Response Status: ${prodDeleteRes.status}`);
    if (prodDeleteRes.status !== 200 || prodDeleteRes.body.data?.product?.isActive !== false) {
      throw new Error(`Product soft delete failed: ${JSON.stringify(prodDeleteRes.body)}`);
    }
    console.log(`   ✅ Product soft delete PASSED (isActive = false)\n`);

    // -------------------------------------------------------------
    // TEST 15: Inactive category -> product creation rejection
    // -------------------------------------------------------------
    const inactiveCatRes = await request('/api/categories', { method: 'POST', headers: adminHeaders }, {
      name: `Inactive Cat ${timestamp}`,
      isActive: false,
    });
    const inactiveCatId = inactiveCatRes.body.data._id;

    console.log(`15. Testing: Inactive category -> product creation rejection (expect 400)...`);
    const inactiveCatProdRes = await request('/api/products', { method: 'POST', headers: adminHeaders }, {
      sku: `REJECT-SKU-${timestamp.toString().slice(-4)}`,
      name: `Product on Inactive Cat ${timestamp}`,
      categoryId: inactiveCatId,
    });
    console.log(`   Response Status: ${inactiveCatProdRes.status}`);
    if (inactiveCatProdRes.status === 400 && !inactiveCatProdRes.body.success) {
      console.log(`   ✅ Inactive category -> product creation rejection PASSED (400 Bad Request returned)\n`);
    } else {
      throw new Error(`Expected 400 for product creation on inactive category, got: ${inactiveCatProdRes.status}`);
    }

    // -------------------------------------------------------------
    // TEST 16: Customer/dealer -> category/product write API -> 403
    // -------------------------------------------------------------
    console.log('16. Testing: Customer/dealer -> category/product write API -> 403...');
    const customerCatRes = await request('/api/categories', { method: 'POST', headers: customerHeaders }, {
      name: `Unauthorized Category ${timestamp}`,
    });
    const dealerProdRes = await request('/api/products', { method: 'POST', headers: dealerHeaders }, {
      sku: `UNAUTH-SKU-${timestamp.toString().slice(-4)}`,
      name: `Unauthorized Product ${timestamp}`,
      categoryId: catId1,
    });

    console.log(`   Customer POST /api/categories Status: ${customerCatRes.status}`);
    console.log(`   Dealer POST /api/products Status: ${dealerProdRes.status}`);

    if (customerCatRes.status === 403 && dealerProdRes.status === 403) {
      console.log(`   ✅ Customer/dealer write API rejection PASSED (403 Forbidden returned for both)\n`);
    } else {
      throw new Error(`Expected 403 for non-admin write requests, got Customer: ${customerCatRes.status}, Dealer: ${dealerProdRes.status}`);
    }

    // -------------------------------------------------------------
    // TEST 17: Admin -> category/product write API -> success
    // -------------------------------------------------------------
    console.log('17. Testing: Admin -> category/product write API -> success...');
    const adminCatRes = await request('/api/categories', { method: 'POST', headers: adminHeaders }, {
      name: `Admin Category ${timestamp}`,
    });
    const adminProdRes = await request('/api/products', { method: 'POST', headers: adminHeaders }, {
      sku: `ADMIN-SKU-${timestamp.toString().slice(-4)}`,
      name: `Admin Product ${timestamp}`,
      categoryId: catId1,
    });

    console.log(`   Admin POST /api/categories Status: ${adminCatRes.status}`);
    console.log(`   Admin POST /api/products Status: ${adminProdRes.status}`);

    if (adminCatRes.status === 201 && adminProdRes.status === 201) {
      console.log(`   ✅ Admin write API authorization PASSED (201 Created returned for both)\n`);
    } else {
      throw new Error(`Expected 201 for admin write requests, got Cat: ${adminCatRes.status}, Prod: ${adminProdRes.status}`);
    }

    console.log('===========================================================');
    console.log('🎉 ALL 17 TEST CASES IN SPECIFIED ORDER PASSED CLEANLY!');
    console.log('===========================================================');
  } finally {
    if (server) {
      server.close();
    }
    await mongoose.disconnect();
  }
};

runCatalogTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
