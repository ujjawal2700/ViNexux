import { randomBytes } from 'node:crypto';
import { Product } from '../models/Product.js';

const createModelNumber = (used) => {
  let value;
  do value = `VNX-${randomBytes(5).toString('hex').toUpperCase()}`;
  while (used.has(value));
  used.add(value);
  return value;
};

export const backfillProductModels = async () => {
  // modelNumber is uniquely indexed, so only products missing a model number
  // or model can need repair. This keeps the startup run cheap once migrated.
  const missing = { $in: [null, ''] };
  const products = await Product.find({ $or: [{ modelNumber: missing }, { model: missing }] })
    .select('_id modelNumber model specifications')
    .lean();
  if (!products.length) return { updated: 0, total: 0 };
  const used = new Set();
  const updates = [];

  for (const product of products) {
    const currentNumber = product.modelNumber?.trim();
    const modelSpec = product.specifications?.find(
      (specification) => specification.key?.trim().toLowerCase() === 'model'
    )?.value?.trim();
    const modelNumber = currentNumber && !used.has(currentNumber)
      ? (used.add(currentNumber), currentNumber)
      : createModelNumber(used);
    const model = product.model?.trim() || modelSpec || 'Standard Model';

    if (modelNumber !== currentNumber || model !== product.model) {
      updates.push({ updateOne: { filter: { _id: product._id }, update: { $set: { modelNumber, model } } } });
    }
  }

  if (updates.length) await Product.bulkWrite(updates, { ordered: false });
  return { updated: updates.length, total: products.length };
};

export default backfillProductModels;

