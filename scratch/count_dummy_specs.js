import { connectDB, disconnectDB } from '../backend/src/config/db.js';
import Product from '../backend/src/models/Product.js';

async function countDummySpecs() {
  try {
    await connectDB();
    const regex = /^(highlight|hsn|variant|stock|inventory|country of origin|warranty)/i;
    const productsWithDummy = await Product.find({
      'specifications.key': { $regex: regex }
    }, 'name sku specifications').lean();

    console.log(`Found ${productsWithDummy.length} products with hardcoded/dummy spec keys.`);
    
    let totalDummies = 0;
    const dummyKeyCounts = {};
    productsWithDummy.forEach(p => {
      p.specifications.forEach(s => {
        if (regex.test(s.key)) {
          totalDummies++;
          dummyKeyCounts[s.key] = (dummyKeyCounts[s.key] || 0) + 1;
        }
      });
    });
    console.log('Dummy keys breakdown:', dummyKeyCounts);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await disconnectDB();
  }
}

countDummySpecs();
