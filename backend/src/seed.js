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

    // --- Additional CCTV Cameras ---
    {
      sku: 'CAM-BULLET-2MP-03',
      name: 'Vinexus 2MP IP66 Outdoor Bullet Camera',
      slug: 'vinexus-2mp-ip66-outdoor-bullet-camera',
      categoryId: categoryMap['cctv-cameras'],
      description: 'Entry-level 2MP fixed-lens bullet camera for perimeter monitoring, IP66 weatherproof rating, and 20m IR night vision.',
      standardPrice: 1999,
      dealerPrice: 1399,
      isFeatured: false,
      isActive: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=800&q=80', altText: 'Vinexus 2MP Outdoor Bullet Camera', sortOrder: 0 },
      ],
      specifications: [
        { key: 'Resolution', value: '2MP (1920 x 1080 @ 25fps)' },
        { key: 'Lens', value: '3.6mm Fixed Lens' },
        { key: 'Night Vision', value: 'IR Up to 20 Meters' },
        { key: 'Protection', value: 'IP66 Weatherproof' },
      ],
    },
    {
      sku: 'CAM-WIFI-3MP-04',
      name: 'Vinexus 3MP WiFi Indoor Pan-Tilt Camera',
      slug: 'vinexus-3mp-wifi-indoor-pan-tilt-camera',
      categoryId: categoryMap['cctv-cameras'],
      description: 'Smart indoor WiFi camera with 355° pan / 90° tilt coverage, two-way audio, motion tracking, and mobile app push alerts.',
      standardPrice: 2499,
      dealerPrice: 1799,
      isFeatured: true,
      isActive: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=800&q=80', altText: 'Vinexus WiFi Pan-Tilt Camera', sortOrder: 0 },
      ],
      specifications: [
        { key: 'Resolution', value: '3MP (2048 x 1536)' },
        { key: 'Coverage', value: '355° Pan / 90° Tilt' },
        { key: 'Connectivity', value: 'Dual-band WiFi, microSD up to 256GB' },
        { key: 'Audio', value: 'Built-in Mic & Speaker (Two-way)' },
      ],
    },
    {
      sku: 'CAM-DOME-8MP-05',
      name: 'Vinexus 8MP Starlight Low-Light Dome Camera',
      slug: 'vinexus-8mp-starlight-low-light-dome-camera',
      categoryId: categoryMap['cctv-cameras'],
      description: 'Premium 8MP Starlight sensor dome camera delivering full-color footage in near-zero lux conditions, ideal for parking lots and entrances.',
      standardPrice: 6499,
      dealerPrice: 4899,
      isFeatured: false,
      isActive: false,
      images: [
        { url: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=800&q=80', altText: 'Vinexus 8MP Starlight Dome Camera', sortOrder: 0 },
      ],
      specifications: [
        { key: 'Resolution', value: '8MP (3840 x 2160)' },
        { key: 'Sensor', value: 'Starlight CMOS, Full-Color Night Mode' },
        { key: 'Lens', value: '2.8mm Fixed Lens' },
      ],
    },
    {
      sku: 'CAM-THERMAL-06',
      name: 'Vinexus Thermal Imaging Perimeter Camera',
      slug: 'vinexus-thermal-imaging-perimeter-camera',
      categoryId: categoryMap['cctv-cameras'],
      description: 'Dual-lens thermal + optical camera for 24/7 perimeter intrusion detection in total darkness, fog, or smoke, with radiometric temperature alarms.',
      standardPrice: 42999,
      dealerPrice: 34999,
      isFeatured: false,
      isActive: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=800&q=80', altText: 'Vinexus Thermal Imaging Camera', sortOrder: 0 },
      ],
      specifications: [
        { key: 'Thermal Resolution', value: '384 x 288' },
        { key: 'Detection Range', value: 'Human detection up to 300m' },
        { key: 'Alarm', value: 'Radiometric temperature threshold alerts' },
      ],
    },
    {
      sku: 'CAM-DOORBELL-07',
      name: 'Vinexus Smart WiFi Video Doorbell',
      slug: 'vinexus-smart-wifi-video-doorbell',
      categoryId: categoryMap['cctv-cameras'],
      description: 'Battery or wired smart doorbell with 2K resolution, PIR motion alerts, night vision, and real-time two-way talk via mobile app.',
      standardPrice: 3499,
      dealerPrice: 2599,
      isFeatured: true,
      isActive: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=800&q=80', altText: 'Vinexus Smart Video Doorbell', sortOrder: 0 },
      ],
      specifications: [
        { key: 'Resolution', value: '2K QHD' },
        { key: 'Power', value: 'Rechargeable Battery or 16-24V AC Wired' },
        { key: 'Field of View', value: '166° Diagonal' },
      ],
    },

    // --- Additional DVRs & NVRs ---
    {
      sku: 'DVR-8CH-1080P-02',
      name: 'Vinexus 8-Channel 1080P Hybrid DVR',
      slug: 'vinexus-8-channel-1080p-hybrid-dvr',
      categoryId: categoryMap['dvrs-nvrs'],
      description: 'Cost-effective 8-channel hybrid DVR supporting AHD, TVI, CVI, and analog cameras with H.265 compression and remote mobile viewing.',
      standardPrice: 5999,
      dealerPrice: 4299,
      isFeatured: false,
      isActive: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=800&q=80', altText: 'Vinexus 8-Channel Hybrid DVR', sortOrder: 0 },
      ],
      specifications: [
        { key: 'Channels', value: '8 Channels Hybrid (AHD/TVI/CVI/CVBS)' },
        { key: 'Storage Support', value: '1 SATA HDD (Up to 10TB)' },
        { key: 'Compression', value: 'H.265' },
      ],
    },
    {
      sku: 'NVR-32CH-8K-03',
      name: 'Vinexus 32-Channel 8K Enterprise NVR',
      slug: 'vinexus-32-channel-8k-enterprise-nvr',
      categoryId: categoryMap['dvrs-nvrs'],
      description: 'Enterprise-grade 32-channel NVR with 8K HDMI output, 4 SATA bays up to 40TB, RAID support, and facial recognition search.',
      standardPrice: 39999,
      dealerPrice: 31999,
      isFeatured: true,
      isActive: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=800&q=80', altText: 'Vinexus 32-Channel 8K NVR', sortOrder: 0 },
      ],
      specifications: [
        { key: 'Channels', value: '32 Channels' },
        { key: 'Storage Support', value: '4 SATA HDDs, RAID 0/1/5/10, up to 40TB' },
        { key: 'Display Output', value: '1x HDMI (8K), 1x HDMI (4K), 1x VGA' },
        { key: 'Smart Search', value: 'Facial Recognition, Human/Vehicle Filter' },
      ],
    },
    {
      sku: 'NVR-4CH-POE-04',
      name: 'Vinexus 4-Channel Mini PoE NVR Kit',
      slug: 'vinexus-4-channel-mini-poe-nvr-kit',
      categoryId: categoryMap['dvrs-nvrs'],
      description: 'Compact 4-channel NVR with built-in 4-port PoE, ideal for home offices and small retail shops. Single SATA bay up to 6TB.',
      standardPrice: 4499,
      dealerPrice: 3199,
      isFeatured: false,
      isActive: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=800&q=80', altText: 'Vinexus 4-Channel Mini NVR', sortOrder: 0 },
      ],
      specifications: [
        { key: 'Channels', value: '4 Channels Plug-and-Play' },
        { key: 'PoE Ports', value: '4 Ports (Max 48W total)' },
        { key: 'Storage Support', value: '1 SATA HDD (Up to 6TB)' },
      ],
    },
    {
      sku: 'DVR-4CH-AHD-05',
      name: 'Vinexus 4-Channel AHD Analog DVR',
      slug: 'vinexus-4-channel-ahd-analog-dvr',
      categoryId: categoryMap['dvrs-nvrs'],
      description: 'Legacy-friendly 4-channel AHD DVR for budget analog camera retrofits with basic motion detection recording.',
      standardPrice: 2999,
      dealerPrice: 2099,
      isFeatured: false,
      isActive: false,
      images: [
        { url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=800&q=80', altText: 'Vinexus 4-Channel AHD DVR', sortOrder: 0 },
      ],
      specifications: [
        { key: 'Channels', value: '4 Channels AHD' },
        { key: 'Storage Support', value: '1 SATA HDD (Up to 4TB)' },
      ],
    },
    {
      sku: 'NVR-CLOUD-06',
      name: 'Vinexus 8-Channel Cloud-Managed NVR',
      slug: 'vinexus-8-channel-cloud-managed-nvr',
      categoryId: categoryMap['dvrs-nvrs'],
      description: '8-channel NVR with native cloud backup, remote fleet management dashboard for multi-site dealers, and auto-firmware updates.',
      standardPrice: 12999,
      dealerPrice: 9499,
      isFeatured: false,
      isActive: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=800&q=80', altText: 'Vinexus Cloud-Managed NVR', sortOrder: 0 },
      ],
      specifications: [
        { key: 'Channels', value: '8 Channels Plug-and-Play' },
        { key: 'Cloud', value: 'Native cloud backup + multi-site dashboard' },
      ],
    },

    // --- Additional Network Switches & Cables ---
    {
      sku: 'SWITCH-POE-8G-02',
      name: 'Vinexus 8-Port Gigabit PoE+ Switch',
      slug: 'vinexus-8-port-gigabit-poe-switch',
      categoryId: categoryMap['switches-cables'],
      description: 'Compact 8-port Gigabit PoE+ switch with 120W power budget and 1 SFP uplink, suited for small NVR deployments.',
      standardPrice: 4299,
      dealerPrice: 2999,
      isFeatured: false,
      isActive: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=800&q=80', altText: 'Vinexus 8-Port PoE Switch', sortOrder: 0 },
      ],
      specifications: [
        { key: 'Ports', value: '8x 10/100/1000M PoE+, 1x SFP Uplink' },
        { key: 'PoE Power Budget', value: '120 Watts' },
      ],
    },
    {
      sku: 'CABLE-CAT6-305M-03',
      name: 'Vinexus CAT6 UTP Cable Box (305 Meters)',
      slug: 'vinexus-cat6-utp-cable-box-305-meters',
      categoryId: categoryMap['switches-cables'],
      description: 'Pure copper CAT6 UTP cable, 305m pull box, supports Gigabit Ethernet and long-distance PoE camera runs.',
      standardPrice: 5499,
      dealerPrice: 4199,
      isFeatured: false,
      isActive: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=800&q=80', altText: 'Vinexus CAT6 Cable Box', sortOrder: 0 },
      ],
      specifications: [
        { key: 'Length', value: '305 Meters (1000ft)' },
        { key: 'Conductor', value: '100% Pure Copper, 23AWG' },
      ],
    },
    {
      sku: 'SWITCH-UNMANAGED-5P-04',
      name: 'Vinexus 5-Port Unmanaged Desktop Switch',
      slug: 'vinexus-5-port-unmanaged-desktop-switch',
      categoryId: categoryMap['switches-cables'],
      description: 'Plug-and-play 5-port Fast Ethernet unmanaged switch for small office and home network expansion.',
      standardPrice: 599,
      dealerPrice: 399,
      isFeatured: false,
      isActive: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=800&q=80', altText: 'Vinexus 5-Port Unmanaged Switch', sortOrder: 0 },
      ],
      specifications: [
        { key: 'Ports', value: '5x 10/100Mbps' },
      ],
    },
    {
      sku: 'FIBER-EXT-05',
      name: 'Vinexus Fiber Optic PoE Extender Kit',
      slug: 'vinexus-fiber-optic-poe-extender-kit',
      categoryId: categoryMap['switches-cables'],
      description: '1-port fiber media converter pair with PoE output, extending camera links up to 20km over single-mode fiber.',
      standardPrice: 3299,
      dealerPrice: 2399,
      isFeatured: false,
      isActive: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=800&q=80', altText: 'Vinexus Fiber Optic Extender', sortOrder: 0 },
      ],
      specifications: [
        { key: 'Max Distance', value: 'Up to 20km (Single-mode)' },
        { key: 'PoE Output', value: '802.3af/at, up to 30W' },
      ],
    },
    {
      sku: 'CONNECTOR-BNC-100PK-06',
      name: 'Vinexus BNC Connector Pack (100 Pieces)',
      slug: 'vinexus-bnc-connector-pack-100-pieces',
      categoryId: categoryMap['switches-cables'],
      description: 'Crimp-style BNC male connectors for RG59/RG6 coaxial cable, bulk pack of 100 for installer stock.',
      standardPrice: 899,
      dealerPrice: 599,
      isFeatured: false,
      isActive: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=800&q=80', altText: 'Vinexus BNC Connector Pack', sortOrder: 0 },
      ],
      specifications: [
        { key: 'Quantity', value: '100 Pieces' },
        { key: 'Compatibility', value: 'RG59 / RG6 Coaxial Cable' },
      ],
    },

    // --- Additional Accessories & Power Supplies ---
    {
      sku: 'SMPS-12V-10A-02',
      name: 'Vinexus 12V 10A SMPS Power Supply (CCTV Grade)',
      slug: 'vinexus-12v-10a-smps-power-supply',
      categoryId: categoryMap['accessories'],
      description: 'Metal-body 12V 10A switch-mode power supply with 8-way fused distribution board for multi-camera installations.',
      standardPrice: 1299,
      dealerPrice: 899,
      isFeatured: false,
      isActive: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80', altText: 'Vinexus 12V 10A SMPS', sortOrder: 0 },
      ],
      specifications: [
        { key: 'Output', value: '12V DC, 10A' },
        { key: 'Distribution', value: '8-Way Fused Output' },
      ],
    },
    {
      sku: 'BRACKET-CAM-MOUNT-03',
      name: 'Vinexus Universal Camera Wall Mount Bracket',
      slug: 'vinexus-universal-camera-wall-mount-bracket',
      categoryId: categoryMap['accessories'],
      description: 'Heavy-duty aluminum wall/ceiling mount bracket compatible with most dome and bullet camera housings.',
      standardPrice: 349,
      dealerPrice: 229,
      isFeatured: false,
      isActive: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80', altText: 'Vinexus Camera Mount Bracket', sortOrder: 0 },
      ],
      specifications: [
        { key: 'Material', value: 'Die-cast Aluminum' },
        { key: 'Load Capacity', value: 'Up to 5kg' },
      ],
    },
    {
      sku: 'HDD-SEAGATE-SKYHAWK-2TB-04',
      name: 'Seagate SkyHawk 2TB Surveillance Hard Drive',
      slug: 'seagate-skyhawk-2tb-surveillance-hard-drive',
      categoryId: categoryMap['accessories'],
      description: 'Purpose-built surveillance HDD with ImagePerfect firmware, rated for 24/7 operation across up to 64 HD cameras.',
      standardPrice: 4499,
      dealerPrice: 3499,
      isFeatured: true,
      isActive: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80', altText: 'Seagate SkyHawk 2TB HDD', sortOrder: 0 },
      ],
      specifications: [
        { key: 'Capacity', value: '2 Terabytes' },
        { key: 'Cache', value: '256MB' },
        { key: 'Interface', value: 'SATA 6 Gb/s' },
      ],
    },
    {
      sku: 'POE-INJECTOR-05',
      name: 'Vinexus Single-Port Gigabit PoE Injector',
      slug: 'vinexus-single-port-gigabit-poe-injector',
      categoryId: categoryMap['accessories'],
      description: 'Compact PoE injector adding power to a single non-PoE camera or access point over existing Ethernet cabling, 802.3af/at compliant.',
      standardPrice: 599,
      dealerPrice: 399,
      isFeatured: false,
      isActive: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80', altText: 'Vinexus PoE Injector', sortOrder: 0 },
      ],
      specifications: [
        { key: 'Standard', value: '802.3af/at' },
        { key: 'Output Power', value: 'Up to 30W' },
      ],
    },
    {
      sku: 'UPS-BACKUP-1KVA-06',
      name: 'Vinexus 1KVA Line-Interactive UPS Backup',
      slug: 'vinexus-1kva-line-interactive-ups-backup',
      categoryId: categoryMap['accessories'],
      description: '1KVA/600W line-interactive UPS providing 15-30 minutes of backup runtime for NVR and networking equipment during power cuts.',
      standardPrice: 5999,
      dealerPrice: 4599,
      isFeatured: false,
      isActive: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80', altText: 'Vinexus 1KVA UPS Backup', sortOrder: 0 },
      ],
      specifications: [
        { key: 'Capacity', value: '1KVA / 600W' },
        { key: 'Backup Runtime', value: '15-30 minutes (typical NVR load)' },
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
