import mongoose from 'mongoose';
import '../src/config/env.js';
import { Category } from '../src/models/Category.js';
import { Product } from '../src/models/Product.js';

const PARENT_CATEGORIES = [
  {
    name: 'Desktop',
    slug: 'desktop',
    description: 'High-performance desktop PCs, workstations, all-in-one systems, and mini computers.',
    image: 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&w=800&q=80',
    sortOrder: 1,
    isActive: true,
    parentId: null,
  },
  {
    name: 'Laptop',
    slug: 'laptop',
    description: 'Business laptops, ultrabooks, mobile workstations, and computing notebooks.',
    image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=800&q=80',
    sortOrder: 2,
    isActive: true,
    parentId: null,
  },
  {
    name: 'Storage',
    slug: 'storage',
    description: 'Surveillance hard drives (WD Purple, Seagate SkyHawk), NVMe SSDs, NAS storage, and portable drives.',
    image: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=800&q=80',
    sortOrder: 3,
    isActive: true,
    parentId: null,
  },
  {
    name: 'Display',
    slug: 'display',
    description: 'Surveillance monitoring displays, professional IPS monitors, digital signage, and commercial screens.',
    image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80',
    sortOrder: 4,
    isActive: true,
    parentId: null,
  },
  {
    name: 'Peripherals',
    slug: 'peripherals',
    description: 'Keyboards, optical mice, surveillance controllers, headsets, and computer accessories.',
    image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
    sortOrder: 5,
    isActive: true,
    parentId: null,
  },
  {
    name: 'Printers & Scanners',
    slug: 'printers-scanners',
    description: 'Laserjet printers, barcode label printers, document scanners, and all-in-one printing equipment.',
    image: 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&w=800&q=80',
    sortOrder: 6,
    isActive: true,
    parentId: null,
  },
  {
    name: 'Security',
    slug: 'security',
    description: 'CCTV IP dome & bullet cameras, PTZ surveillance, DVR/NVR recorders, and biometric access control.',
    image: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=800&q=80',
    sortOrder: 7,
    isActive: true,
    parentId: null,
  },
  {
    name: 'Networking',
    slug: 'networking',
    description: 'Enterprise PoE switches, wireless Wi-Fi 6 routers, access points, and rackmount patch panels.',
    image: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=800&q=80',
    sortOrder: 8,
    isActive: true,
    parentId: null,
  },
  {
    name: 'Software',
    slug: 'software',
    description: 'Operating systems, surveillance VMS platforms, antivirus security suites, and office utilities.',
    image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
    sortOrder: 9,
    isActive: true,
    parentId: null,
  },
  {
    name: 'Mobility',
    slug: 'mobility',
    description: 'Industrial handhelds, 4G/5G mobile dongles, power banks, and portable enterprise tech.',
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80',
    sortOrder: 10,
    isActive: true,
    parentId: null,
  },
  {
    name: 'Cables',
    slug: 'cables',
    description: 'CAT6 / CAT6A UTP ethernet cables, 3+1 CCTV copper coaxial cables, fiber optic patch cords, and HDMI wires.',
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
    sortOrder: 11,
    isActive: true,
    parentId: null,
  },
  {
    name: 'Connector & Converter',
    slug: 'connector-converter',
    description: 'BNC connectors, RJ45 modular jacks, DC jacks, HDMI-to-VGA converters, and optical media transceivers.',
    image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
    sortOrder: 12,
    isActive: true,
    parentId: null,
  },
  {
    name: 'Accessories CCTV & Networking',
    slug: 'accessories-cctv-networking',
    description: 'CCTV power supply boxes, server network rack cabinets, camera mounting brackets, and tools.',
    image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
    sortOrder: 13,
    isActive: true,
    parentId: null,
  },
  {
    name: 'Telecom',
    slug: 'telecom',
    description: 'IP PBX telephone systems, VoIP SIP desk phones, intercom modules, and telecommunication hardware.',
    image: 'https://images.unsplash.com/photo-1534536281715-e28d76689b4d?auto=format&fit=crop&w=800&q=80',
    sortOrder: 14,
    isActive: true,
    parentId: null,
  },
];

async function updateParentCategories() {
  const mongodbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vinexus';
  await mongoose.connect(mongodbUri);
  console.log('Connected to MongoDB');

  // 1. Create or upsert the 14 new parent categories
  const newCatMap = {};
  for (const catData of PARENT_CATEGORIES) {
    let cat = await Category.findOne({ slug: catData.slug });
    if (cat) {
      Object.assign(cat, catData);
      cat = await cat.save();
      console.log(`Updated parent category: ${cat.name} (${cat._id})`);
    } else {
      cat = await Category.create(catData);
      console.log(`Created parent category: ${cat.name} (${cat._id})`);
    }
    newCatMap[cat.slug] = cat._id;
  }

  // 2. Re-assign existing products so they don't point to deleted categories
  const securityId = newCatMap['security'];
  const networkingId = newCatMap['networking'];

  const products = await Product.find({});
  console.log(`Found ${products.length} existing products.`);
  for (const p of products) {
    const nameLower = (p.name || '').toLowerCase();
    const isNetwork = nameLower.includes('router') || nameLower.includes('switch') || nameLower.includes('poe') || nameLower.includes('wifi') || nameLower.includes('modem');
    p.categoryId = isNetwork ? networkingId : securityId;
    await p.save();
  }
  console.log('All products successfully reassigned to new parent categories.');

  // 3. Remove old categories whose slugs are not in the new 14 parent categories list
  const allowedSlugs = PARENT_CATEGORIES.map(c => c.slug);
  const deleteResult = await Category.deleteMany({ slug: { $nin: allowedSlugs } });
  console.log(`Deleted ${deleteResult.deletedCount} old categories.`);

  // 4. Verify total categories in DB
  const remaining = await Category.find({}).sort({ sortOrder: 1 });
  console.log(`Remaining categories in database: ${remaining.length}`);
  remaining.forEach(c => console.log(`- [${c.sortOrder}] ${c.name} (slug: ${c.slug}, id: ${c._id}, parentId: ${c.parentId})`));

  await mongoose.disconnect();
  console.log('Done!');
}

updateParentCategories().catch(console.error);
