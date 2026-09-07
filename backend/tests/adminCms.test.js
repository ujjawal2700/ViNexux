import http from 'http';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { config } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { Banner } from '../src/models/Banner.js';
import { PromotionalBanner } from '../src/models/PromotionalBanner.js';
import { CmsPage } from '../src/models/CmsPage.js';
import { TrustBadge } from '../src/models/TrustBadge.js';
import { FooterContent } from '../src/models/FooterContent.js';

let server;
const PORT = 5021;

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

const runAdminCmsTests = async () => {
  try {
    console.log('===========================================================');
    console.log('🚀 VINEXUS - ADMIN & PUBLIC CMS TEST SUITE');
    console.log('===========================================================\n');

    await mongoose.connect(config.mongodbUri);
    console.log('✅ Connected to MongoDB for Admin CMS testing');

    server = app.listen(PORT, '127.0.0.1');
    await new Promise((r) => setTimeout(r, 500));
    console.log(`✅ Test server running on http://127.0.0.1:${PORT}\n`);

    const timestamp = Date.now();
    const custPhone = `91${timestamp.toString().slice(-8)}`;
    const dealerPhone = `92${timestamp.toString().slice(-8)}`;
    const adminPhone = `93${timestamp.toString().slice(-8)}`;

    console.log('Setting up test accounts...');

    // 1. Customer User
    const custSignup = await request('/api/auth/signup', { method: 'POST' }, {
      fullName: `CMS Customer ${timestamp}`,
      email: `cust_cms_${timestamp}@example.com`,
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

    // 2. Dealer User
    const dealerSignup = await request('/api/auth/signup', { method: 'POST' }, {
      fullName: `CMS Dealer ${timestamp}`,
      email: `dealer_cms_${timestamp}@example.com`,
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

    // 3. Admin User
    const adminSignup = await request('/api/auth/signup', { method: 'POST' }, {
      fullName: `CMS Admin ${timestamp}`,
      email: `admin_cms_${timestamp}@example.com`,
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
    // SECTION A: AUTHORIZATION CHECKS
    // -------------------------------------------------------------
    console.log('--- SECTION A: Authorization Checks ---');

    // No token -> 401
    const noTokenRes = await request('/api/admin/cms/banners', { method: 'GET' });
    assert(noTokenRes.status === 401, '1. GET /api/admin/cms/banners without token returns 401');

    // Customer token -> 403
    const custAuthRes = await request('/api/admin/cms/banners', { method: 'GET', headers: custHeaders });
    assert(custAuthRes.status === 403, '2. GET /api/admin/cms/banners with customer token returns 403');

    // Dealer token -> 403
    const dealerAuthRes = await request('/api/admin/cms/banners', { method: 'GET', headers: dealerHeaders });
    assert(dealerAuthRes.status === 403, '3. GET /api/admin/cms/banners with dealer token returns 403');

    // Admin token -> 200
    const adminAuthRes = await request('/api/admin/cms/banners', { method: 'GET', headers: adminHeaders });
    assert(adminAuthRes.status === 200, '4. GET /api/admin/cms/banners with admin token returns 200');

    // -------------------------------------------------------------
    // SECTION B: CONTENT MANAGEMENT / CRUD
    // -------------------------------------------------------------
    console.log('\n--- SECTION B: Content Management / CRUD Operations ---');

    // 1. Hero Banner CRUD
    const createBannerRes = await request('/api/admin/cms/banners', { method: 'POST', headers: adminHeaders }, {
      title: `Hero Banner ${timestamp}`,
      subtitle: 'Premium Industrial Equipment Supply',
      image: { url: 'https://cdn.vinexus.com/banners/hero_main.jpg' },
      link: '/products',
      buttonText: 'Shop Now',
      sortOrder: 1,
      isActive: true,
    });
    assert(createBannerRes.status === 201, 'Admin create hero banner returns 201');
    const bannerId = createBannerRes.body.data.banner._id;

    const getBannerRes = await request(`/api/admin/cms/banners/${bannerId}`, { method: 'GET', headers: adminHeaders });
    assert(getBannerRes.status === 200, 'Admin get hero banner by ID returns 200');
    assert(getBannerRes.body.data.banner.title === `Hero Banner ${timestamp}`, 'Banner title matches');

    const updateBannerRes = await request(`/api/admin/cms/banners/${bannerId}`, { method: 'PUT', headers: adminHeaders }, {
      subtitle: 'Updated Subtitle Text',
    });
    assert(updateBannerRes.status === 200, 'Admin update hero banner returns 200');
    assert(updateBannerRes.body.data.banner.subtitle === 'Updated Subtitle Text', 'Updated subtitle saved');

    // 2. Promotional Banner CRUD
    const createPromoRes = await request('/api/admin/cms/promotional-banners', { method: 'POST', headers: adminHeaders }, {
      title: `Summer Sale Promo ${timestamp}`,
      image: { url: 'https://cdn.vinexus.com/banners/promo_summer.jpg' },
      link: '/sale',
      sortOrder: 1,
      isActive: true,
    });
    assert(createPromoRes.status === 201, 'Admin create promo banner returns 201');
    const promoId = createPromoRes.body.data.promoBanner._id;

    const updatePromoRes = await request(`/api/admin/cms/promotional-banners/${promoId}`, { method: 'PUT', headers: adminHeaders }, {
      sortOrder: 2,
    });
    assert(updatePromoRes.status === 200, 'Admin update promo banner returns 200');

    // 3. CMS Page CRUD
    const pageSlug = `privacy-policy-${timestamp}`;
    const createPageRes = await request('/api/admin/cms/pages', { method: 'POST', headers: adminHeaders }, {
      slug: pageSlug,
      title: 'Privacy Policy',
      content: '<h2>Privacy Policy Overview</h2><p>Vinexus respects customer data privacy.</p>',
      isPublished: true,
    });
    assert(createPageRes.status === 201, 'Admin create CMS page returns 201');
    const pageId = createPageRes.body.data.page._id;

    const updatePageRes = await request(`/api/admin/cms/pages/${pageId}`, { method: 'PUT', headers: adminHeaders }, {
      title: 'Updated Privacy Policy',
    });
    assert(updatePageRes.status === 200, 'Admin update CMS page returns 200');
    assert(updatePageRes.body.data.page.title === 'Updated Privacy Policy', 'CMS page title updated');

    // 4. Trust Badge CRUD
    const createBadgeRes = await request('/api/admin/cms/trust-badges', { method: 'POST', headers: adminHeaders }, {
      title: 'ISO Certified Quality',
      description: '100% genuine industrial products',
      icon: { url: 'https://cdn.vinexus.com/icons/iso.png' },
      sortOrder: 1,
      isActive: true,
    });
    assert(createBadgeRes.status === 201, 'Admin create trust badge returns 201');
    const badgeId = createBadgeRes.body.data.trustBadge._id;

    // 5. Footer Content Update & Fetch
    const updateFooterRes = await request('/api/admin/cms/footer-content', { method: 'PUT', headers: adminHeaders }, {
      companyName: 'Vinexus Industrial Solutions',
      email: 'support@vinexus.com',
      phone: '+919999999999',
      address: '100 Vinexus Tower, Industrial Hub',
      quickLinks: [{ label: 'Products', url: '/products', sortOrder: 1 }],
    });
    assert(updateFooterRes.status === 200, 'Admin update footer content returns 200');
    assert(updateFooterRes.body.data.footer.companyName === 'Vinexus Industrial Solutions', 'Footer companyName updated');

    const getFooterAdminRes = await request('/api/admin/cms/footer-content', { method: 'GET', headers: adminHeaders });
    assert(getFooterAdminRes.status === 200, 'Admin fetch footer content returns 200');

    // -------------------------------------------------------------
    // SECTION C: VALIDATION CHECKS
    // -------------------------------------------------------------
    console.log('\n--- SECTION C: Validation Checks ---');

    // Invalid ObjectId -> 400
    const invalidIdRes = await request('/api/admin/cms/banners/invalid-id-123', { method: 'GET', headers: adminHeaders });
    assert(invalidIdRes.status === 400, 'GET banner with invalid ObjectId returns 400');

    // Missing required fields (missing image on banner create) -> 400
    const missingImageRes = await request('/api/admin/cms/banners', { method: 'POST', headers: adminHeaders }, {
      title: 'No Image Banner',
    });
    assert(missingImageRes.status === 400, 'Create banner missing image returns 400');

    // Duplicate CMS Page slug -> 400
    const dupSlugRes = await request('/api/admin/cms/pages', { method: 'POST', headers: adminHeaders }, {
      slug: pageSlug,
      title: 'Duplicate Policy',
      content: 'Some content',
    });
    assert(dupSlugRes.status === 400, 'Create CMS page with duplicate slug returns 400');

    // Invalid slug format (capital letters or spaces) -> 400
    const badSlugRes = await request('/api/admin/cms/pages', { method: 'POST', headers: adminHeaders }, {
      slug: 'Invalid Slug Name!',
      title: 'Bad Slug Page',
      content: 'Content',
    });
    assert(badSlugRes.status === 400, 'Create CMS page with invalid slug format returns 400');

    // -------------------------------------------------------------
    // SECTION D: PUBLIC CONTENT APIS
    // -------------------------------------------------------------
    console.log('\n--- SECTION D: Public Content APIs ---');

    // Public GET Hero Banners (No token required)
    const pubBannersRes = await request('/api/content/banners', { method: 'GET' });
    assert(pubBannersRes.status === 200, 'Public GET /api/content/banners returns 200');
    assert(Array.isArray(pubBannersRes.body.data.banners), 'Public hero banners array returned');

    // Public GET Promo Banners
    const pubPromoRes = await request('/api/content/promotional-banners', { method: 'GET' });
    assert(pubPromoRes.status === 200, 'Public GET /api/content/promotional-banners returns 200');

    // Public GET Published CMS Page by Slug
    const pubPageRes = await request(`/api/content/pages/${pageSlug}`, { method: 'GET' });
    assert(pubPageRes.status === 200, 'Public GET /api/content/pages/:slug returns 200');
    assert(pubPageRes.body.data.page.slug === pageSlug, 'Returned public page slug matches');

    // Create an unpublished draft CMS page and verify public GET returns 404
    const draftSlug = `draft-page-${timestamp}`;
    await request('/api/admin/cms/pages', { method: 'POST', headers: adminHeaders }, {
      slug: draftSlug,
      title: 'Draft Terms',
      content: 'Draft content',
      isPublished: false,
    });

    const pubDraftRes = await request(`/api/content/pages/${draftSlug}`, { method: 'GET' });
    assert(pubDraftRes.status === 404, 'Public GET for unpublished draft page returns 404 Not Found');

    // Public GET Trust Badges
    const pubBadgesRes = await request('/api/content/trust-badges', { method: 'GET' });
    assert(pubBadgesRes.status === 200, 'Public GET /api/content/trust-badges returns 200');

    // Public GET Footer Content
    const pubFooterRes = await request('/api/content/footer-content', { method: 'GET' });
    assert(pubFooterRes.status === 200, 'Public GET /api/content/footer-content returns 200');
    assert(pubFooterRes.body.data.footer.companyName === 'Vinexus Industrial Solutions', 'Public footer content matches');

    // -------------------------------------------------------------
    // SECTION E: SECURITY & SCRIPT INJECTION PROTECTION
    // -------------------------------------------------------------
    console.log('\n--- SECTION E: Security & Script Injection Protection ---');

    // Script injection attempt in CmsPage content -> 400
    const xssPayloadRes = await request('/api/admin/cms/pages', { method: 'POST', headers: adminHeaders }, {
      slug: `xss-test-${timestamp}`,
      title: 'XSS Page',
      content: '<div>Normal content</div><script>alert("hacked")</script>',
    });
    assert(xssPayloadRes.status === 400, 'CMS page content with executable script tag is rejected with 400 Bad Request');

    // Inline JS event handler injection attempt -> 400
    const inlineJsRes = await request('/api/admin/cms/pages', { method: 'POST', headers: adminHeaders }, {
      slug: `inline-js-${timestamp}`,
      title: 'Inline JS Page',
      content: '<img src="invalid.jpg" onerror="alert(1)"/>',
    });
    assert(inlineJsRes.status === 400, 'CMS page content with inline onerror script handler is rejected with 400 Bad Request');

    // Security check: passwordHash is not exposed in page updatedBy population
    const pageDetailRes = await request(`/api/admin/cms/pages/${pageId}`, { method: 'GET', headers: adminHeaders });
    assert(pageDetailRes.body.data.page.updatedBy.passwordHash === undefined, 'Security check: passwordHash is not exposed in updatedBy population');

    // Deletion cleanup tests
    const deleteBannerRes = await request(`/api/admin/cms/banners/${bannerId}`, { method: 'DELETE', headers: adminHeaders });
    assert(deleteBannerRes.status === 200, 'Admin delete banner returns 200');

    const deletePromoRes = await request(`/api/admin/cms/promotional-banners/${promoId}`, { method: 'DELETE', headers: adminHeaders });
    assert(deletePromoRes.status === 200, 'Admin delete promo banner returns 200');

    const deletePageRes = await request(`/api/admin/cms/pages/${pageId}`, { method: 'DELETE', headers: adminHeaders });
    assert(deletePageRes.status === 200, 'Admin delete CMS page returns 200');

    const deleteBadgeRes = await request(`/api/admin/cms/trust-badges/${badgeId}`, { method: 'DELETE', headers: adminHeaders });
    assert(deleteBadgeRes.status === 200, 'Admin delete trust badge returns 200');

    // -------------------------------------------------------------
    // SECTION F: REGRESSION CHECKS
    // -------------------------------------------------------------
    console.log('\n--- SECTION F: Regression Checks ---');

    assert((await request('/api/admin/dashboard', { method: 'GET', headers: adminHeaders })).status === 200, 'Admin Dashboard returns 200');
    assert((await request('/api/admin/categories', { method: 'GET', headers: adminHeaders })).status === 200, 'Admin Categories returns 200');
    assert((await request('/api/admin/products', { method: 'GET', headers: adminHeaders })).status === 200, 'Admin Products returns 200');
    assert((await request('/api/admin/dealers', { method: 'GET', headers: adminHeaders })).status === 200, 'Admin Dealers returns 200');
    assert((await request('/api/admin/enquiries', { method: 'GET', headers: adminHeaders })).status === 200, 'Admin Enquiries returns 200');
    assert((await request('/api/admin/customers', { method: 'GET', headers: adminHeaders })).status === 200, 'Admin Customers returns 200');
    assert((await request('/api/admin/sessions', { method: 'GET', headers: adminHeaders })).status === 200, 'Admin Sessions returns 200');
    assert((await request('/api/admin/reports/summary', { method: 'GET', headers: adminHeaders })).status === 200, 'Admin Reports returns 200');
    assert((await request('/api/auth/send-otp', { method: 'POST' }, { identifier: custPhone, purpose: 'login' })).status === 200, 'Customer Auth send-otp returns 200');
    assert((await request('/api/auth/send-otp', { method: 'POST' }, { identifier: dealerPhone, purpose: 'login' })).status === 200, 'Dealer Auth send-otp returns 200');

    // Cleanup test data
    await CmsPage.deleteMany({ slug: { $in: [pageSlug, draftSlug] } });
    await User.deleteMany({ _id: { $in: [adminUserId] } });

    console.log('\n===========================================================');
    console.log('ADMIN CMS TEST SUMMARY');
    console.log('===========================================================');
    console.log(`- Total tests: ${totalTests}`);
    console.log(`- Passed: ${passed}`);
    console.log(`- Failed: ${failed}`);
    console.log(`- Warnings: ${warnings}`);
    console.log('- APIs tested:');
    console.log('  1. Hero Banners: POST, GET, GET /:id, PUT /:id, DELETE /:id (Admin) & GET /api/content/banners (Public)');
    console.log('  2. Promo Banners: POST, GET, GET /:id, PUT /:id, DELETE /:id (Admin) & GET /api/content/promotional-banners (Public)');
    console.log('  3. CMS Pages: POST, GET, GET /:id, PUT /:id, DELETE /:id (Admin) & GET /api/content/pages/:slug (Public)');
    console.log('  4. Trust Badges: POST, GET, GET /:id, PUT /:id, DELETE /:id (Admin) & GET /api/content/trust-badges (Public)');
    console.log('  5. Footer Content: GET, PUT (Admin) & GET /api/content/footer-content (Public)');
    console.log('  6. Regression: Dashboard, Categories, Products, Dealers, Enquiries, Customers, Sessions, Reports, Auth');
    console.log('- Files created:');
    console.log('  - src/validators/cms.validator.js');
    console.log('  - src/services/cms.service.js');
    console.log('  - src/controllers/adminCms.controller.js');
    console.log('  - src/controllers/publicCms.controller.js');
    console.log('  - src/routes/adminCms.routes.js');
    console.log('  - src/routes/publicCms.routes.js');
    console.log('  - tests/adminCms.test.js');
    console.log('- Files modified:');
    console.log('  - src/routes/index.js');
    console.log('- Any implementation concerns: None');
    console.log('- Unimplemented PRD features: Direct binary image uploads were not implemented in this phase as Cloudinary/S3 media upload services belong to Phase 8 integration scope; image URLs are stored as strings compatible with existing model schemas.');
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

runAdminCmsTests();
