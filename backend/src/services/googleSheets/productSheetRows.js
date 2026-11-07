import mongoose from 'mongoose';
import { editableProductIdentifier } from '../../../../shared/productDrafts.js';
import { createProductSchema, updateProductSchema } from '../../validators/product.validator.js';

export const COLUMNS = [
  ['Product ID', 'id'], ['SKU', 'sku'], ['Product Name', 'name'], ['Model Number', 'modelNumber'],
  ['Model Name', 'model'], ['Brand', 'brandId'], ['Primary Category', 'categoryId'], ['Categories', 'categoryIds'],
  ['Description', 'description'], ['Standard Price', 'standardPrice'], ['Dealer Price', 'dealerPrice'],
  ['Stock Quantity', 'stockQuantity'], ['Status', 'isActive'], ['Trending', 'isTrending'],
  ['New Arrival', 'isNewArrival'], ['Low Stock', 'isLowStock'], ['Variant', 'variant'], ['HSN Code', 'hsnCode'],
  ['Warranty Type', 'warrantyType'], ['Warranty', 'warranty'], ['Product URL', 'productUrl'],
  ['Information Phone', 'informationPhone'], ['Image URLs', 'images'], ['Specifications JSON', 'specifications'],
  ['Additional Details JSON', 'additionalDetails'], ['Updated At (read only)', 'updatedAt'], ['Sync Result (read only)', 'result'], ['Variants JSON', 'variants'],
];
export const HEADERS = COLUMNS.map(([header]) => header);
const text = value => String(value ?? '').trim();
export const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const lines = value => text(value).split(/\r?\n/).map(text).filter(Boolean);
const plainDetails = details => (details || []).map(({ key, value }) => ({ key, value }));

export function createReferences(brands, categories) {
  const categoryMap = new Map(categories.map(category => [String(category._id), category]));
  const pathFor = category => {
    const names = [], visited = new Set();
    while (category && !visited.has(String(category._id))) {
      visited.add(String(category._id)); names.unshift(category.name);
      category = categoryMap.get(String(category.parentId || ''));
    }
    return names.join(' / ');
  };
  const paths = new Map(categories.map(category => [String(category._id), pathFor(category)]));
  const resolve = (entries, value, kind) => {
    if (!text(value)) return null;
    const matches = entries.filter(entry => entry.labels.some(label => text(label).toLowerCase() === text(value).toLowerCase()));
    if (matches.length !== 1) throw new Error(`${kind} "${text(value)}" is unknown or ambiguous. Use its ID from the reference tab.`);
    return matches[0].id;
  };
  return {
    brands, categories, paths,
    brandName: id => brands.find(brand => String(brand._id) === String(id))?.name || String(id || ''),
    categoryName: id => paths.get(String(id)) || String(id || ''),
    resolveBrand: value => resolve(brands.map(brand => ({ id: String(brand._id), labels: [brand._id, brand.name, brand.slug] })), value, 'Brand'),
    resolveCategory: value => resolve(categories.map(category => ({ id: String(category._id), labels: [category._id, paths.get(String(category._id)), category.slug] })), value, 'Category'),
  };
}

export function productValues(product) {
  return {
    sku: editableProductIdentifier(product.sku), name: product.name || '', modelNumber: editableProductIdentifier(product.modelNumber),
    model: product.model || '', brandId: product.brandId ? String(product.brandId._id || product.brandId) : null,
    categoryId: product.categoryId ? String(product.categoryId._id || product.categoryId) : null,
    categoryIds: (product.categoryIds || []).map(id => String(id._id || id)), description: product.description || '',
    standardPrice: product.standardPrice ?? 0, dealerPrice: product.dealerPrice ?? 0, stockQuantity: product.stockQuantity ?? 0,
    isActive: product.isActive !== false, isTrending: Boolean(product.isTrending), isNewArrival: Boolean(product.isNewArrival),
    isLowStock: Boolean(product.isLowStock), variant: product.variant || '', hsnCode: product.hsnCode || '',
    warrantyType: product.warrantyType || 'text', warranty: product.warranty || '', productUrl: product.productUrl || '',
    informationPhone: product.informationPhone || '', images: (product.images || []).map(image => image.url),
    variants: (product.variants || []).map(option => ({ _id: String(option._id), name: option.name, sku: option.sku || '', standardPrice: option.standardPrice, dealerPrice: option.dealerPrice || 0, stockQuantity: option.stockQuantity, isActive: option.isActive !== false })),
    specifications: plainDetails(product.specifications), additionalDetails: plainDetails(product.additionalDetails),
  };
}

