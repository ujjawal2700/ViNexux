import { connectDB, disconnectDB } from '../backend/src/config/db.js';
import Product from '../backend/src/models/Product.js';

async function cleanupProductSpecs() {
  try {
    await connectDB();
    const regex = /^(highlight|hsn|variant|stock|inventory|country of origin|warranty)/i;

    const beforeProducts = await Product.find({
      'specifications.key': { $regex: regex }
    }, 'name sku specifications').lean();

    console.log(`Before cleanup: ${beforeProducts.length} products have dummy/hardcoded spec keys.`);

    const result = await Product.updateMany(
      {},
      {
        $pull: {
          specifications: {
            key: { $regex: regex }
          }
        }
      }
    );

    console.log(`Update result: matched ${result.matchedCount}, modified ${result.modifiedCount}`);

    const afterProducts = await Product.find({
      'specifications.key': { $regex: regex }
    }, 'name sku specifications').lean();

    console.log(`After cleanup: ${afterProducts.length} products have dummy/hardcoded spec keys.`);

    // Check random sample of products
    const sample = await Product.find({}).limit(5).lean();
    console.log('Sample clean product specs:');
    sample.forEach(p => {
      console.log(`- ${p.name} (${p.sku}): ${p.specifications.length} specs remaining`);
      console.log(p.specifications.map(s => s.key));
    });

  } catch (err) {
    console.error('Error cleaning up product specs:', err);
  } finally {
    await disconnectDB();
  }
}

cleanupProductSpecs();
