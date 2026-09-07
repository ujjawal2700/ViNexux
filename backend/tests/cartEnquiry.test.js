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

const runCartEnquiryPRDTests = async () => {
  try {
    console.log('===========================================================');
    console.log('🚀 VINEXUS PHASE 6 - CART & ENQUIRY PRD ALIGNMENT TEST SUITE');
    console.log('===========================================================\n');

    await mongoose.connect(config.mongodbUri);
    console.log('✅ Connected to MongoDB for Cart & Enquiry PRD testing');

    server = app.listen(PORT, '127.0.0.1');
    await new Promise((r) => setTimeout(r, 500));
    console.log(`✅ Test server running on http://127.0.0.1:${PORT}\n`);

    const timestamp = Date.now();
    const customerPhone = `94${timestamp.toString().slice(-8)}`;
    const approvedDealerPhone = `93${timestamp.toString().slice(-8)}`;
    const pendingDealerPhone = `91${timestamp.toString().slice(-8)}`;
    const adminPhone = `92${timestamp.toString().slice(-8)}`;

    // 1. Customer Setup
    const custSignup = await request('/api/auth/signup', { method: 'POST' }, {
      fullName: 'Customer Account',
      email: `cust_prd_${timestamp}@example.com`,
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

    // 2. Approved Dealer Setup
    const dealerSignup = await request('/api/auth/signup', { method: 'POST' }, {
      fullName: 'Approved Dealer',
      email: `approved_dealer_${timestamp}@example.com`,
      phone: approvedDealerPhone,
      password: 'DealerPassword123!',
      role: 'dealer',
    });
    const dealerVerify = await request('/api/auth/verify-otp', { method: 'POST' }, {
      identifier: approvedDealerPhone,
      otp: dealerSignup.body.data?.devOtp || '123456',
      purpose: 'signup',
    });
    const approvedDealerToken = dealerVerify.body.data.accessToken;
    const approvedDealerUserId = dealerVerify.body.data.user.id;
    const approvedDealerHeaders = { Authorization: `Bearer ${approvedDealerToken}` };

    const dProfile = await DealerProfile.create({
      userId: approvedDealerUserId,
      companyName: 'Vinexus Approved Dealer Ltd',
      gstin: `27AAACV${timestamp.toString().slice(-4)}F1Z5`,
      pan: `AAACV${timestamp.toString().slice(-4)}F`,
      status: 'approved',
    });

    // 3. Pending Dealer Setup
    const pendingSignup = await request('/api/auth/signup', { method: 'POST' }, {
      fullName: 'Pending Dealer',
      email: `pending_dealer_${timestamp}@example.com`,
      phone: pendingDealerPhone,
      password: 'DealerPassword123!',
      role: 'dealer',
    });
    const pendingVerify = await request('/api/auth/verify-otp', { method: 'POST' }, {
      identifier: pendingDealerPhone,
      otp: pendingSignup.body.data?.devOtp || '123456',
      purpose: 'signup',
    });
    const pendingDealerToken = pendingVerify.body.data.accessToken;
    const pendingDealerUserId = pendingVerify.body.data.user.id;
    const pendingDealerHeaders = { Authorization: `Bearer ${pendingDealerToken}` };

    await DealerProfile.create({
      userId: pendingDealerUserId,
      companyName: 'Vinexus Pending Dealer Ltd',
      gstin: `27BBBCA${timestamp.toString().slice(-4)}F1Z9`,
      pan: `BBBCA${timestamp.toString().slice(-4)}F`,
      status: 'pending',
    });

    // 4. Admin Setup
    const adminSignup = await request('/api/auth/signup', { method: 'POST' }, {
      fullName: 'System Admin',
      email: `admin_prd_${timestamp}@example.com`,
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

    console.log('✅ Test accounts created (Customer, Approved Dealer, Pending Dealer, Admin).\n');

    // Setup Category & Products
    const category = await Category.create({
      name: `PRD Category ${timestamp}`,
      slug: `prd-category-${timestamp}`,
      isActive: true,
    });

    // Product 1: Has custom DealerPricing (300)
    const productWithCustomPricing = await Product.create({
      sku: `PIPE-CUST-${timestamp.toString().slice(-4)}`,
      name: 'PVC Pipe 110mm Heavy Duty',
      categoryId: category._id,
      standardPrice: 500, // Customer price = 500
      dealerPrice: 350,   // General dealer price = 350
      isActive: true,
    });

    await DealerPricing.create({
      dealerId: dProfile._id,
      productId: productWithCustomPricing._id,
      price: 300,
      moq: 10,
      isActive: true,
    });

    // Product 2: No custom DealerPricing, falls back to dealerPrice (350)
    const productWithoutCustomPricing = await Product.create({
      sku: `PIPE-GEN-${timestamp.toString().slice(-4)}`,
      name: 'Standard PVC Elbow 90deg',
      categoryId: category._id,
      standardPrice: 200, // Customer price = 200
      dealerPrice: 140,   // General dealer price = 140
      isActive: true,
    });

    console.log('✅ Test products initialized.\n');

    // -------------------------------------------------------------
    // CHECKLIST 1: Customer -> standardPrice snapshot
    // -------------------------------------------------------------
    console.log('1. Testing: [ ] Customer -> standardPrice snapshot...');
    const custAddRes = await request('/api/cart/items', { method: 'POST', headers: customerHeaders }, {
      productId: productWithCustomPricing._id.toString(),
      quantity: 2,
    });
    console.log(`   Response Status: ${custAddRes.status}`);
    if (custAddRes.status !== 200 || custAddRes.body.data?.items[0]?.priceSnapshot !== 500) {
      throw new Error(`Customer standardPrice failed: expected 500, got ${custAddRes.body.data?.items[0]?.priceSnapshot}`);
    }
    console.log('   ✅ Customer -> standardPrice snapshot PASSED (priceSnapshot: 500)\n');

    // -------------------------------------------------------------
    // CHECKLIST 2: Approved dealer -> custom DealerPricing snapshot
    // -------------------------------------------------------------
    console.log('2. Testing: [ ] Approved dealer -> custom DealerPricing snapshot...');
    const dealerCustomAddRes = await request('/api/cart/items', { method: 'POST', headers: approvedDealerHeaders }, {
      productId: productWithCustomPricing._id.toString(),
      quantity: 5,
    });
    console.log(`   Response Status: ${dealerCustomAddRes.status}`);
    if (dealerCustomAddRes.status !== 200 || dealerCustomAddRes.body.data?.items[0]?.priceSnapshot !== 300) {
      throw new Error(`Approved dealer custom pricing failed: expected 300, got ${dealerCustomAddRes.body.data?.items[0]?.priceSnapshot}`);
    }
    console.log('   ✅ Approved dealer -> custom DealerPricing snapshot PASSED (priceSnapshot: 300)\n');

    // -------------------------------------------------------------
    // CHECKLIST 3: Approved dealer without custom price -> dealerPrice
    // -------------------------------------------------------------
    console.log('3. Testing: [ ] Approved dealer without custom price -> dealerPrice...');
    const dealerGenAddRes = await request('/api/cart/items', { method: 'POST', headers: approvedDealerHeaders }, {
      productId: productWithoutCustomPricing._id.toString(),
      quantity: 10,
    });
    console.log(`   Response Status: ${dealerGenAddRes.status}`);
    const genItem = dealerGenAddRes.body.data?.items.find(i => i.productId._id === productWithoutCustomPricing._id.toString());
    if (dealerGenAddRes.status !== 200 || genItem?.priceSnapshot !== 140) {
      throw new Error(`Approved dealer fallback dealerPrice failed: expected 140, got ${genItem?.priceSnapshot}`);
    }
    console.log('   ✅ Approved dealer without custom price -> dealerPrice PASSED (priceSnapshot: 140)\n');

    // -------------------------------------------------------------
    // CHECKLIST 4: Pending/rejected dealer -> standardPrice
    // -------------------------------------------------------------
    console.log('4. Testing: [ ] Pending/rejected dealer -> standardPrice...');
    const pendingAddRes = await request('/api/cart/items', { method: 'POST', headers: pendingDealerHeaders }, {
      productId: productWithCustomPricing._id.toString(),
      quantity: 1,
    });
    console.log(`   Response Status: ${pendingAddRes.status}`);
    if (pendingAddRes.status !== 200 || pendingAddRes.body.data?.items[0]?.priceSnapshot !== 500) {
      throw new Error(`Pending dealer standardPrice failed: expected 500, got ${pendingAddRes.body.data?.items[0]?.priceSnapshot}`);
    }
    console.log('   ✅ Pending/rejected dealer -> standardPrice PASSED (priceSnapshot: 500)\n');

    // -------------------------------------------------------------
    // CHECKLIST 7: Product price change -> old cart snapshot unchanged
    // -------------------------------------------------------------
    console.log('7. Testing: [ ] Product price change -> old cart snapshot unchanged...');
    // Update product.standardPrice in database from 500 to 999
    await Product.updateOne({ _id: productWithCustomPricing._id }, { standardPrice: 999 });
    
    // View customer cart to verify existing item's priceSnapshot is still 500
    const viewCartRes = await request('/api/cart', { method: 'GET', headers: customerHeaders });
    const cartItem = viewCartRes.body.data?.items[0];
    if (viewCartRes.status !== 200 || cartItem?.priceSnapshot !== 500) {
      throw new Error(`Product price change affected old cart snapshot! Expected 500, got ${cartItem?.priceSnapshot}`);
    }
    console.log('   ✅ Product price change -> old cart snapshot unchanged PASSED (priceSnapshot remained 500 despite product price update to 999)\n');

    // -------------------------------------------------------------
    // CHECKLIST 5: Enquiry -> productName + priceShown snapshot
    // -------------------------------------------------------------
    console.log('5. Testing: [ ] Enquiry -> productName + priceShown snapshot...');
    const createEnquiryRes = await request('/api/enquiries', { method: 'POST', headers: customerHeaders }, {
      message: 'Need urgent quote for site delivery.',
      deliveryAddress: { line1: '404 Industrial Area', city: 'Pune', state: 'Maharashtra', pincode: '411018' },
    });
    console.log(`   Response Status: ${createEnquiryRes.status}`);
    if (createEnquiryRes.status !== 201) {
      throw new Error(`Create enquiry failed: ${JSON.stringify(createEnquiryRes.body)}`);
    }

    const enq = createEnquiryRes.body.data.enquiry;
    console.log(`   Enquiry Number: ${enq.enquiryNumber}`);
    console.log(`   Product Name  : ${enq.items[0]?.productName}`);
    console.log(`   Price Shown   : ${enq.items[0]?.priceShown}`);

    if (!enq.enquiryNumber.startsWith('VNX-') || enq.items[0]?.productName !== 'PVC Pipe 110mm Heavy Duty' || enq.items[0]?.priceShown !== 500) {
      throw new Error(`Enquiry snapshot failed: ${JSON.stringify(enq)}`);
    }
    console.log('   ✅ Enquiry -> productName + priceShown snapshot PASSED\n');

    // -------------------------------------------------------------
    // CHECKLIST 6: Enquiry ke baad cart empty
    // -------------------------------------------------------------
    console.log('6. Testing: [ ] Enquiry ke baad cart empty...');
    const emptyCheckRes = await request('/api/cart', { method: 'GET', headers: customerHeaders });
    console.log(`   Response Status: ${emptyCheckRes.status}`);
    if (emptyCheckRes.body.data?.itemCount !== 0) {
      throw new Error(`Cart was not cleared post-enquiry: ${JSON.stringify(emptyCheckRes.body)}`);
    }
    console.log('   ✅ Enquiry ke baad cart empty PASSED (itemCount: 0)\n');

    // -------------------------------------------------------------
    // CHECKLIST 10: Cross-user enquiry access blocked
    // -------------------------------------------------------------
    console.log('10. Testing: [ ] Cross-user enquiry access blocked...');
    const crossAccessRes = await request(`/api/enquiries/${enq._id}`, { method: 'GET', headers: approvedDealerHeaders });
    console.log(`    Response Status: ${crossAccessRes.status}`);
    if (crossAccessRes.status !== 404) {
      throw new Error(`Expected 404 Not Found for cross-user enquiry access, got: ${crossAccessRes.status}`);
    }
    console.log('    ✅ Cross-user enquiry access blocked PASSED (404 Not Found returned)\n');

    // -------------------------------------------------------------
    // CHECKLIST 8 & 9: Enquiry status workflow & Admin note
    // -------------------------------------------------------------
    console.log('8 & 9. Testing: [ ] Enquiry status workflow & [ ] Admin note...');
    // Step A: status new -> contacted + admin note
    const s1 = await request(`/api/admin/enquiries/${enq._id}/status`, { method: 'PUT', headers: adminHeaders }, {
      status: 'contacted',
      note: 'Admin Note 1: Called customer on mobile.',
    });
    console.log(`   Status Update 1 (new -> contacted): ${s1.status}, status: ${s1.body.data?.enquiry?.status}`);
    if (s1.status !== 200 || s1.body.data?.enquiry?.status !== 'contacted' || s1.body.data?.enquiry?.notes[0]?.note !== 'Admin Note 1: Called customer on mobile.') {
      throw new Error(`Admin note 1 or status failed: ${JSON.stringify(s1.body)}`);
    }

    // Step B: status contacted -> in-progress + admin note 2
    const s2 = await request(`/api/admin/enquiries/${enq._id}/status`, { method: 'PUT', headers: adminHeaders }, {
      status: 'in-progress',
      note: 'Admin Note 2: Calculating bulk shipping cost.',
    });
    console.log(`   Status Update 2 (contacted -> in-progress): ${s2.status}, status: ${s2.body.data?.enquiry?.status}`);
    if (s2.status !== 200 || s2.body.data?.enquiry?.status !== 'in-progress' || s2.body.data?.enquiry?.notes.length !== 2) {
      throw new Error(`Admin note 2 or status failed: ${JSON.stringify(s2.body)}`);
    }

    // Step C: status in-progress -> closed + admin note 3
    const s3 = await request(`/api/admin/enquiries/${enq._id}/status`, { method: 'PUT', headers: adminHeaders }, {
      status: 'closed',
      note: 'Admin Note 3: Quotation sent and deal closed.',
    });
    console.log(`   Status Update 3 (in-progress -> closed): ${s3.status}, status: ${s3.body.data?.enquiry?.status}`);
    if (s3.status !== 200 || s3.body.data?.enquiry?.status !== 'closed' || s3.body.data?.enquiry?.notes.length !== 3) {
      throw new Error(`Admin note 3 or status failed: ${JSON.stringify(s3.body)}`);
    }
    console.log('   ✅ Enquiry status workflow & Admin note history array PASSED\n');

    console.log('===========================================================');
    console.log('🎉 ALL 10 CHECKLIST VERIFICATION ITEMS PASSED CLEANLY!');
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

runCartEnquiryPRDTests();
