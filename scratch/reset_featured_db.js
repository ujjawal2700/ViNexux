import { connectDB, disconnectDB } from '../backend/src/config/db.js';
import Product from '../backend/src/models/Product.js';

async function resetFeaturedFlags() {
  try {
    await connectDB();
    const countTrue = await Product.countDocuments({ isFeatured: true });
    console.log(`Currently ${countTrue} products have isFeatured = true.`);

    const res = await Product.updateMany({}, { $set: { isFeatured: false } });
    console.log(`Updated ${res.modifiedCount} products to isFeatured = false.`);

    const remainingTrue = await Product.countDocuments({ isFeatured: true });
    console.log(`Remaining products with isFeatured = true: ${remainingTrue}`);
  } catch (err) {
    console.error('Error resetting featured flags:', err);
  } finally {
    await disconnectDB();
  }
}

resetFeaturedFlags();