export function exportProductRow(product, refs, result = '') {
  const values = productValues(product);
  return COLUMNS.map(([, key]) => {
    if (key === 'id') return String(product._id);
    if (key === 'updatedAt') return product.updatedAt ? new Date(product.updatedAt).toISOString() : '';
    if (key === 'result') return result;
    if (key === 'brandId') return refs.brandName(values[key]);
    if (key === 'categoryId') return refs.categoryName(values[key]);
    if (key === 'categoryIds') return values[key].map(refs.categoryName).join('\n');
    if (key === 'images') return values[key].join('\n');
    if (key === 'specifications' || key === 'additionalDetails' || key === 'variants') return JSON.stringify(values[key]);
    if (key === 'isActive') return values[key] ? 'Published' : 'Draft';
    if (typeof values[key] === 'boolean') return values[key] ? 'Yes' : 'No';
    return values[key] ?? '';
  });
}

export function parseProductRow(row, refs) {
  const values = Object.fromEntries(COLUMNS.map(([, key], index) => [key, row[index] ?? '']));
  const id = text(values.id);
  if (id && !mongoose.Types.ObjectId.isValid(id)) throw new Error('Product ID is invalid. Keep existing IDs unchanged; leave it blank for a new product.');
  const payload = {};
  for (const [, key] of COLUMNS) {
    if (['id', 'updatedAt', 'result'].includes(key)) continue;
    if (key === 'variants' && row[COLUMNS.findIndex(([, field]) => field === 'variants')] === undefined) continue;
    const value = text(values[key]);
    if (['standardPrice', 'dealerPrice', 'stockQuantity'].includes(key)) {
      if (!value || !Number.isFinite(Number(value)) || Number(value) < 0 || (key === 'stockQuantity' && !Number.isInteger(Number(value)))) {
        // Blank prices/stock on a new draft use the ordinary product defaults.
        if (!value && !id) { payload[key] = 0; continue; }
        throw new Error(`${COLUMNS.find(([, field]) => field === key)[0]} must be a non-negative ${key === 'stockQuantity' ? 'whole number' : 'number'}.`);
      }
      payload[key] = Number(value);
    } else if (key === 'isActive') {
      if (!value || /^(draft|inactive|no|false)$/i.test(value)) payload[key] = false;
      else if (/^(published|active|yes|true)$/i.test(value)) payload[key] = true;
      else throw new Error('Status must be Published or Draft.');
    } else if (['isTrending', 'isNewArrival', 'isLowStock'].includes(key)) {
      if (!value || /^(no|false)$/i.test(value)) payload[key] = false;
      else if (/^(yes|true)$/i.test(value)) payload[key] = true;
      else throw new Error(`${key} must be Yes or No.`);
    } else if (key === 'brandId') payload[key] = refs.resolveBrand(value);
    else if (key === 'categoryId') payload[key] = refs.resolveCategory(value);
    else if (key === 'categoryIds') payload[key] = [...new Set(lines(value).map(refs.resolveCategory))];
    else if (key === 'images') {
      payload[key] = lines(value);

    } else if (['specifications', 'additionalDetails', 'variants'].includes(key)) {
      try { payload[key] = value ? JSON.parse(value) : []; } catch { throw new Error(`${key} must be a JSON array of {"key":"...","value":"..."} entries.`); }
      if (!Array.isArray(payload[key])) throw new Error(`${key} must be a JSON array.`);
    } else payload[key] = value;
  }
  payload.sku = payload.sku.toUpperCase();
  payload.warrantyType ||= 'text';
  if (payload.categoryId && !payload.categoryIds.includes(payload.categoryId)) payload.categoryIds.unshift(payload.categoryId);
  return { id, payload };
}

export function mergeSheetChanges(current, baseline, incoming) {
  const changes = {}, conflicts = [];
  for (const [key, value] of Object.entries(incoming)) {
    if (same(value, baseline[key])) continue;
    if (!same(current[key], baseline[key]) && !same(current[key], value)) conflicts.push(COLUMNS.find(([, field]) => field === key)?.[0] || key);
    else if (!same(current[key], value)) changes[key] = value;
  }
  if (conflicts.length) throw new Error(`Also edited in the catalogue: ${conflicts.join(', ')}. Set these cells to the current catalogue values and sync again.`);
  return changes;
}

export function validateSheetPayload(payload, current = null) {
  const images = payload.images === undefined ? undefined : payload.images.map((url, index) => {
    const previous = (current?.images || []).find(image => image.url === url);
    if (!previous && !/^https?:\/\/\S+$/i.test(url)) throw new Error('New image URLs must be full http:// or https:// links, one per line.');
    return { ...(previous ? { url, ...(previous.publicId ? { publicId: previous.publicId } : {}), altText: previous.altText || '' } : { url, altText: current?.name || payload.name || '' }), sortOrder: index };
  });
  const candidate = { ...payload, ...(images ? { images } : {}) };
  if (current) {
    // Draft validation must know visibility even when only another field changed.
    if (current.isActive === false && payload.isActive === undefined) candidate.isActive = false;
    return updateProductSchema.body.parse(candidate);
  }
  if (!payload.sku || payload.sku.length < 2) throw new Error('A new product needs a unique SKU (at least 2 characters).');
  return createProductSchema.body.parse(candidate);
}
