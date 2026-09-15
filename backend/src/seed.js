import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
// Triggers dotenv.config() as a side effect (see config/env.js) - without
// this, running `node src/seed.js` directly never loads .env at all, so
// ADMIN_DEFAULT_PASSWORD (and everything else) would silently stay unset.
import './config/env.js';
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

  // Admin sign-in is now password + OTP two-factor (not OTP-only like
  // customer/dealer login), so the seeded admin account needs a real
  // passwordHash. ADMIN_DEFAULT_PASSWORD lets a real deployment set its own;
  // local/dev falls back to a documented default - either way, this is only
  // the FIRST factor, an OTP is still required after it.
  const adminDefaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@12345';
  const adminPasswordHash = await bcrypt.hash(adminDefaultPassword, 10);
  if (!process.env.ADMIN_DEFAULT_PASSWORD) {
    console.log(`  ℹ Demo admin password (set ADMIN_DEFAULT_PASSWORD to override): ${adminDefaultPassword}`);
  }

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
    // +passwordHash: needed below so a reseed never clobbers an admin's
    // real password (e.g. one they've already set via /forgot-password) -
    // select:false would otherwise hide it from `existing`, making it look
    // unset even when it isn't.
    let existing = await User.findOne({ email: uData.email }).select('+passwordHash');
    if (!existing) {
      existing = await User.findOne({ phone: uData.phone }).select('+passwordHash');
    }

    let user;
    if (existing) {
      Object.assign(existing, uData);
      // Only set the demo default password if this admin has never had one
      // set at all - never overwrite a real password on reseed.
      if (uData.role === 'admin' && !existing.passwordHash) {
        existing.passwordHash = adminPasswordHash;
      }
      user = await existing.save();
      console.log(`  ✓ Updated user: ${user.email} (${user.role})`);
    } else {
      if (uData.role === 'admin') {
        uData.passwordHash = adminPasswordHash;
      }
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

  // --- 2. CATEGORIES CLEANUP & SEEDING ---
  console.log('[Seed] Wiping old category database & seeding requested Top Categories & Subcategories...');
  await Category.deleteMany({});
  await Product.deleteMany({});

  const parentCategoriesData = [
    {
      name: 'CCTV Cameras & Security Systems',
      slug: 'cctv-cameras',
      image: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=800&q=80',
      description: 'High-definition IP dome, bullet, PTZ security cameras, and smart AI surveillance tech.',
      sortOrder: 1,
      isActive: true,
      parentId: null,
    },
    {
      name: 'Routers & Network Hardware',
      slug: 'routers-networking',
      image: 'https://images.unsplash.com/photo-1606904825846-647eb07f5be2?auto=format&fit=crop&w=800&q=80',
      description: 'Dual-band Wi-Fi 6 routers, mesh systems, and industrial cellular gateways.',
      sortOrder: 2,
      isActive: true,
      parentId: null,
    },
    {
      name: 'Enterprise Gigabit PoE Switches',
      slug: 'switches-poe',
      image: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=800&q=80',
      description: 'Managed and unmanaged PoE+ switches for high-density IP camera networks.',
      sortOrder: 3,
      isActive: true,
      parentId: null,
    },
    {
      name: 'Video & Photo Shooting Cameras',
      slug: 'shooting-cameras',
      image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80',
      description: 'Professional DSLR, mirrorless, and cinema cameras from Canon, Nikon, and Sony.',
      sortOrder: 4,
      isActive: true,
      parentId: null,
    },
  ];

  const categoryMap = {};

  for (const catData of parentCategoriesData) {
    const cat = await Category.create(catData);
    categoryMap[cat.slug] = cat._id;
    console.log(`  ✓ Top Category: ${cat.name} (${cat.slug})`);
  }

  const subCategoriesData = [
    // --- Subcategories under CCTV Cameras ---
    {
      name: 'Dahua Security Cameras',
      slug: 'cctv-dahua',
      parentId: categoryMap['cctv-cameras'],
      image: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=800&q=80',
      description: 'Official Dahua Starlight & WizSense IP security cameras.',
      sortOrder: 1,
      isActive: true,
    },
    {
      name: 'Hikvision Surveillance',
      slug: 'cctv-hikvision',
      parentId: categoryMap['cctv-cameras'],
      image: 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b7?auto=format&fit=crop&w=800&q=80',
      description: 'Hikvision AcuSense and ColorVu high-resolution surveillance systems.',
      sortOrder: 2,
      isActive: true,
    },
    {
      name: 'CP PLUS IP Cameras',
      slug: 'cctv-cpplus',
      parentId: categoryMap['cctv-cameras'],
      image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
      description: 'CP PLUS Guard+ and Indigo series CCTV cameras.',
      sortOrder: 3,
      isActive: true,
    },

    // --- Subcategories under Routers & Network Hardware ---
    {
      name: 'Dual-Band Wi-Fi 6 Routers',
      slug: 'routers-wifi6',
      parentId: categoryMap['routers-networking'],
      image: 'https://images.unsplash.com/photo-1606904825846-647eb07f5be2?auto=format&fit=crop&w=800&q=80',
      description: 'Next-gen Wi-Fi 6 wireless mesh and high-speed routers.',
      sortOrder: 1,
      isActive: true,
    },
    {
      name: '4G/5G Industrial Modems',
      slug: 'modems-4g5g',
      parentId: categoryMap['routers-networking'],
      image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
      description: 'Heavy-duty 4G LTE and 5G cellular SIM routers for remote sites.',
      sortOrder: 2,
      isActive: true,
    },

    // --- Subcategories under Enterprise Gigabit PoE Switches ---
    {
      name: 'Managed Enterprise Switches',
      slug: 'switches-managed',
      parentId: categoryMap['switches-poe'],
      image: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=800&q=80',
      description: 'L2+ managed 16, 24, and 48-port PoE+ switches with SFP+ uplinks.',
      sortOrder: 1,
      isActive: true,
    },
    {
      name: 'Unmanaged Industrial Switches',
      slug: 'switches-unmanaged',
      parentId: categoryMap['switches-poe'],
      image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80',
      description: 'Plug-and-play PoE switches for CCTV installation networks.',
      sortOrder: 2,
      isActive: true,
    },

    // --- Subcategories under Video & Photo Shooting Cameras ---
    {
      name: 'Canon DSLR & Mirrorless Series',
      slug: 'cameras-canon',
      parentId: categoryMap['shooting-cameras'],
      image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80',
      description: 'Canon EOS R cinema mirrorless and EOS DSLR camera bodies.',
      sortOrder: 1,
      isActive: true,
    },
    {
      name: 'Nikon Full-Frame Cameras',
      slug: 'cameras-nikon',
      parentId: categoryMap['shooting-cameras'],
      image: 'https://images.unsplash.com/photo-1512790182412-b19e6d611397?auto=format&fit=crop&w=800&q=80',
      description: 'Nikon Z series mirrorless and FX-format professional DSLRs.',
      sortOrder: 2,
      isActive: true,
    },
    {
      name: 'Sony Alpha Cine Cameras',
      slug: 'cameras-sony',
      parentId: categoryMap['shooting-cameras'],
      image: 'https://images.unsplash.com/photo-1519638399535-1b036603ac77?auto=format&fit=crop&w=800&q=80',
      description: 'Sony Alpha 7 IV and Cinema Line FX full-frame video cameras.',
      sortOrder: 3,
      isActive: true,
    },
  ];

  for (const subCatData of subCategoriesData) {
    const subCat = await Category.create(subCatData);
    categoryMap[subCat.slug] = subCat._id;
    console.log(`  ✓ Subcategory: ${subCat.name} (${subCat.slug})`);
  }

  // --- 3. PRODUCTS SEEDING (5 Products Per Top Category = 20 Total) ---
  console.log('[Seed] Seeding exactly 5 products per category (20 curated products)...');
  const productsData = [
    // ==========================================
    // 1. CCTV CAMERAS & SECURITY SYSTEMS (5 Products)
    // ==========================================
    {
      sku: 'DAH-4K-BULLET-01',
      name: 'Dahua 4K WizSense Outdoor Bullet IP Camera',
      slug: 'dahua-4k-wizsense-outdoor-bullet-ip-camera',
      categoryId: categoryMap['cctv-dahua'],
      description: 'Industrial 4K 8MP outdoor Starlight IP bullet camera featuring Sony STARVIS sensor, 50m Smart IR night vision, IP67 weatherproof housing, and built-in AI perimeter defense.',
      standardPrice: 5999,
      dealerPrice: 4299,
      isFeatured: true,
      isActive: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=800&q=80', altText: 'Dahua 4K WizSense Bullet Camera', sortOrder: 0 },
      ],
      specifications: [
        { key: 'Brand', value: 'Dahua Technology' },
        { key: 'Resolution', value: '4K Ultra HD (3840 x 2160 @ 30fps)' },
        { key: 'Night Vision', value: '50m Smart IR Night Vision' },
      ],
    },
    {
      sku: 'DAH-8MP-DOME-02',
      name: 'Dahua 8MP Starlight Vandal-Proof IP Dome',
      slug: 'dahua-8mp-starlight-vandal-proof-ip-dome',
      categoryId: categoryMap['cctv-dahua'],
      description: '8MP Vandal-proof IK10 IP dome camera with Starlight full-color low light performance, 30m IR, and PoE connectivity.',
      standardPrice: 6499,
      dealerPrice: 4699,
      isFeatured: true,
      isActive: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=800&q=80', altText: 'Dahua 8MP Starlight Dome Camera', sortOrder: 0 },
      ],
      specifications: [
        { key: 'Brand', value: 'Dahua Technology' },
        { key: 'Resolution', value: '8MP (3840 x 2160)' },
      ],
    },
    {
      sku: 'HIK-COLORVU-4K-01',
      name: 'Hikvision ColorVu 4K Full-Time Color IP Camera',
      slug: 'hikvision-colorvu-4k-full-time-color-ip-camera',
      categoryId: categoryMap['cctv-hikvision'],
      description: 'Hikvision ColorVu technology provides 24/7 vivid colorful images in dark environments with F1.0 advanced super-aperture lens.',
      standardPrice: 7299,
      dealerPrice: 5399,
      isFeatured: true,
      isActive: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b7?auto=format&fit=crop&w=800&q=80', altText: 'Hikvision ColorVu Camera', sortOrder: 0 },
      ],
      specifications: [
        { key: 'Brand', value: 'Hikvision' },
        { key: 'Technology', value: 'ColorVu 24/7 Full Color' },
      ],
    },
    {
      sku: 'HIK-ACUSENSE-DOME-02',
      name: 'Hikvision AcuSense 5MP Varifocal IP Dome',
      slug: 'hikvision-acusense-5mp-varifocal-ip-dome',
      categoryId: categoryMap['cctv-hikvision'],
      description: 'Empowered by deep learning algorithms, Hikvision AcuSense technology brings human and vehicle target classification alarms.',
      standardPrice: 8499,
      dealerPrice: 6199,
      isFeatured: false,
      isActive: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=800&q=80', altText: 'Hikvision AcuSense Dome Camera', sortOrder: 0 },
      ],
      specifications: [
        { key: 'Brand', value: 'Hikvision' },
        { key: 'AI Classification', value: 'Human & Vehicle Target Filter' },
      ],
    },
    {
      sku: 'CPP-INDIGO-5MP-01',
      name: 'CP PLUS Indigo 5MP Full HD IP Camera',
      slug: 'cp-plus-indigo-5mp-full-hd-ip-camera',
      categoryId: categoryMap['cctv-cpplus'],
      description: 'CP PLUS Indigo series 5MP IR outdoor security camera with high efficiency H.265+ encoding and long-range illumination.',
      standardPrice: 4299,
      dealerPrice: 2999,
      isFeatured: true,
      isActive: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80', altText: 'CP PLUS Indigo Camera', sortOrder: 0 },
      ],
      specifications: [
        { key: 'Brand', value: 'CP PLUS' },
        { key: 'Resolution', value: '5MP HD' },
      ],
    },

    // ==========================================
    // 2. ROUTERS & NETWORK HARDWARE (5 Products)
    // ==========================================
    {
      sku: 'ROUT-TPL-AX73-01',
      name: 'TP-Link Archer AX73 Dual-Band Wi-Fi 6 Router',
      slug: 'tp-link-archer-ax73-dual-band-wi-fi-6-router',
      categoryId: categoryMap['routers-wifi6'],
      description: 'AX5400 Dual-Band Gigabit Wi-Fi 6 router delivering up to 5.4 Gbps speeds for high-definition 4K streaming and IP security feeds.',
      standardPrice: 8999,
      dealerPrice: 6799,
      isFeatured: true,
      isActive: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1606904825846-647eb07f5be2?auto=format&fit=crop&w=800&q=80', altText: 'TP-Link Archer Wi-Fi 6 Router', sortOrder: 0 },
      ],
      specifications: [
        { key: 'Standard', value: 'Wi-Fi 6 (802.11ax)' },
        { key: 'Speed', value: '5400 Mbps (5.4 Gbps)' },
      ],
    },
    {
      sku: 'ROUT-NET-AX12-02',
      name: 'Netgear Nighthawk AX12 12-Stream Wi-Fi 6 Router',
      slug: 'netgear-nighthawk-ax12-12-stream-wi-fi-6-router',
      categoryId: categoryMap['routers-wifi6'],
      description: 'High-performance 12-stream Wi-Fi 6 router with 6 Gbps speed and powerful quad-core processor for multi-device network demands.',
      standardPrice: 24999,
      dealerPrice: 19999,
      isFeatured: true,
      isActive: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1606904825846-647eb07f5be2?auto=format&fit=crop&w=800&q=80', altText: 'Netgear Nighthawk AX12 Router', sortOrder: 0 },
      ],
      specifications: [
        { key: 'Brand', value: 'Netgear' },
        { key: 'Streams', value: '12-Stream Wi-Fi 6' },
      ],
    },
    {
      sku: 'MODEM-TELT-RUT950-01',
      name: 'Teltonika RUT950 Industrial 4G LTE Dual-SIM Router',
      slug: 'teltonika-rut950-industrial-4g-lte-dual-sim-router',
      categoryId: categoryMap['modems-4g5g'],
      description: 'Ruggedized industrial 4G LTE Wi-Fi router with dual SIM failover, 4x Ethernet ports, and metal casing for extreme temperature operation.',
      standardPrice: 16499,
      dealerPrice: 12999,
      isFeatured: false,
      isActive: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80', altText: 'Teltonika RUT950 Industrial Router', sortOrder: 0 },
      ],
      specifications: [
        { key: 'Connectivity', value: '4G LTE Cat 4, 3G, 2G' },
        { key: 'Feature', value: 'Dual SIM Auto-Failover' },
      ],
    },
    {
      sku: 'MODEM-CRADLE-5G-02',
      name: 'Cradlepoint W1850 5G Industrial Cellular Gateway',
      slug: 'cradlepoint-w1850-5g-industrial-cellular-gateway',
      categoryId: categoryMap['modems-4g5g'],
      description: 'Enterprise 5G wideband adapter offering dual connectivity 5G Sub-6GHz and 4G LTE Gigabit for mission critical CCTV sites.',
      standardPrice: 48999,
      dealerPrice: 39999,
      isFeatured: true,
      isActive: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80', altText: 'Cradlepoint 5G Gateway', sortOrder: 0 },
      ],
      specifications: [
        { key: 'Bandwidth', value: '5G Sub-6GHz & 4G LTE' },
        { key: 'Security', value: 'NetCloud Enterprise VPN Security' },
      ],
    },
    {
      sku: 'ROUT-ASUS-AX88U-03',
      name: 'Asus RT-AX88U Dual-Band Gigabit Wi-Fi 6 Router',
      slug: 'asus-rt-ax88u-dual-band-gigabit-wi-fi-6-router',
      categoryId: categoryMap['routers-wifi6'],
      description: '8-port gigabit LAN router with AiMesh support, Trend Micro commercial security protection, and 6000 Mbps total Wi-Fi speed.',
      standardPrice: 21999,
      dealerPrice: 17499,
      isFeatured: false,
      isActive: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1606904825846-647eb07f5be2?auto=format&fit=crop&w=800&q=80', altText: 'Asus RT-AX88U Router', sortOrder: 0 },
      ],
      specifications: [
        { key: 'Ports', value: '8x Gigabit LAN Ports' },
        { key: 'Mesh Support', value: 'Asus AiMesh Enabled' },
      ],
    },

    // ==========================================
    // 3. ENTERPRISE GIGABIT POE SWITCHES (5 Products)
    // ==========================================
    {
      sku: 'SW-CISCO-24POE-01',
      name: 'Cisco Catalyst 24-Port Managed Gigabit PoE+ Switch',
      slug: 'cisco-catalyst-24-port-managed-gigabit-poe-switch',
      categoryId: categoryMap['switches-managed'],
      description: 'Enterprise 24-port PoE+ switch providing 370W total PoE budget, 4x 10G SFP+ uplinks, and L2+ advanced network management.',
      standardPrice: 28999,
      dealerPrice: 22999,
      isFeatured: true,
      isActive: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=800&q=80', altText: 'Cisco 24-Port PoE Switch', sortOrder: 0 },
      ],
      specifications: [
        { key: 'Ports', value: '24 Gigabit PoE+ Ports' },
        { key: 'PoE Power Budget', value: '370W' },
      ],
    },
    {
      sku: 'SW-TPL-16POE-02',
      name: 'TP-Link JetStream 16-Port Gigabit Smart PoE Switch',
      slug: 'tp-link-jetstream-16-port-gigabit-smart-poe-switch',
      categoryId: categoryMap['switches-managed'],
      description: '16x Gigabit PoE+ ports with 2x SFP slots, 250W power budget, and Omada SDN cloud central management.',
      standardPrice: 14999,
      dealerPrice: 11499,
      isFeatured: true,
      isActive: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=800&q=80', altText: 'TP-Link 16-Port PoE Switch', sortOrder: 0 },
      ],
      specifications: [
        { key: 'Ports', value: '16 Gigabit PoE+ Ports + 2 SFP' },
        { key: 'PoE Power Budget', value: '250W' },
      ],
    },
    {
      sku: 'SW-DLINK-8POE-03',
      name: 'D-Link 8-Port Industrial Unmanaged PoE Switch',
      slug: 'd-link-8-port-industrial-unmanaged-poe-switch',
      categoryId: categoryMap['switches-unmanaged'],
      description: 'Plug-and-play 8-port 10/100/1000Mbps PoE switch with 96W budget and CCTV long-range mode up to 250 meters.',
      standardPrice: 4999,
      dealerPrice: 3499,
      isFeatured: false,
      isActive: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80', altText: 'D-Link 8-Port PoE Switch', sortOrder: 0 },
      ],
      specifications: [
        { key: 'Extension Mode', value: '250m Extended CCTV Transmission' },
        { key: 'PoE Budget', value: '96W' },
      ],
    },
    {
      sku: 'SW-UBI-24POE-04',
      name: 'Ubiquiti UniFi Switch Pro 24 PoE Managed Switch',
      slug: 'ubiquiti-unifi-switch-pro-24-poe-managed-switch',
      categoryId: categoryMap['switches-managed'],
      description: 'Layer 3 switch with 16x 802.3at PoE+ ports, 8x 802.3bt PoE++ ports, 2x 10G SFP+ ports, and 400W power supply.',
      standardPrice: 42999,
      dealerPrice: 34999,
      isFeatured: true,
      isActive: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=800&q=80', altText: 'Ubiquiti UniFi Pro 24 Switch', sortOrder: 0 },
      ],
      specifications: [
        { key: 'Brand', value: 'Ubiquiti UniFi' },
        { key: 'PoE Types', value: 'PoE+ and Ultra PoE++ (60W/port)' },
      ],
    },
    {
      sku: 'SW-NET-5POE-05',
      name: 'Netgear 5-Port Gigabit Desktop Unmanaged PoE Switch',
      slug: 'netgear-5-port-gigabit-desktop-unmanaged-poe-switch',
      categoryId: categoryMap['switches-unmanaged'],
      description: 'Compact 5-port gigabit switch with 4 PoE ports (60W total), quiet fanless design, and metal casing.',
      standardPrice: 2999,
      dealerPrice: 2199,
      isFeatured: false,
      isActive: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80', altText: 'Netgear 5-Port PoE Switch', sortOrder: 0 },
      ],
      specifications: [
        { key: 'Ports', value: '4 PoE Ports + 1 Uplink Port' },
        { key: 'Power Budget', value: '60W' },
      ],
    },

    // ==========================================
    // 4. VIDEO & PHOTO SHOOTING CAMERAS (5 Products)
    // ==========================================
    {
      sku: 'CAM-CANON-EOS-R5',
      name: 'Canon EOS R5 Full-Frame Mirrorless 8K Camera Body',
      slug: 'canon-eos-r5-full-frame-mirrorless-8k-camera-body',
      categoryId: categoryMap['cameras-canon'],
      description: '45 Megapixel full-frame CMOS sensor, 8K RAW internal video recording up to 30fps, 20fps electronic shutter, and 5-axis in-body image stabilization.',
      standardPrice: 329999,
      dealerPrice: 289999,
      isFeatured: true,
      isActive: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80', altText: 'Canon EOS R5 Camera', sortOrder: 0 },
      ],
      specifications: [
        { key: 'Brand', value: 'Canon' },
        { key: 'Sensor', value: '45MP Full-Frame CMOS' },
        { key: 'Video', value: '8K RAW / 4K 120fps' },
      ],
    },
    {
      sku: 'CAM-CANON-5D4',
      name: 'Canon EOS 5D Mark IV Professional DSLR Camera',
      slug: 'canon-eos-5d-mark-iv-professional-dslr-camera',
      categoryId: categoryMap['cameras-canon'],
      description: '30.4 MP full-frame sensor, 4K video recording, 61-point High Density Reticular AF system, and Dual Pixel CMOS AF.',
      standardPrice: 215000,
      dealerPrice: 185000,
      isFeatured: false,
      isActive: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80', altText: 'Canon EOS 5D Mark IV', sortOrder: 0 },
      ],
      specifications: [
        { key: 'Brand', value: 'Canon' },
        { key: 'Sensor', value: '30.4MP Full-Frame DSLR' },
      ],
    },
    {
      sku: 'CAM-NIKON-Z9',
      name: 'Nikon Z9 Flagship Full-Frame Mirrorless Camera',
      slug: 'nikon-z9-flagship-full-frame-mirrorless-camera',
      categoryId: categoryMap['cameras-nikon'],
      description: 'Nikon professional Z mount camera featuring 45.7MP stacked CMOS sensor, 8K/60p video, 120 fps burst shooting, and blackout-free viewfinder.',
      standardPrice: 475000,
      dealerPrice: 420000,
      isFeatured: true,
      isActive: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1512790182412-b19e6d611397?auto=format&fit=crop&w=800&q=80', altText: 'Nikon Z9 Camera', sortOrder: 0 },
      ],
      specifications: [
        { key: 'Brand', value: 'Nikon' },
        { key: 'Sensor', value: '45.7MP Stacked Full-Frame' },
        { key: 'Video', value: '8K 60p N-RAW / 4K 120p' },
      ],
    },
    {
      sku: 'CAM-NIKON-D850',
      name: 'Nikon D850 FX-Format Digital SLR Camera Body',
      slug: 'canon-d850-fx-format-digital-slr-camera-body',
      categoryId: categoryMap['cameras-nikon'],
      description: '45.7 MP back-illuminated full-frame sensor, 7 fps continuous shooting, 4K UHD video recording, and 153-point AF system.',
      standardPrice: 224990,
      dealerPrice: 195000,
      isFeatured: false,
      isActive: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1512790182412-b19e6d611397?auto=format&fit=crop&w=800&q=80', altText: 'Nikon D850 DSLR', sortOrder: 0 },
      ],
      specifications: [
        { key: 'Brand', value: 'Nikon' },
        { key: 'Sensor', value: '45.7MP FX BSI Sensor' },
      ],
    },
    {
      sku: 'CAM-SONY-FX3',
      name: 'Sony FX3 Cinema Line Full-Frame Camera',
      slug: 'sony-fx3-cinema-line-full-frame-camera',
      categoryId: categoryMap['cameras-sony'],
      description: 'Compact Cinema Line camera with 12.1MP Exmor R sensor, 4K 120p recording, S-Cinetone color science, active cooling fan, and XLR handle unit.',
      standardPrice: 379990,
      dealerPrice: 335000,
      isFeatured: true,
      isActive: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1519638399535-1b036603ac77?auto=format&fit=crop&w=800&q=80', altText: 'Sony FX3 Cinema Camera', sortOrder: 0 },
      ],
      specifications: [
        { key: 'Brand', value: 'Sony' },
        { key: 'Series', value: 'Cinema Line FX' },
        { key: 'Video', value: '4K 120p 10-bit 4:2:2' },
      ],
    },
  ];

  for (const prodData of productsData) {
    const prod = await Product.create(prodData);
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
