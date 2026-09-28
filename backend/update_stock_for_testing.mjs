/**
 * Script: update_stock_for_testing.js
 * Updates first 20 products with varied stock quantities for testing In Stock/Low Stock/Out of Stock UI
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const productSchema = new mongoose.Schema({
  name: String,
  sku: String,
  specifications: [{ key: String, value: String }],
}, { strict: false });

const Product = mongoose.model('Product', productSchema);

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://dipeshgurjer000_db_user:FWyhcSlHzKC1KDR7@vinexusdatabase.onegosp.mongodb.net/vinexus';

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // Get first 20 active products
  const products = await Product.find({ isActive: true }).limit(20).lean();
  console.log(`Found ${products.length} products`);

  // Stock distribution: ~5 out-of-stock, ~5 low-stock(1-4), rest in-stock(5+)
  const stockValues = [
    0, 0, 0, 0, 0,        // 5 out of stock
    1, 2, 3, 4, 4,        // 5 low stock
    6, 8, 10, 12, 15,     // 5 in stock (medium)
    20, 25, 30, 50, 100,  // 5 in stock (high)
  ];

  for (let i = 0; i < products.length; i++) {
    const prod = products[i];
    const stockQty = stockValues[i] ?? 25;

    // Remove old stock/inventory spec and set new one
    const filteredSpecs = (prod.specifications || []).filter(
      (s) => !['stock', 'inventory'].includes((s.key || '').toLowerCase().trim())
    );

    await Product.updateOne(
      { _id: prod._id },
      {
        $set: {
          specifications: [...filteredSpecs, { key: 'Stock', value: String(stockQty) }],
        },
      }
    );

    const label = stockQty === 0 ? '❌ OUT' : stockQty < 5 ? '⚠️ LOW' : '✅ IN';
    console.log(`  [${label} STOCK=${stockQty}] ${prod.name?.slice(0, 50)}`);
  }

  console.log('\nDone! Stock quantities updated.');
  await mongoose.disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
