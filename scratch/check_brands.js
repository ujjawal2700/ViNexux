import { connectDB, disconnectDB } from '../backend/src/config/db.js';
import { Brand } from '../backend/src/models/Brand.js';

async function listBrands() {
  try {
    await connectDB();
    const brands = await Brand.find({}).sort({ sortOrder: 1, name: 1 }).lean();
    console.log(`Total brands in database: ${brands.length}`);
    brands.forEach((b) => {
      console.log(`- ${b.name} (${b.slug}) | sortOrder: ${b.sortOrder} | active: ${b.isActive} | logo: ${b.logo?.url ? 'YES' : 'NO'}`);
    });
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await disconnectDB();
  }
}

listBrands();
