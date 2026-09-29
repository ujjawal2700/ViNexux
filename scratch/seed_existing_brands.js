import { connectDB, disconnectDB } from '../backend/src/config/db.js';
import { Brand } from '../backend/src/models/Brand.js';
import Product from '../backend/src/models/Product.js';

const slugify = (value) => value.toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

async function syncAndCheck() {
  try {
    await connectDB();
    const names = await Product.distinct('specifications.value', { 'specifications.key': { $regex: /^(brand|manufacturer)$/i } });
    console.log(`Found ${names.length} distinct brand names in products:`, names);

    let sort = 1;
    for (const name of names.filter(Boolean)) {
      const cleanName = name.trim();
      const existing = await Brand.findOne({ name: { $regex: new RegExp(`^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } });
      if (!existing) {
        await Brand.create({
          name: cleanName,
          slug: slugify(cleanName),
          isActive: true,
          sortOrder: sort++,
        });
      }
    }

    const allBrands = await Brand.find({}).sort({ sortOrder: 1, name: 1 }).lean();
    console.log(`Brands now in database: ${allBrands.length}`);
    allBrands.forEach(b => console.log(`[#${b.sortOrder}] ${b.name} (${b.slug})`));

    // Also link brandId on products if not set
    let linkedCount = 0;
    for (const brand of allBrands) {
      const res = await Product.updateMany(
        {
          $or: [{ brandId: null }, { brandId: { $exists: false } }],
          'specifications': {
            $elemMatch: {
              key: { $regex: /^(brand|manufacturer)$/i },
              value: { $regex: new RegExp(`^${brand.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
            }
          }
        },
        { $set: { brandId: brand._id } }
      );
      linkedCount += res.modifiedCount;
    }
    console.log(`Linked ${linkedCount} products to their respective brandId!`);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await disconnectDB();
  }
}

syncAndCheck();
