import mongoose from 'mongoose';
import { config } from '../src/config/env.js';
import { refreshCatalogFields } from '../src/models/Product.js';
import { CATALOG_FIELDS_VERSION } from '../src/utils/productCatalogFields.js';

// Re-derive stored catalog search/filter fields. Pass --all to rebuild every
// product rather than only those on an older CATALOG_FIELDS_VERSION.
const run = async () => {
  await mongoose.connect(config.mongodbUri);
  const filter = process.argv.includes('--all') ? {} : { catalogFieldsVersion: { $ne: CATALOG_FIELDS_VERSION } };
  const refreshed = await refreshCatalogFields(filter);
  console.log(`Derived catalog fields for ${refreshed} products.`);
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect();
  process.exitCode = 1;
});
