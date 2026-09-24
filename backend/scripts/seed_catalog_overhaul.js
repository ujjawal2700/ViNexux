import mongoose from 'mongoose';
import '../src/config/env.js';
import { Category } from '../src/models/Category.js';
import { Product } from '../src/models/Product.js';

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vinexus');
  console.log('MongoDB connected.');

  // Fetch all existing categories
  const allCategories = await Category.find({}).lean();
  console.log(`Found ${allCategories.length} existing categories.`);

  const getHeader = (slug) => allCategories.find((c) => !c.parentId && c.slug === slug);
  const getMain = (slug) => allCategories.find((c) => c.parentId && c.slug === slug);

  // 1. Add Subcategories under Gaming Laptops
  const gamingLaptopsMain = allCategories.find((c) => c.slug === 'gaming-laptops');
  if (!gamingLaptopsMain) {
    throw new Error('Gaming Laptops main category not found!');
  }

  const laptopSubcategoriesToEnsure = [
    {
      name: 'RXG 30',
      slug: 'rxg-30',
      parentId: gamingLaptopsMain._id,
      description: 'High-tier RXG 30 series gaming laptops with RTX 4070 / 4080.',
      isActive: true,
      sortOrder: 15,
    },
    {
      name: 'RXG 40',
      slug: 'rxg-40',
      parentId: gamingLaptopsMain._id,
      description: 'Flagship RXG 40 series extreme gaming laptops with RTX 4090 / Core Ultra 9.',
      isActive: true,
      sortOrder: 20,
    },
    {
      name: 'RXG 50',
      slug: 'rxg-50',
      parentId: gamingLaptopsMain._id,
      description: 'Ultra-enthusiast RXG 50 studio & creator workstation-grade gaming machines.',
      isActive: true,
      sortOrder: 25,
    },
  ];

  for (const sub of laptopSubcategoriesToEnsure) {
    const exists = await Category.findOne({ slug: sub.slug });
    if (!exists) {
      const created = await Category.create(sub);
      console.log(`Created laptop subcategory: ${created.name} (${created.slug})`);
    } else {
      console.log(`Subcategory ${sub.name} already exists.`);
    }
  }

  // 2. Ensure Main Categories exist for all Header categories
  const mainCategoriesToEnsure = [
    // Storage
    {
      name: 'Internal SSD & NVMe',
      slug: 'internal-ssd-nvme',
      headerSlug: 'storage',
      description: 'High-speed PCIe Gen 4/5 M.2 NVMe SSDs and 2.5-inch SATA internal drives.',
      image: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=800&q=80',
      sortOrder: 1,
    },
    {
      name: 'External Hard Drives',
      slug: 'external-hard-drives',
      headerSlug: 'storage',
      description: 'Portable USB 3.2 external hard drives and rugged backup storage.',
      image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
      sortOrder: 2,
    },
    {
      name: 'Surveillance Storage',
      slug: 'surveillance-storage',
      headerSlug: 'storage',
      description: '24/7 continuous recording surveillance internal hard drives (WD Purple, Seagate SkyHawk).',
      image: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=800&q=80',
      sortOrder: 3,
    },
    // Display
    {
      name: 'LED & IPS Monitors',
      slug: 'led-ips-monitors',
      headerSlug: 'display',
      description: 'Full HD and 4K professional office monitors, IPS panels with eye-care technology.',
      image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80',
      sortOrder: 1,
    },
    {
      name: 'High Refresh Gaming Monitors',
      slug: 'high-refresh-gaming-monitors',
      headerSlug: 'display',
      description: '144Hz - 240Hz curved and flat fast IPS gaming monitors with G-Sync/FreeSync.',
      image: 'https://images.unsplash.com/photo-1547082299-de196ea013d6?auto=format&fit=crop&w=800&q=80',
      sortOrder: 2,
    },
    // Peripherals
    {
      name: 'Keyboards & Mice Combos',
      slug: 'keyboards-mice-combos',
      headerSlug: 'peripherals',
      description: 'Wireless, mechanical, and silent keyboard & mouse combos for productivity and gaming.',
      image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
      sortOrder: 1,
    },
    {
      name: 'Webcams & Headsets',
      slug: 'webcams-headsets',
      headerSlug: 'peripherals',
      description: 'Full HD conference webcams and noise-cancelling business headsets.',
      image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
      sortOrder: 2,
    },
    // Printers & Scanners
    {
      name: 'Laser Printers',
      slug: 'laser-printers',
      headerSlug: 'printers-scanners',
      description: 'Monochrome and color all-in-one laser printers for fast high-volume printing.',
      image: 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&w=800&q=80',
      sortOrder: 1,
    },
    {
      name: 'Ink Tank Printers',
      slug: 'ink-tank-printers',
      headerSlug: 'printers-scanners',
      description: 'Ultra low-cost continuous ink tank printers with Wi-Fi connectivity.',
      image: 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&w=800&q=80',
      sortOrder: 2,
    },
    // Software
    {
      name: 'Operating Systems & Office',
      slug: 'operating-systems-office',
      headerSlug: 'software',
      description: 'Microsoft Windows 11 Pro OEM licenses and Microsoft Office suites.',
      image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
      sortOrder: 1,
    },
    {
      name: 'Antivirus & Endpoint Security',
      slug: 'antivirus-endpoint-security',
      headerSlug: 'software',
      description: 'Total security antivirus, malware protection, and enterprise endpoint software.',
      image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80',
      sortOrder: 2,
    },
    // Mobility
    {
      name: 'Laptop Bags & Sleeves',
      slug: 'laptop-bags-sleeves',
      headerSlug: 'mobility',
      description: 'Water-resistant laptop backpacks, messenger bags, and padded protective sleeves.',
      image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
      sortOrder: 1,
    },
    // Cables
    {
      name: 'HDMI & Display Cables',
      slug: 'hdmi-display-cables',
      headerSlug: 'cables',
      description: 'Premium high-speed HDMI 2.1 8K/4K and DisplayPort 1.4 monitor cables.',
      image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
      sortOrder: 1,
    },
    {
      name: 'Ethernet Patch Cables',
      slug: 'ethernet-patch-cables',
      headerSlug: 'cables',
      description: 'Cat6 and Cat6A snagless molded RJ45 gigabit ethernet patch cords.',
      image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
      sortOrder: 2,
    },
    // Connector & Converter
    {
      name: 'USB-C Hubs & Docking Stations',
      slug: 'usbc-hubs-docking-stations',
      headerSlug: 'connector-converter',
      description: 'Multi-port USB-C hubs with HDMI, Ethernet, USB 3.0, and 100W Power Delivery.',
      image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
      sortOrder: 1,
    },
    // Accessories CCTV & Networking
    {
      name: 'CCTV Power Supplies & SMPS',
      slug: 'cctv-power-supplies-smps',
      headerSlug: 'accessories-cctv-networking',
      description: 'Centralized 4, 8, and 16-channel 12V DC SMPS CCTV power supply boxes.',
      image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
      sortOrder: 1,
    },
    // Telecom
    {
      name: 'VoIP & IP Telephones',
      slug: 'voip-ip-telephones',
      headerSlug: 'telecom',
      description: 'SIP IP desk phones with PoE, HD audio, and dual Gigabit ethernet ports.',
      image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
      sortOrder: 1,
    },
    // Mobile
    {
      name: 'Enterprise Smartphones',
      slug: 'enterprise-smartphones',
      headerSlug: 'mobile',
      description: 'High-reliability enterprise mobile devices and 5G business smartphones.',
      image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80',
      sortOrder: 1,
    },
  ];

  for (const m of mainCategoriesToEnsure) {
    const parentHeader = getHeader(m.headerSlug);
    if (!parentHeader) {
      console.warn(`Header with slug "${m.headerSlug}" not found, skipping ${m.name}.`);
      continue;
    }
    const exists = await Category.findOne({ slug: m.slug });
    if (!exists) {
      const created = await Category.create({
        name: m.name,
        slug: m.slug,
        parentId: parentHeader._id,
        description: m.description,
        image: m.image,
        isActive: true,
        sortOrder: m.sortOrder,
      });
      console.log(`Created Main Category: ${created.name} under ${parentHeader.name}`);
    } else {
      console.log(`Main Category ${m.name} already exists.`);
    }
  }

  // Refresh all categories after creations
  const updatedCategories = await Category.find({}).lean();
  const catMap = new Map(updatedCategories.map((c) => [c.slug, c]));

  // 3. Remove ALL previous products
  const deleteResult = await Product.deleteMany({});
  console.log(`Deleted ${deleteResult.deletedCount} previous products.`);

  // 4. Seed Fresh Products
  const productsToSeed = [
    // ==========================================
    // LAPTOP SUBCATEGORIES (3-4 products specifically in laptop subcategories as requested)
    // ==========================================
    {
      sku: 'ROG-G16-RXG20-01',
      name: 'ASUS ROG Strix G16 RXG 20 Gaming Laptop',
      categorySlug: 'rxg-20',
      standardPrice: 139999,
      dealerPrice: 124999,
      isFeatured: true,
      description: 'Flagship ASUS ROG Strix G16 RXG 20 edition equipped with 13th Gen Intel Core i7-13650HX, NVIDIA GeForce RTX 4060 8GB GDDR6 (140W TGP), 16GB DDR5 4800MHz, 1TB PCIe 4.0 NVMe SSD, and 16-inch FHD+ 165Hz 100% sRGB display.',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=800&q=80',
          altText: 'ASUS ROG Strix G16 RXG 20',
          sortOrder: 0,
        },
      ],
      specifications: [
        { key: 'Brand', value: 'ASUS' },
        { key: 'Sub Category Series', value: 'RXG 20 Gaming' },
        { key: 'Processor', value: 'Intel Core i7-13650HX (14 cores, up to 4.9GHz)' },
        { key: 'Graphics', value: 'NVIDIA GeForce RTX 4060 8GB GDDR6 (140W TGP)' },
        { key: 'RAM', value: '16GB DDR5-4800 (expandable to 32GB)' },
        { key: 'Storage', value: '1TB M.2 NVMe PCIe 4.0 SSD' },
        { key: 'Display', value: '16-inch FHD+ (1920x1200) 165Hz, IPS-level' },
      ],
    },
    {
      sku: 'LEG-S5-RXG20-02',
      name: 'Lenovo Legion Slim 5 RXG 20 Custom Edition',
      categorySlug: 'rxg-20',
      standardPrice: 129999,
      dealerPrice: 114500,
      isFeatured: true,
      description: 'Lenovo Legion Slim 5 RXG 20 build features AMD Ryzen 7 7840HS, NVIDIA RTX 4060, 16GB DDR5, 1TB SSD, and 16-inch WQXGA 165Hz IPS screen with Legion ColdFront 5.0 cooling.',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=800&q=80',
          altText: 'Lenovo Legion Slim 5 RXG 20',
          sortOrder: 0,
        },
      ],
      specifications: [
        { key: 'Brand', value: 'Lenovo' },
        { key: 'Sub Category Series', value: 'RXG 20 Gaming' },
        { key: 'Processor', value: 'AMD Ryzen 7 7840HS (8 cores, up to 5.1GHz)' },
        { key: 'Graphics', value: 'NVIDIA GeForce RTX 4060 8GB GDDR6' },
        { key: 'RAM', value: '16GB DDR5 5600MHz' },
        { key: 'Display', value: '16-inch WQXGA (2560x1600) 165Hz 100% sRGB' },
      ],
    },
    {
      sku: 'ACR-PH16-RXG30-01',
      name: 'Acer Predator Helios Neo 16 RXG 30 Edition',
      categorySlug: 'rxg-30',
      standardPrice: 169999,
      dealerPrice: 151000,
      isFeatured: true,
      description: 'Acer Predator Helios Neo 16 RXG 30 high-power gaming machine. Powered by 14th Gen Intel Core i9-14900HX, NVIDIA GeForce RTX 4070 8GB GDDR6, 32GB DDR5 RAM, and 1TB Gen4 SSD with 5th Gen AeroBlade 3D fan cooling.',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=800&q=80',
          altText: 'Acer Predator Helios Neo 16 RXG 30',
          sortOrder: 0,
        },
      ],
      specifications: [
        { key: 'Brand', value: 'Acer Predator' },
        { key: 'Sub Category Series', value: 'RXG 30 Gaming' },
        { key: 'Processor', value: 'Intel Core i9-14900HX (24 cores, up to 5.8GHz)' },
        { key: 'Graphics', value: 'NVIDIA GeForce RTX 4070 8GB GDDR6 (140W)' },
        { key: 'RAM', value: '32GB DDR5 5600MHz Dual-Channel' },
        { key: 'Display', value: '16-inch WQXGA 240Hz, 100% DCI-P3 500 nits' },
      ],
    },
    {
      sku: 'MSI-S16-RXG40-01',
      name: 'MSI Stealth 16 Studio RXG 40 AI Extreme',
      categorySlug: 'rxg-40',
      standardPrice: 249999,
      dealerPrice: 224000,
      isFeatured: true,
      description: 'Ultra-thin magnesium-aluminum alloy chassis packing Intel Core Ultra 9 185H processor, NVIDIA GeForce RTX 4080 12GB GDDR6, 32GB DDR5, 2TB PCIe 4.0 SSD, and 16-inch UHD+ 120Hz Mini-LED display.',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=800&q=80',
          altText: 'MSI Stealth 16 Studio RXG 40',
          sortOrder: 0,
        },
      ],
      specifications: [
        { key: 'Brand', value: 'MSI' },
        { key: 'Sub Category Series', value: 'RXG 40 AI Extreme' },
        { key: 'Processor', value: 'Intel Core Ultra 9 185H (16 cores, NPU AI ready)' },
        { key: 'Graphics', value: 'NVIDIA GeForce RTX 4080 12GB GDDR6' },
        { key: 'RAM', value: '32GB DDR5 5600MHz' },
        { key: 'Storage', value: '2TB PCIe 4.0 NVMe SSD' },
        { key: 'Display', value: '16-inch UHD+ 120Hz Mini-LED DisplayHDR 1000' },
      ],
    },
    {
      sku: 'ASUS-TUF-A15-RTX40',
      name: 'ASUS TUF Gaming A15 RTX 40-Series Laptop',
      categorySlug: 'rtx-gaming-laptops',
      standardPrice: 94999,
      dealerPrice: 84999,
      isFeatured: false,
      description: 'Military-grade certified ASUS TUF Gaming A15 equipped with AMD Ryzen 7 7735HS, NVIDIA GeForce RTX 4050 6GB GDDR6, 16GB DDR5, 512GB SSD, and 144Hz Adaptive-Sync display.',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
          altText: 'ASUS TUF Gaming A15',
          sortOrder: 0,
        },
      ],
      specifications: [
        { key: 'Brand', value: 'ASUS' },
        { key: 'Graphics', value: 'NVIDIA GeForce RTX 4050 6GB' },
        { key: 'Processor', value: 'AMD Ryzen 7 7735HS' },
      ],
    },

    // ==========================================
    // MAIN CATEGORIES: DESKTOP
    // ==========================================
    {
      sku: 'HP-PD-400G9-01',
      name: 'HP ProDesk 400 G9 Microtower Business Desktop PC',
      categorySlug: 'all-in-one-pcs',
      standardPrice: 58500,
      dealerPrice: 51200,
      isFeatured: true,
      description: 'Commercial-grade HP ProDesk 400 G9 powered by 13th Gen Intel Core i5-13500, 16GB DDR4 RAM, 512GB M.2 NVMe SSD, Windows 11 Pro, and HP Wolf Pro Security.',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&w=800&q=80',
          altText: 'HP ProDesk 400 G9 Desktop PC',
          sortOrder: 0,
        },
      ],
      specifications: [
        { key: 'Brand', value: 'HP' },
        { key: 'Form Factor', value: 'Microtower PC' },
        { key: 'Processor', value: 'Intel Core i5-13500 (14 Cores, 20 Threads)' },
        { key: 'Memory', value: '16GB DDR4-3200 RAM' },
        { key: 'Storage', value: '512GB PCIe NVMe SSD' },
        { key: 'OS', value: 'Windows 11 Professional' },
      ],
    },
    {
      sku: 'DEL-OPT-7010-02',
      name: 'Dell OptiPlex 7010 Small Form Factor Enterprise PC',
      categorySlug: 'all-in-one-pcs',
      standardPrice: 64900,
      dealerPrice: 56800,
      isFeatured: false,
      description: 'Space-saving Dell OptiPlex 7010 SFF with Intel Core i7-13700, 16GB DDR5 RAM, 1TB NVMe SSD, Intel vPro enterprise management, and TPM 2.0 security.',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1587831990711-23ca6441447b?auto=format&fit=crop&w=800&q=80',
          altText: 'Dell OptiPlex 7010 SFF',
          sortOrder: 0,
        },
      ],
      specifications: [
        { key: 'Brand', value: 'Dell' },
        { key: 'Form Factor', value: 'Small Form Factor (SFF)' },
        { key: 'Processor', value: 'Intel Core i7-13700 (16 cores, up to 5.2GHz)' },
        { key: 'RAM', value: '16GB DDR5 4800MHz' },
      ],
    },
    {
      sku: 'ASUS-ROG-GT15-01',
      name: 'ASUS ROG Strix GT15 High-Performance Gaming Desktop',
      categorySlug: 'gaming-desktops',
      standardPrice: 145000,
      dealerPrice: 129000,
      isFeatured: true,
      description: 'Tournament-ready ASUS ROG Strix GT15 desktop featuring Intel Core i7-13700KF, NVIDIA GeForce RTX 4070 12GB, 32GB DDR4 RAM, 1TB PCIe 4.0 SSD, liquid cooling, and Aura Sync RGB.',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=800&q=80',
          altText: 'ASUS ROG Strix Gaming Desktop',
          sortOrder: 0,
        },
      ],
      specifications: [
        { key: 'Brand', value: 'ASUS ROG' },
        { key: 'Graphics Card', value: 'NVIDIA GeForce RTX 4070 12GB GDDR6X' },
        { key: 'Cooling', value: '240mm AIO Liquid Cooling' },
        { key: 'Power Supply', value: '750W 80+ Gold' },
      ],
    },
    {
      sku: 'LEN-TS-P360-01',
      name: 'Lenovo ThinkStation P360 Tower CAD Workstation',
      categorySlug: 'tower-workstations',
      standardPrice: 185000,
      dealerPrice: 168000,
      isFeatured: false,
      description: 'ISV-certified professional tower workstation with Intel Core i9-12900K, NVIDIA RTX A4000 16GB workstation GPU, 64GB ECC DDR5 RAM, and dual 1TB NVMe PCIe Gen4 SSDs.',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=800&q=80',
          altText: 'Lenovo ThinkStation Workstation',
          sortOrder: 0,
        },
      ],
      specifications: [
        { key: 'Brand', value: 'Lenovo ThinkStation' },
        { key: 'ISV Certifications', value: 'AutoCAD, SolidWorks, Revit, Adobe Premiere' },
        { key: 'GPU', value: 'NVIDIA RTX A4000 16GB ECC GDDR6' },
      ],
    },

    // ==========================================
    // MAIN CATEGORIES: LAPTOP
    // ==========================================
    {
      sku: 'HP-EB-840G10-01',
      name: 'HP EliteBook 840 G10 Enterprise Business Laptop',
      categorySlug: 'business-laptops',
      standardPrice: 112000,
      dealerPrice: 99500,
      isFeatured: true,
      description: 'Premium lightweight corporate laptop featuring Intel Core i7-1355U, 16GB DDR5, 512GB NVMe SSD, 14-inch WUXGA 400 nits anti-glare display, 5MP IR webcam with privacy shutter, and HP Sure Start Gen7.',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=800&q=80',
          altText: 'HP EliteBook 840 G10',
          sortOrder: 0,
        },
      ],
      specifications: [
        { key: 'Brand', value: 'HP' },
        { key: 'Processor', value: 'Intel Core i7-1355U 10 Cores' },
        { key: 'Display', value: '14-inch WUXGA (1920x1200) IPS 400 nits' },
        { key: 'Battery', value: '51Wh with Fast Charge' },
      ],
    },
    {
      sku: 'HP-OMEN-16-01',
      name: 'HP Omen 16 High-Performance Gaming Laptop',
      categorySlug: 'gaming-laptops',
      standardPrice: 149999,
      dealerPrice: 135000,
      isFeatured: true,
      description: 'HP Omen 16 premium gaming laptop with AMD Ryzen 7 7840HS, NVIDIA RTX 4070 8GB GPU, 16GB DDR5 5600MHz RAM, 1TB Gen4 SSD, and OMEN Tempest cooling system.',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80',
          altText: 'HP Omen 16 Laptop',
          sortOrder: 0,
        },
      ],
      specifications: [
        { key: 'Brand', value: 'HP Omen' },
        { key: 'Processor', value: 'AMD Ryzen 7 7840HS' },
        { key: 'Graphics', value: 'NVIDIA GeForce RTX 4070 8GB' },
        { key: 'Display', value: '16.1-inch QHD 240Hz 3ms IPS' },
      ],
    },
    {
      sku: 'DEL-INS-15-01',
      name: 'Dell Inspiron 15 3520 Everyday Laptop',
      categorySlug: 'branded-laptops',
      standardPrice: 46990,
      dealerPrice: 41200,
      isFeatured: false,
      description: 'Reliable everyday notebook with 12th Gen Intel Core i5-1235U, 8GB DDR4 RAM, 512GB M.2 SSD, 15.6-inch FHD 120Hz anti-glare display, and Windows 11 Home.',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=800&q=80',
          altText: 'Dell Inspiron 15',
          sortOrder: 0,
        },
      ],
      specifications: [
        { key: 'Brand', value: 'Dell' },
        { key: 'Processor', value: 'Intel Core i5-1235U' },
        { key: 'Screen Size', value: '15.6 inch FHD 120Hz' },
      ],
    },

    // ==========================================
    // MAIN CATEGORIES: STORAGE
    // ==========================================
    {
      sku: 'SAM-990PRO-2TB-01',
      name: 'Samsung 990 PRO 2TB PCIe 4.0 NVMe M.2 Internal SSD',
      categorySlug: 'internal-ssd-nvme',
      standardPrice: 17999,
      dealerPrice: 15400,
      isFeatured: true,
      description: 'Blazing fast sequential read speeds up to 7,450 MB/s and write speeds up to 6,900 MB/s. Powered by Samsung in-house Pascal controller and V-NAND TLC.',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=800&q=80',
          altText: 'Samsung 990 PRO NVMe SSD',
          sortOrder: 0,
        },
      ],
      specifications: [
        { key: 'Brand', value: 'Samsung' },
        { key: 'Capacity', value: '2TB' },
        { key: 'Interface', value: 'PCIe Gen 4.0 x4, NVMe 2.0' },
        { key: 'Read Speed', value: 'Up to 7,450 MB/s' },
        { key: 'Write Speed', value: 'Up to 6,900 MB/s' },
      ],
    },
    {
      sku: 'WD-PURPLE-4TB-01',
      name: 'WD Purple 4TB Surveillance Internal Hard Drive 3.5"',
      categorySlug: 'surveillance-storage',
      standardPrice: 8999,
      dealerPrice: 7450,
      isFeatured: true,
      description: 'Engineered specifically for 24/7 DVR and NVR surveillance systems. Features AllFrame technology to reduce video frame drops and supports up to 64 HD video streams.',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=800&q=80',
          altText: 'WD Purple 4TB Surveillance HDD',
          sortOrder: 0,
        },
      ],
      specifications: [
        { key: 'Brand', value: 'Western Digital' },
        { key: 'Capacity', value: '4TB' },
        { key: 'Form Factor', value: '3.5 inch' },
        { key: 'Workload Rating', value: '180 TB/year' },
        { key: 'Cameras Supported', value: 'Up to 64 HD Cameras' },
      ],
    },
    {
      sku: 'WD-PASSPORT-2TB-01',
      name: 'WD My Passport 2TB Portable External Hard Drive USB 3.2',
      categorySlug: 'external-hard-drives',
      standardPrice: 6299,
      dealerPrice: 5199,
      isFeatured: false,
      description: 'Sleek, durable external hard drive with hardware 256-bit AES encryption and password protection. USB 3.2 Gen 1 super-speed interface.',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
          altText: 'WD My Passport 2TB',
          sortOrder: 0,
        },
      ],
      specifications: [
        { key: 'Brand', value: 'Western Digital' },
        { key: 'Capacity', value: '2TB' },
        { key: 'Connectivity', value: 'USB 3.2 Gen 1' },
      ],
    },

    // ==========================================
    // MAIN CATEGORIES: DISPLAY
    // ==========================================
    {
      sku: 'DEL-P2422H-01',
      name: 'Dell 24" IPS FHD Professional Office Monitor (P2422H)',
      categorySlug: 'led-ips-monitors',
      standardPrice: 15499,
      dealerPrice: 13200,
      isFeatured: true,
      description: '23.8-inch Full HD (1920x1080) IPS monitor with ultra-thin bezel, ComfortView Plus hardware low blue light, height adjustable stand, pivot, tilt, and swivel.',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80',
          altText: 'Dell P2422H 24-inch Monitor',
          sortOrder: 0,
        },
      ],
      specifications: [
        { key: 'Brand', value: 'Dell' },
        { key: 'Display Size', value: '23.8 inch (60.47 cm)' },
        { key: 'Panel Type', value: 'In-Plane Switching (IPS)' },
        { key: 'Ports', value: 'HDMI 1.4, DisplayPort 1.2, VGA, 4x USB 3.2' },
      ],
    },
    {
      sku: 'SAM-ODY-G5-01',
      name: 'Samsung Odyssey G5 27" Curved 165Hz QHD Gaming Monitor',
      categorySlug: 'high-refresh-gaming-monitors',
      standardPrice: 22999,
      dealerPrice: 19800,
      isFeatured: true,
      description: '1000R curvature matching the human eye, WQHD (2560x1440) resolution, rapid 165Hz refresh rate, 1ms response time (MPRT), and AMD FreeSync Premium.',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1547082299-de196ea013d6?auto=format&fit=crop&w=800&q=80',
          altText: 'Samsung Odyssey G5 Gaming Monitor',
          sortOrder: 0,
        },
      ],
      specifications: [
        { key: 'Brand', value: 'Samsung' },
        { key: 'Resolution', value: 'WQHD (2560 x 1440)' },
        { key: 'Refresh Rate', value: '165Hz' },
        { key: 'Curvature', value: '1000R Curve' },
      ],
    },

    // ==========================================
    // MAIN CATEGORIES: PERIPHERALS
    // ==========================================
    {
      sku: 'LOG-MK295-01',
      name: 'Logitech MK295 Silent Wireless Keyboard and Mouse Combo',
      categorySlug: 'keyboards-mice-combos',
      standardPrice: 2895,
      dealerPrice: 2250,
      isFeatured: true,
      description: 'Innovative SilentTouch technology eliminates over 90% of clicking and typing noise while maintaining tactile feel. 2.4GHz wireless with 10m reliable range.',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
          altText: 'Logitech MK295 Combo',
          sortOrder: 0,
        },
      ],
      specifications: [
        { key: 'Brand', value: 'Logitech' },
        { key: 'Connectivity', value: '2.4 GHz USB Nano Receiver' },
        { key: 'Battery Life', value: '36-month keyboard / 18-month mouse' },
      ],
    },
    {
      sku: 'LOG-C920-01',
      name: 'Logitech C920 HD Pro Webcam Full HD 1080p',
      categorySlug: 'webcams-headsets',
      standardPrice: 7995,
      dealerPrice: 6200,
      isFeatured: false,
      description: 'Industry-standard Full HD 1080p video calling and recording at 30fps. Stereo dual microphones with automatic noise reduction and premium glass lens.',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
          altText: 'Logitech C920 Webcam',
          sortOrder: 0,
        },
      ],
      specifications: [
        { key: 'Brand', value: 'Logitech' },
        { key: 'Video Resolution', value: '1080p/30fps - 720p/30fps' },
        { key: 'Microphone', value: 'Dual stereo omni-directional mics' },
      ],
    },

    // ==========================================
    // MAIN CATEGORIES: PRINTERS & SCANNERS
    // ==========================================
    {
      sku: 'HP-LJ-4104-01',
      name: 'HP LaserJet Pro MFP 4104fdw All-in-One Laser Printer',
      categorySlug: 'laser-printers',
      standardPrice: 42500,
      dealerPrice: 37200,
      isFeatured: true,
      description: 'Fast, high-yield multifunction monochrome laser printer with print, scan, copy, and fax. Blazing speed up to 42 ppm, dual-sided scanning, and dual-band Wi-Fi.',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&w=800&q=80',
          altText: 'HP LaserJet Pro MFP 4104fdw',
          sortOrder: 0,
        },
      ],
      specifications: [
        { key: 'Brand', value: 'HP' },
        { key: 'Print Speed', value: 'Up to 42 pages per minute' },
        { key: 'Functions', value: 'Print, Copy, Scan, Fax' },
        { key: 'Duty Cycle', value: 'Up to 80,000 pages per month' },
      ],
    },
    {
      sku: 'EPS-L3250-01',
      name: 'Epson EcoTank L3250 Wi-Fi All-in-One Color Ink Tank Printer',
      categorySlug: 'ink-tank-printers',
      standardPrice: 14999,
      dealerPrice: 12850,
      isFeatured: false,
      description: 'Ultra-low cost color printing. High-yield ink bottles yield up to 4,500 black and 7,500 color pages. Wi-Fi and Wi-Fi Direct with Epson Smart Panel app support.',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&w=800&q=80',
          altText: 'Epson EcoTank L3250',
          sortOrder: 0,
        },
      ],
      specifications: [
        { key: 'Brand', value: 'Epson' },
        { key: 'Print Technology', value: 'Heat-Free Ink Tank System' },
        { key: 'Connectivity', value: 'USB 2.0, Wi-Fi, Wi-Fi Direct' },
      ],
    },

    // ==========================================
    // MAIN CATEGORIES: SECURITY & SURVEILLANCE
    // ==========================================
    {
      sku: 'DAH-4K-WIZ-01',
      name: 'Dahua 4K WizSense Outdoor Bullet IP Security Camera',
      categorySlug: 'cctv-cameras',
      standardPrice: 6200,
      dealerPrice: 4400,
      isFeatured: true,
      description: '8MP 4K Ultra HD Starlight IP camera with built-in AI perimeter protection, human and vehicle classification, SMD 4.0, 50m Smart IR night vision, and IP67 weather resistance.',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=800&q=80',
          altText: 'Dahua 4K WizSense Bullet Camera',
          sortOrder: 0,
        },
      ],
      specifications: [
        { key: 'Brand', value: 'Dahua' },
        { key: 'Resolution', value: '4K 8MP (3840 x 2160 @ 30fps)' },
        { key: 'Sensor', value: '1/2.8" CMOS Starlight' },
        { key: 'Weatherproof', value: 'IP67 rated' },
      ],
    },
    {
      sku: 'HIK-4MP-COLOR-01',
      name: 'Hikvision 4MP ColorVu PoE Dome Security Camera',
      categorySlug: 'cctv-cameras',
      standardPrice: 5499,
      dealerPrice: 3950,
      isFeatured: false,
      description: 'Full-time color imaging 24/7 with F1.0 super-aperture lens and warm supplemental light. 4MP resolution, H.265+ compression, and built-in microphone for real-time audio.',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b7?auto=format&fit=crop&w=800&q=80',
          altText: 'Hikvision 4MP ColorVu Camera',
          sortOrder: 0,
        },
      ],
      specifications: [
        { key: 'Brand', value: 'Hikvision' },
        { key: 'Resolution', value: '4MP (2560 x 1440)' },
        { key: 'Technology', value: 'ColorVu 24/7 Full Color' },
      ],
    },
    {
      sku: 'HIK-16CH-NVR-01',
      name: 'Hikvision 16-Channel 4K Network Video Recorder (NVR)',
      categorySlug: 'video-recorders',
      standardPrice: 18900,
      dealerPrice: 15400,
      isFeatured: true,
      description: '16-channel 4K NVR supporting up to 12MP IP camera decoding. Dual SATA interfaces supporting up to 20TB total storage, HDMI 4K video output, and smart search playback.',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
          altText: 'Hikvision 16CH NVR',
          sortOrder: 0,
        },
      ],
      specifications: [
        { key: 'Brand', value: 'Hikvision' },
        { key: 'Channels', value: '16 IP Channels' },
        { key: 'Max Decoding', value: 'Up to 4K (3840 x 2160)' },
        { key: 'SATA Slots', value: '2 SATA interfaces (up to 10TB per HDD)' },
      ],
    },

    // ==========================================
    // MAIN CATEGORIES: NETWORKING
    // ==========================================
    {
      sku: 'TPL-AX73-01',
      name: 'TP-Link Archer AX73 AX5400 Dual-Band Gigabit Wi-Fi 6 Router',
      categorySlug: 'routers-gateways',
      standardPrice: 8499,
      dealerPrice: 6999,
      isFeatured: true,
      description: 'Next-gen AX5400 speeds (4804 Mbps on 5GHz and 574 Mbps on 2.4GHz), 6 high-gain antennas with Beamforming, 4T4R structure, USB 3.0 sharing, and HomeShield security.',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
          altText: 'TP-Link Archer AX73 Router',
          sortOrder: 0,
        },
      ],
      specifications: [
        { key: 'Brand', value: 'TP-Link' },
        { key: 'Wi-Fi Standard', value: 'Wi-Fi 6 (802.11ax)' },
        { key: 'Speed', value: 'AX5400 (4804 Mbps + 574 Mbps)' },
        { key: 'Antennas', value: '6 external antennas' },
      ],
    },
    {
      sku: 'TPL-SG1016PE-01',
      name: 'TP-Link TL-SG1016PE 16-Port Gigabit Easy Smart PoE+ Switch',
      categorySlug: 'network-switches',
      standardPrice: 13999,
      dealerPrice: 11800,
      isFeatured: true,
      description: '16 10/100/1000Mbps RJ45 ports including 8 PoE+ ports with 150W total power budget. Ideal for surveillance IP cameras and access points.',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
          altText: 'TP-Link 16-Port Gigabit PoE Switch',
          sortOrder: 0,
        },
      ],
      specifications: [
        { key: 'Brand', value: 'TP-Link' },
        { key: 'Ports', value: '16 Gigabit Ports (8 PoE+ ports)' },
        { key: 'PoE Power Budget', value: '150 Watts' },
        { key: 'Switching Capacity', value: '32 Gbps' },
      ],
    },

    // ==========================================
    // MAIN CATEGORIES: SOFTWARE
    // ==========================================
    {
      sku: 'MS-WIN11-PRO-01',
      name: 'Microsoft Windows 11 Professional 64-Bit OEM License',
      categorySlug: 'operating-systems-office',
      standardPrice: 11999,
      dealerPrice: 9400,
      isFeatured: false,
      description: 'Genuine Microsoft Windows 11 Pro 64-bit lifetime license for 1 PC. Includes BitLocker device encryption, Windows Information Protection, and Remote Desktop.',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
          altText: 'Windows 11 Pro License',
          sortOrder: 0,
        },
      ],
      specifications: [
        { key: 'Brand', value: 'Microsoft' },
        { key: 'License Type', value: 'Lifetime OEM 1 PC' },
        { key: 'Architecture', value: '64-bit' },
      ],
    },
    {
      sku: 'QH-TOTAL-SEC-01',
      name: 'Quick Heal Total Security Multi-Device (3 Years / 1 PC)',
      categorySlug: 'antivirus-endpoint-security',
      standardPrice: 2499,
      dealerPrice: 1750,
      isFeatured: false,
      description: 'Robust antivirus and ransomware protection, safe banking shields, parental controls, and anti-keylogger defense for desktop workstations and laptops.',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80',
          altText: 'Quick Heal Total Security',
          sortOrder: 0,
        },
      ],
      specifications: [
        { key: 'Brand', value: 'Quick Heal' },
        { key: 'Duration', value: '3 Years' },
        { key: 'Protection', value: 'Anti-Ransomware, Web Security, Firewall' },
      ],
    },

    // ==========================================
    // MAIN CATEGORIES: MOBILITY, CABLES, CONNECTORS, ACCESSORIES, TELECOM
    // ==========================================
    {
      sku: 'LEN-BP-156-01',
      name: 'Lenovo 15.6" Casual Water-Resistant Laptop Backpack B210',
      categorySlug: 'laptop-bags-sleeves',
      standardPrice: 1499,
      dealerPrice: 999,
      isFeatured: false,
      description: 'Durable, water-repellent snow yarn polyester fabric and streamlined design with padded interior compartment protecting laptops up to 15.6 inches.',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
          altText: 'Lenovo B210 Laptop Backpack',
          sortOrder: 0,
        },
      ],
      specifications: [
        { key: 'Brand', value: 'Lenovo' },
        { key: 'Material', value: 'Water-Repellent Polyester' },
        { key: 'Max Screen Size', value: '15.6 inches' },
      ],
    },
    {
      sku: 'AMZ-HDMI-3M-01',
      name: 'AmazonBasics High-Speed 4K HDMI 2.0 Cable (3 Meters / 10 Feet)',
      categorySlug: 'hdmi-display-cables',
      standardPrice: 599,
      dealerPrice: 380,
      isFeatured: false,
      description: 'Gold-plated connectors for corrosion resistance, 18 Gbps bandwidth, supporting 4K video at 60Hz, 2160p, 48-bit Deep Color, and Audio Return Channel (ARC).',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
          altText: 'High Speed HDMI Cable',
          sortOrder: 0,
        },
      ],
      specifications: [
        { key: 'Brand', value: 'AmazonBasics' },
        { key: 'Length', value: '3 Meters (10 Feet)' },
        { key: 'Standard', value: 'HDMI 2.0 (4K @ 60Hz)' },
      ],
    },
    {
      sku: 'ANK-7IN1-HUB-01',
      name: 'Anker 7-in-1 USB-C Hub with 4K HDMI, 100W PD, and SD Reader',
      categorySlug: 'usbc-hubs-docking-stations',
      standardPrice: 4299,
      dealerPrice: 3450,
      isFeatured: true,
      description: 'Massive expansion with 4K HDMI port at 30Hz, 100W Power Delivery pass-through, SD & microSD card readers, and 3 USB 3.0 data ports up to 5Gbps.',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
          altText: 'Anker 7-in-1 USB-C Hub',
          sortOrder: 0,
        },
      ],
      specifications: [
        { key: 'Brand', value: 'Anker' },
        { key: 'Input', value: 'USB-C' },
        { key: 'Power Delivery', value: '100W Pass-Through Charging' },
      ],
    },
    {
      sku: 'CPP-SMPS-8CH-01',
      name: 'CP PLUS 8-Channel 12V 10A CCTV Centralized SMPS Power Supply',
      categorySlug: 'cctv-power-supplies-smps',
      standardPrice: 1899,
      dealerPrice: 1250,
      isFeatured: false,
      description: 'Heavy-duty regulated CCTV power supply with surge protection, short-circuit auto-recovery, and individual fuse protection for up to 8 surveillance cameras.',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
          altText: 'CP PLUS 8CH SMPS Power Supply',
          sortOrder: 0,
        },
      ],
      specifications: [
        { key: 'Brand', value: 'CP PLUS' },
        { key: 'Output Voltage', value: '12V DC, 10 Amperes' },
        { key: 'Channels', value: '8 Independent Camera Channels' },
      ],
    },
    {
      sku: 'GS-GXP1625-01',
      name: 'Grandstream GXP1625 HD 2-Line PoE IP Telephone',
      categorySlug: 'voip-ip-telephones',
      standardPrice: 3990,
      dealerPrice: 3200,
      isFeatured: false,
      description: 'Reliable IP phone for small-to-medium businesses. Features 2 lines, 3 XML programmable soft keys, HD audio, integrated PoE, and 132x48 backlit LCD screen.',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
          altText: 'Grandstream GXP1625 IP Phone',
          sortOrder: 0,
        },
      ],
      specifications: [
        { key: 'Brand', value: 'Grandstream' },
        { key: 'SIP Accounts', value: '2 SIP Accounts' },
        { key: 'Power over Ethernet', value: 'Integrated PoE (802.3af)' },
      ],
    },
    {
      sku: 'SAM-A55-5G-01',
      name: 'Samsung Galaxy A55 5G Enterprise Edition (8GB/128GB)',
      categorySlug: 'enterprise-smartphones',
      standardPrice: 36999,
      dealerPrice: 32500,
      isFeatured: false,
      description: 'Enterprise-ready smartphone with Samsung Knox security platform, IP67 dust and water resistance, 50MP OIS camera, and 5-year security updates.',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80',
          altText: 'Samsung Galaxy A55 5G',
          sortOrder: 0,
        },
      ],
      specifications: [
        { key: 'Brand', value: 'Samsung' },
        { key: 'Security', value: 'Samsung Knox Vault' },
        { key: 'Display', value: '6.6 inch Super AMOLED 120Hz' },
        { key: 'Network', value: '5G Dual SIM' },
      ],
    },
  ];

  let createdCount = 0;
  for (const p of productsToSeed) {
    const targetCat = catMap.get(p.categorySlug);
    if (!targetCat) {
      console.warn(`Category slug "${p.categorySlug}" not found! Skipping product ${p.name}`);
      continue;
    }

    await Product.create({
      sku: p.sku,
      name: p.name,
      categoryId: targetCat._id,
      description: p.description,
      images: p.images,
      specifications: p.specifications,
      standardPrice: p.standardPrice,
      dealerPrice: p.dealerPrice,
      isFeatured: !!p.isFeatured,
      isActive: true,
    });
    createdCount++;
    console.log(`[Created] "${p.name}" under [${targetCat.name}] (Slug: ${targetCat.slug})`);
  }

  console.log(`\nSuccessfully created ${createdCount} fresh products across categories.`);
  await mongoose.disconnect();
  console.log('Done!');
}

main().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
