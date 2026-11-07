import mongoose from 'mongoose';
import { AppError } from './AppError.js';
import { hasVariants, selectedVariantProduct, productLineKey } from '../../../shared/productVariants.js';
export { hasVariants, productLineKey };

export const resolveVariant = (product, variantId, options) => {
  const selected = selectedVariantProduct(product, variantId, options);
  if (!selected) throw new AppError('Select an available variant for this product.', 400, 'VALIDATION_ERROR');
  return selected;
};

export function normalizeVariants(incoming, previous = []) {
  const ids = new Set(), names = new Set(), skus = new Set();
  const rows = incoming.map(option => {
    const old = previous.find(row => (option._id && String(row._id) === String(option._id)) || (!option._id && row.name.toLowerCase() === option.name.trim().toLowerCase()));
    const row = { ...option, _id: option._id || old?._id || new mongoose.Types.ObjectId(), name: option.name.trim(), sku: (option.sku || '').trim().toUpperCase(), isActive: option.isActive !== false };
    if (ids.has(String(row._id)) || names.has(row.name.toLowerCase()) || (row.sku && skus.has(row.sku))) {
      throw new AppError('Variant names, IDs and non-empty SKUs must be unique within a product.', 400, 'VALIDATION_ERROR');
    }
    ids.add(String(row._id)); names.add(row.name.toLowerCase()); if (row.sku) skus.add(row.sku);
    return row;
  });
  // Keep historical options addressable for POS returns and invoice snapshots.
  for (const old of previous) if (!ids.has(String(old._id))) rows.push({ ...(old.toObject ? old.toObject() : old), isActive: false });
  const allNames = rows.map(row => row.name.toLowerCase());
  const allSkus = rows.map(row => row.sku || '').filter(Boolean);
  if (new Set(allNames).size !== allNames.length || new Set(allSkus).size !== allSkus.length) throw new AppError('Keep existing variant IDs unchanged. Restore or rename an archived option instead of reusing its name or SKU.', 400, 'VALIDATION_ERROR');
  return rows;
}

// Both counters change in one atomic write, inside existing sale transactions.
export const variantStockChange = (productId, variantId, delta, { active = true } = {}) => ({
  filter: { _id: productId, ...(delta > 0 ? { stockQuantity: { $lte: Number.MAX_SAFE_INTEGER - delta } } : {}), ...(active ? { isActive: true } : {}),
    ...(variantId ? { variants: { $elemMatch: { _id: variantId, ...(active ? { isActive: { $ne: false } } : {}), ...(delta < 0 ? { stockQuantity: { $gte: -delta } } : { stockQuantity: { $lte: Number.MAX_SAFE_INTEGER - delta } }) } } }
      : { 'variants.0': { $exists: false }, ...(delta < 0 ? { stockQuantity: { $gte: -delta } } : {}) }) },
  update: { $inc: { stockQuantity: delta, ...(variantId ? { 'variants.$.stockQuantity': delta } : {}) },
    $set: { stockUpdatedAt: new Date() },
    $pull: { specifications: { $or: [{ key: /^\s*(stock|inventory)\s*$/i }] } } },
});
