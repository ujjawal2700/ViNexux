import mongoose from 'mongoose';
import { config } from '../src/config/env.js';
import { backfillProductModels } from '../src/services/productModelBackfill.service.js';

const run = async () => {
  await mongoose.connect(config.mongodbUri);
  const result = await backfillProductModels();
  console.log(`Updated ${result.updated} of ${result.total} products with unique model data.`);
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect();
  process.exitCode = 1;
});
