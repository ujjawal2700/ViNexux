import { connectDB, disconnectDB } from '../backend/src/config/db.js';
import Product from '../backend/src/models/Product.js';

async function checkProducts() {
  try {
    await connectDB();
    const products = await Product.find({}, 'name sku specifications').lean();
    console.log(`Found ${products.length} products`);
    const allKeys = new Set();
    products.forEach((p) => {
      (p.specifications || []).forEach((s) => allKeys.add(s.key));
    });
    console.log('All spec keys across products:', Array.from(allKeys));
    products.slice(0, 5).forEach((p) => {
      console.log(`Product: ${p.name} (${p.sku})`);
      console.log('Specs:', p.specifications);
    });
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await disconnectDB();
  }
}

checkProducts();
