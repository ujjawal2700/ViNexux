import mongoose from 'mongoose';
import { User } from './models/User.js';
import { DealerProfile } from './models/DealerProfile.js';
import { Category } from './models/Category.js';
import { Product } from './models/Product.js';
import { Banner } from './models/Banner.js';
import { PromotionalBanner } from './models/PromotionalBanner.js';
import { TrustBadge } from './models/TrustBadge.js';
import { FooterContent } from './models/FooterContent.js';
import { CmsPage } from './models/CmsPage.js';

async function seed() {
  const mongodbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vinexus';
  await mongoose.connect(mongodbUri);
  console.log(`[Seed] Connected to MongoDB database at [${mongodbUri}]`);

  // --- 1. USER ACCOUNTS ---
  console.log('[Seed] Seeding User Accounts...');
  const usersData = [
    {
      fullName: 'Customer Account',
      name: 'Customer Account',
      email: 'customer@vinexus.com',
      phone: '8209224481',
      role: 'customer',
      accountStatus: 'active',
      status: 'active',
      isPhoneVerified: true,
      isEmailVerified: true,
    },
    {
      fullName: 'System Administrator',
      name: 'System Administrator',
      email: 'admin@vinexus.com',
      phone: '8949940610',
      role: 'admin',
      accountStatus: 'active',
      status: 'active',
      isPhoneVerified: true,
      isEmailVerified: true,
    },
    {
      fullName: 'Dealer Partner',
      name: 'Dealer Partner',
      email: 'dealer@vinexus.com',
      phone: '8769959424',
      role: 'dealer',
      accountStatus: 'active',
      status: 'active',
      isPhoneVerified: true,
      isEmailVerified: true,
    },
  ];

  for (const uData of usersData) {
    let existing = await User.findOne({ email: uData.email });
    if (!existing) {
      existing = await User.findOne({ phone: uData.phone });
    }

    let user;
    if (existing) {
      Object.assign(existing, uData);
      user = await existing.save();
      console.log(`  ✓ Updated user: ${user.email} (${user.role})`);
    } else {
      user = await User.create(uData);
      console.log(`  ✓ Created user: ${user.email} (${user.role})`);
    }

    if (user.role === 'dealer') {
      let existingDp = await DealerProfile.findOne({ userId: user._id });
      if (existingDp) {
        existingDp.status = 'approved';
        await existingDp.save();
        console.log(`  ✓ Approved DealerProfile for: ${user.email}`);
      } else {
        const dp = await DealerProfile.create({
          userId: user._id,
          companyName: 'Vinexus Wholesale Security Solutions',
          gstin: '27ABCDE1234F1Z5',
          pan: 'ABCDE1234F',
          address: '108 Commercial Security Plaza',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          status: 'approved',
        });
        user.dealerProfileId = dp._id;
        await user.save();
        console.log(`  ✓ Created approved DealerProfile for: ${user.email}`);
      }
    }
  }

  // --- 2. CATEGORIES ---
  console.log('[Seed] Seeding Product Categories...');
  const categoriesData = [
    {
      name: 'CCTV Cameras',
      slug: 'cctv-cameras',
      image: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=600&q=80',
      description: 'High-definition IP dome, bullet, and PTZ security cameras with night vision and smart AI detection.',
      sortOrder: 1,
      isActive: true,
    },
    {
      name: 'DVRs & NVRs',
      slug: 'dvrs-nvrs',
      image: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=600&q=80',
      description: '4-channel to 64-channel Network Video Recorders and Digital Video Recorders with H.265+ compression.',
      sortOrder: 2,
      isActive: true,
    },
    {
      name: 'Network Switches & Cables',
      slug: 'switches-cables',
      image: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=600&q=80',
      description: 'Gigabit PoE+ switches, CAT6 ethernet copper cabling, and fiber optic network extenders.',
      sortOrder: 3,
      isActive: true,
    },
    {
      name: 'Accessories & Power Supplies',
      slug: 'accessories',
      image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80',
      description: 'SMPS power supply units, BNC connectors, PoE injectors, brackets, and surveillance hard drives.',
      sortOrder: 4,
      isActive: true,
    },
  ];

  const categoryMap = {};
  for (const catData of categoriesData) {
    let cat = await Category.findOne({ slug: catData.slug });
    if (cat) {
      Object.assign(cat, catData);
      cat = await cat.save();
    } else {
      cat = await Category.create(catData);
    }
    categoryMap[cat.slug] = cat._id;
    console.log(`  ✓ Category: ${cat.name} (${cat.slug})`);
  }

  // --- 3. PRODUCTS ---
  console.log('[Seed] Seeding Products...');
  const productsData = [
    {
      sku: 'CAM-4K-DOME-01',
      name: 'Vinexus 4K UltraHD AI IP Dome Camera',
      slug: 'vinexus-4k-ultrahd-ai-ip-dome-camera',
      categoryId: categoryMap['cctv-cameras'],
      description: 'Industrial-grade 4K 8MP outdoor IP dome camera featuring Sony Starvis sensor, 30m IR night vision, IP67 weatherproof housing, and built-in AI perimeter protection with human/vehicle classification.',
      standardPrice: 4999,
      dealerPrice: 3499,
      isFeatured: true,
      isActive: true,
      images: [
        {
          url: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=800&q=80',
          altText: 'Vinexus 4K UltraHD AI IP Dome Camera Front View',
          sortOrder: 0,
        },
      ],
      specifications: [
        { key: 'Resolution', value: '4K UltraHD (3840 x 2160 @ 30fps)' },
        { key: 'Sensor', value: '1/2.8" Sony STARVIS CMOS' },
        { key: 'Lens', value: '2.8mm Fixed Lens (108° Field of View)' },
        { key: 'Night Vision', value: 'Smart IR Up to 30 Meters' },
        { key: 'Protection', value: 'IP67 Water resistant, IK10 Vandal-proof' },
        { key: 'Power Input', value: 'PoE (802.3af) / 12V DC' },
      ],
    },
    {
      sku: 'CAM-PTZ-5MP-02',
      name: 'Vinexus 5MP 30x Optical Zoom Speed Dome PTZ',
      slug: 'vinexus-5mp-30x-optical-zoom-speed-dome-ptz',
      categoryId: categoryMap['cctv-cameras'],
      description: 'Professional high-speed PTZ camera with 30x optical zoom, auto-tracking AI smart guard, 150m laser IR night vision, and pan/tilt speed up to 240°/sec.',
      standardPrice: 18999,
      dealerPrice: 13999,
      isFeatured: true,
      isActive: true,
      images: [
        {
          url: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=800&q=80',
          altText: 'Vinexus PTZ Speed Dome Camera',
          sortOrder: 0,
        },
      ],
      specifications: [
        { key: 'Resolution', value: '5MP (2560 x 1920)' },
        { key: 'Zoom', value: '30x Optical Zoom, 16x Digital Zoom' },
        { key: 'Laser IR Distance', value: 'Up to 150 Meters' },
        { key: 'Features', value: 'Auto-tracking, Line Crossing, Intrusion Alert' },
      ],
    },
    {
      sku: 'NVR-16CH-4K-01',
      name: 'Vinexus 16-Channel 4K NVR with 16 PoE Ports',
      slug: 'vinexus-16-channel-4k-nvr-16-poe-ports',
      categoryId: categoryMap['dvrs-nvrs'],
      description: 'Commercial 16-channel Standalone NVR supporting up to 12MP resolution recording per channel, dual SATA slots up to 20TB, H.265+ compression, and 16 Plug-and-Play PoE ports.',
      standardPrice: 14999,
      dealerPrice: 10499,
      isFeatured: true,
      isActive: true,
      images: [
        {
          url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=800&q=80',
          altText: 'Vinexus 16-Channel 4K PoE NVR Back Panel',
          sortOrder: 0,
        },
      ],
      specifications: [
        { key: 'Channels', value: '16 Channels Plug-and-Play' },
        { key: 'PoE Ports', value: '16 Ports (Max 200W total)' },
        { key: 'Storage Support', value: '2 SATA HDDs (Up to 10TB per disk)' },
        { key: 'Video Compression', value: 'H.265+ / H.265 / H.264+' },
        { key: 'Display Output', value: '1x HDMI (4K), 1x VGA' },
      ],
    },
    {
      sku: 'SWITCH-POE-16G-01',
      name: 'Vinexus 16-Port Gigabit PoE+ Managed Switch',
      slug: 'vinexus-16-port-gigabit-poe-managed-switch',
      categoryId: categoryMap['switches-cables'],
      description: 'Heavy-duty 16-port Gigabit PoE+ switch with 2 SFP uplink ports, 250W power budget, CCTV extended mode up to 250m, and IEEE 802.3af/at standard compliance.',
      standardPrice: 8499,
      dealerPrice: 5999,
      isFeatured: false,
      isActive: true,
      images: [
        {
          url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=800&q=80',
          altText: 'Vinexus 16-Port Gigabit PoE Switch',
          sortOrder: 0,
        },
      ],
      specifications: [
        { key: 'Ports', value: '16x 10/100/1000M PoE+, 2x SFP Uplink' },
        { key: 'PoE Power Budget', value: '250 Watts (Max 30W per port)' },
        { key: 'Transmission Mode', value: 'Standard / Extend Mode (250m at 10Mbps)' },
      ],
    },
    {
      sku: 'HDD-WD-PURPLE-4TB',
      name: 'Western Digital Purple 4TB Surveillance Hard Drive',
      slug: 'western-digital-purple-4tb-surveillance-hard-drive',
      categoryId: categoryMap['accessories'],
      description: 'Purpose-built 24/7 continuous surveillance hard drive optimized for HD video recording up to 64 camera streams with AllFrame AI technology.',
      standardPrice: 7999,
      dealerPrice: 6299,
      isFeatured: false,
      isActive: true,
      images: [
        {
          url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80',
          altText: 'WD Purple 4TB Surveillance HDD',
          sortOrder: 0,
        },
      ],
      specifications: [
        { key: 'Capacity', value: '4 Terabytes' },
        { key: 'Cache', value: '256MB' },
        { key: 'Workload Rating', value: '180TB/year continuous 24x7 operation' },
        { key: 'Interface', value: 'SATA 6 Gb/s' },
      ],
    },
  ];

  for (const prodData of productsData) {
    let prod = await Product.findOne({ sku: prodData.sku });
    if (prod) {
      Object.assign(prod, prodData);
      prod = await prod.save();
    } else {
      prod = await Product.create(prodData);
    }
    console.log(`  ✓ Product: ${prod.name} (SKU: ${prod.sku})`);
  }

  // --- 4. HERO BANNERS ---
  console.log('[Seed] Seeding Hero Banners...');
  await Banner.deleteMany({});
  const bannersData = [
    {
      title: 'Next-Gen 4K AI Surveillance Systems',
      subtitle: 'Wholesale CCTV cameras, NVRs, PoE switches, and complete security infrastructure with instant quotes.',
      image: {
        url: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=1600&q=80',
        publicId: 'hero-banner-1',
      },
      link: '/products',
      buttonText: 'Explore Catalog',
      isActive: true,
      sortOrder: 1,
    },
    {
      title: 'Authorized Dealer Wholesale Portal',
      subtitle: 'Approved dealers unlock exclusive B2B pricing, instant quotation generation, and bulk order discounts.',
      image: {
        url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=1600&q=80',
        publicId: 'hero-banner-2',
      },
      link: '/dealer/pricing',
      buttonText: 'Apply for Dealer Pricing',
      isActive: true,
      sortOrder: 2,
    },
  ];
  for (const bData of bannersData) {
    await Banner.create(bData);
    console.log(`  ✓ Banner: ${bData.title}`);
  }

  // --- 5. PROMOTIONAL BANNERS ---
  console.log('[Seed] Seeding Promotional Cards...');
  await PromotionalBanner.deleteMany({});
  const promoData = [
    {
      title: 'Bulk NVR & PoE Switch Combo Special Offer',
      image: {
        url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=800&q=80',
        publicId: 'promo-1',
      },
      link: '/products',
      sortOrder: 1,
      isActive: true,
    },
    {
      title: 'High-Density 4K Dome Camera Tier Discount',
      image: {
        url: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=800&q=80',
        publicId: 'promo-2',
      },
      link: '/categories',
      sortOrder: 2,
      isActive: true,
    },
  ];
  for (const pData of promoData) {
    await PromotionalBanner.create(pData);
    console.log(`  ✓ Promo Banner: ${pData.title}`);
  }

  // --- 6. TRUST BADGES ---
  console.log('[Seed] Seeding Trust Badges...');
  await TrustBadge.deleteMany({});
  const trustData = [
    {
      title: 'Direct Manufacturer Warranty',
      description: 'All Vinexus hardware comes backed by 2-Year official replacement warranty & technical support.',
      icon: { url: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=100' },
      sortOrder: 1,
      isActive: true,
    },
    {
      title: 'Wholesale B2B Pricing',
      description: 'Approved security dealers and system integrators get transparent tier-based pricing.',
      icon: { url: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=100' },
      sortOrder: 2,
      isActive: true,
    },
    {
      title: 'Rapid Nationwide Shipping',
      description: 'Fast dispatch from central regional warehouses across India within 24-48 business hours.',
      icon: { url: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=100' },
      sortOrder: 3,
      isActive: true,
    },
  ];
  for (const tData of trustData) {
    await TrustBadge.create(tData);
    console.log(`  ✓ Trust Badge: ${tData.title}`);
  }

  // --- 7. FOOTER CONTENT ---
  console.log('[Seed] Seeding Footer Content...');
  await FooterContent.deleteMany({});
  await FooterContent.create({
    companyName: 'Vinexus Security Platforms',
    companyDescription: 'Vinexus is India’s premier B2B distributor for 4K AI CCTV cameras, NVR surveillance systems, Gigabit PoE networking, and security hardware.',
    email: 'support@vinexus.com',
    phone: '+91 800 555 WINE (9463)',
    address: 'Building 4B, Commercial Electronics Complex, MIDC Industrial Area, Mumbai, India - 400001',
    quickLinks: [
      { label: 'All Products', url: '/products', sortOrder: 1 },
      { label: 'Category Directory', url: '/categories', sortOrder: 2 },
      { label: 'Dealer Portal Login', url: '/login', sortOrder: 3 },
      { label: 'Component Library', url: '/ui-preview', sortOrder: 4 },
    ],
    legalLinks: [
      { label: 'Privacy Policy', url: '/content/pages/privacy-policy', sortOrder: 1 },
      { label: 'Terms & Conditions', url: '/content/pages/terms-and-conditions', sortOrder: 2 },
      { label: 'About Vinexus', url: '/content/pages/about-us', sortOrder: 3 },
    ],
    isActive: true,
  });
  console.log('  ✓ Footer Content configured');

  // --- 8. STATIC CMS PAGES ---
  console.log('[Seed] Seeding Static CMS Pages...');
  const pagesData = [
    {
      slug: 'privacy-policy',
      title: 'Privacy Policy & Data Security',
      content: '<p>Vinexus Security Platforms respects your business privacy. We collect personal and company details solely to provide wholesale quotation services, dealer KYC verification, and product shipment processing.</p><h3>Data Protection</h3><p>We do not share your company details, GSTIN, or order history with unauthorized third parties. All traffic is encrypted using SSL/TLS protocols.</p>',
      isPublished: true,
    },
    {
      slug: 'terms-and-conditions',
      title: 'Terms & Conditions of Service',
      content: '<p>Welcome to Vinexus. By accessing our catalog or registering as a B2B dealer, you agree to our standard terms of distribution.</p><h3>Quotation & B2B Pricing</h3><p>Prices listed on quotation requests remain valid for 15 days from issuance date. Dealer wholesale pricing is reserved exclusively for KYC-verified security installers and resellers.</p>',
      isPublished: true,
    },
    {
      slug: 'about-us',
      title: 'About Vinexus Security Platforms',
      content: '<p>Vinexus is a technology-driven security infrastructure distributor supplying high-performance CCTV cameras, NVRs, and PoE network equipment across India.</p><p>We empower dealers and enterprise system integrators with instant digital quotation tools, transparent wholesale pricing, and direct technical support.</p>',
      isPublished: true,
    },
  ];
  for (const pageData of pagesData) {
    let page = await CmsPage.findOne({ slug: pageData.slug });
    if (page) {
      Object.assign(page, pageData);
      page = await page.save();
    } else {
      page = await CmsPage.create(pageData);
    }
    console.log(`  ✓ CMS Page: ${page.title} (/content/pages/${page.slug})`);
  }

  await mongoose.disconnect();
  console.log('\n[Seed] Complete production-level database seeding finished successfully!');
}

seed().catch((err) => {
  console.error('[Seed] Database seeding failed:', err);
  process.exit(1);
});
