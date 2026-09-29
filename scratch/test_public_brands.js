import { connectDB, disconnectDB } from '../backend/src/config/db.js';
import { getPublicBrands } from '../backend/src/services/catalog.service.js';

async function testPublicBrands() {
  try {
    await connectDB();
    const brands = await getPublicBrands();
    console.log(`getPublicBrands returned ${brands.length} brands:`);
    brands.slice(0, 10).forEach(b => {
      console.log(`[#${b.sortOrder}] ${b.name} (${b.slug}) | count: ${b.count}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await disconnectDB();
  }
}

testPublicBrands();
