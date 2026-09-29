import { connectDB, disconnectDB } from '../backend/src/config/db.js';
import { Brand } from '../backend/src/models/Brand.js';
import Product from '../backend/src/models/Product.js';

const slugify = (value) => value.toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

async function cleanAndSeedRealBrands() {
  try {
    await connectDB();
    await Brand.deleteMany({}); // Clear any accidental junk

    // Aggregate real brands
    const brandAgg = await Product.aggregate([
      { $unwind: '$specifications' },
      { $match: { 'specifications.key': { $regex: /^brand$/i } } },
      { $group: { _id: { $toUpper: { $trim: { input: '$specifications.value' } } }, original: { $first: '$specifications.value' } } },
      { $sort: { _id: 1 } }
    ]);

    console.log(`Found ${brandAgg.length} real distinct brands`);
    
    // Normalize names (e.g. DELL, ASUS, HP, LENOVO, etc.)
    const createdBrands = [];
    let sortOrder = 1;
    for (const item of brandAgg) {
      const rawName = item.original.trim();
      const upper = item._id;
      // Capitalize nicely or keep upper if acronym
      let display = rawName;
      if (['HP', 'DELL', 'ASUS', 'MSI', 'LG', 'CP PLUS', 'ERD', 'BOE', 'AUO', 'CISCO'].includes(upper)) {
        display = upper;
      } else {
        // Title Case
        display = rawName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      }
      
      const slug = slugify(display);
      // Ensure unique slug
      let finalSlug = slug;
      let counter = 1;
      while (await Brand.findOne({ slug: finalSlug })) {
        finalSlug = `${slug}-${counter++}`;
      }

      const brandDoc = await Brand.create({
        name: display,
        slug: finalSlug,
        isActive: true,
        sortOrder: sortOrder++,
      });
      createdBrands.push(brandDoc);
    }

    console.log(`Created ${createdBrands.length} clean brands in database!`);

    // Now link brandId on all products
    let linked = 0;
    for (const b of createdBrands) {
      const res = await Product.updateMany(
        {
          'specifications': {
            $elemMatch: {
              key: { $regex: /^brand$/i },
              value: { $regex: new RegExp(`^${b.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
            }
          }
        },
        { $set: { brandId: b._id } }
      );
      linked += res.modifiedCount;
    }
    console.log(`Successfully linked ${linked} products to their brandId!`);

  } catch (err) {
    console.error(err);
  } finally {
    await disconnectDB();
  }
}

cleanAndSeedRealBrands();
