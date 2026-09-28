import dns from 'dns';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

// Ensure DNS resolves for MongoDB Atlas SRV records
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {
  // ignore
}

import mongoose from 'mongoose';
import { Product } from '../src/models/Product.js';
import { Category } from '../src/models/Category.js';

async function seed() {
  const uri = process.env.MONGODB_URI;
  console.log('Connecting to:', uri ? uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@') : 'NO URI FOUND!');
  if (!uri) throw new Error('MONGODB_URI missing');

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log('Connected to MongoDB Atlas successfully.');

  // Find all categories related to laptops
  const laptopCategories = await Category.find({
    $or: [
      { name: /laptop/i },
      { slug: /laptop/i }
    ]
  }).lean();

  console.log('Found laptop categories:', laptopCategories.map(c => ({ id: String(c._id), name: c.name, slug: c.slug })));
  const categoryIds = laptopCategories.map(c => c._id);

  // Find all active products in these categories
  const products = await Product.find({
    isActive: true,
    categoryId: { $in: categoryIds }
  });

  console.log(`Found ${products.length} products in laptop categories.`);

  // Specifically inspect 'Branded Laptops' / 'branded-laptops' / 'branded-laptop'
  const brandedLaptopCats = laptopCategories.filter(c => /branded/i.test(c.name) || /branded/i.test(c.slug));
  const brandedCatIds = new Set(brandedLaptopCats.map(c => String(c._id)));

  console.log(`Branded laptop category IDs:`, Array.from(brandedCatIds));

  // User requirement:
  // "sare products ki qunatity stock 6 ya 7 kro branded laptops me , taki maximum limit + krke check ho or toast show ho like given mega jaipur image
  // and kuch products ki quantity stock 5 se kam kro taki me dkh sku low stock sign kesa hota hai"

  // For branded laptops:
  // Prod 0: 6 (In Stock - test toast when reaching 6)
  // Prod 1: 7 (In Stock - test toast when reaching 7)
  // Prod 2: 3 (Low Stock - 🟡 badge)
  // Prod 3: 2 (Low Stock - 🟡 badge)
  // Prod 4: 0 (Out of Stock - 🟠 badge & disabled button)
  // Prod 5: 6 (In Stock)
  // Prod 6: 7 (In Stock)
  // Prod 7: 6 (In Stock)
  // Prod 8: 4 (Low Stock - 🟡 badge)
  // Prod 9: 7 (In Stock)

  const brandedStockSchedule = [6, 7, 3, 2, 0, 6, 7, 6, 4, 7];
  let brandedIdx = 0;
  let otherIdx = 0;

  for (let i = 0; i < products.length; i++) {
    const prod = products[i];
    const isBranded = brandedCatIds.has(String(prod.categoryId));

    let stockQty;
    if (isBranded) {
      stockQty = brandedStockSchedule[brandedIdx % brandedStockSchedule.length];
      brandedIdx++;
    } else {
      // General laptop accessories/spares: mostly in-stock (6, 7), some low stock (2, 3), some OOS (0)
      const generalPattern = [6, 7, 6, 7, 3, 6, 7, 0, 6, 2];
      stockQty = generalPattern[otherIdx % generalPattern.length];
      otherIdx++;
    }

    // Filter out existing Stock/Inventory specs
    const filteredSpecs = (prod.specifications || []).filter(
      (s) => !['stock', 'inventory'].includes((s.key || '').toLowerCase().trim())
    );

    // Set Stock spec
    prod.specifications = [...filteredSpecs, { key: 'Stock', value: String(stockQty) }];

    // Ensure modelNumber exists
    if (!prod.modelNumber) {
      prod.modelNumber = `VNX-${String(prod._id).slice(-8).toUpperCase()}`;
    }

    await prod.save();

    const badge = stockQty === 0 ? '🟠 OUT OF STOCK (0)' : stockQty < 5 ? `🟡 LOW STOCK (${stockQty})` : `🟢 IN STOCK (${stockQty})`;
    console.log(`[${(isBranded ? 'BRANDED' : 'LAPTOP').padEnd(7)}] ${badge.padEnd(25)} | ${prod.name.slice(0, 48).padEnd(50)} | Model: ${prod.modelNumber}`);
  }

  console.log(`\nDone! Successfully updated ${products.length} products on MongoDB Atlas.`);
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
