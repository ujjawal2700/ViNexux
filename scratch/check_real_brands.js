import { connectDB, disconnectDB } from '../backend/src/config/db.js';
import Product from '../backend/src/models/Product.js';

async function checkRealBrands() {
  try {
    await connectDB();
    const prods = await Product.find({}, 'name specifications brandId').lean();
    const brandCounts = {};
    prods.forEach(p => {
      const bSpec = p.specifications?.find(s => s.key === 'Brand');
      if (bSpec) {
        brandCounts[bSpec.value] = (brandCounts[bSpec.value] || 0) + 1;
      }
    });
    console.log('Real Brand specifications found in products:');
    console.log(Object.entries(brandCounts).sort((a,b) => b[1] - a[1]));
  } catch (err) {
    console.error(err);
  } finally {
    await disconnectDB();
  }
}

checkRealBrands();
