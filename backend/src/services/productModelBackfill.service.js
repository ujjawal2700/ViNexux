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
  const products = await Product.find({}).select('_id modelNumber model specifications').lean();
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

