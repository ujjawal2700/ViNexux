import mongoose from 'mongoose';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { DealerProfile } from '../models/DealerProfile.js';
import { DealerPricing } from '../models/DealerPricing.js';
import { Brand } from '../models/Brand.js';
import { AppError } from '../utils/AppError.js';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const slugify = (value) => value.toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Only nodes reachable from an active root belong in the public catalog.
// A disabled/missing parent must hide its whole branch, even if a child is active.
export const getPublicCategories = async () => {
  const rows = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1, _id: 1 }).lean();
  const byId = new Map(rows.map((row) => [String(row._id), row]));
  const children = new Map();
  for (const row of rows) {
    const key = row.parentId ? String(row.parentId) : '';
    if (!children.has(key)) children.set(key, []);
    children.get(key).push(row);
  }
  const categories = [];
  const visit = (parentId, ancestors = []) => {
    for (const row of children.get(parentId) || []) {
      if (ancestors.includes(String(row._id))) continue;
      const parent = byId.get(parentId);
      categories.push({ ...row, parentId: parent ? { _id: parent._id, name: parent.name, slug: parent.slug } : null });
      visit(String(row._id), [...ancestors, String(row._id)]);
    }
  };
  visit('');
  return categories;
};

export const descendantIds = (categories, rootIds) => {
  const ids = new Set(rootIds.map(String));
  let changed = true;
  while (changed) {
    changed = false;
    for (const category of categories) {
      const parentId = category.parentId?._id || category.parentId;
      if (parentId && ids.has(String(parentId)) && !ids.has(String(category._id))) {
        ids.add(String(category._id));
        changed = true;
      }
    }
  }
  return categories.filter((category) => ids.has(String(category._id))).map((category) => category._id);
};

export const effectiveFilterDefinitions = (categories, categoryId) => {
  const byId = new Map(categories.map((category) => [String(category._id), category]));
  const chain = [];
  let current = byId.get(String(categoryId));
  const visited = new Set();
  while (current && !visited.has(String(current._id))) {
    visited.add(String(current._id));
    chain.unshift(current);
    current = byId.get(String(current.parentId?._id || current.parentId || ''));
  }
  const definitions = new Map();
  for (const category of chain) {
    for (const definition of category.filterDefinitions || []) {
      definitions.set(definition.key.toLowerCase(), definition);
    }
  }
  return [...definitions.values()].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
};

const brandExpression = {
  $trim: { input: { $ifNull: [{ $arrayElemAt: [{ $map: {
    input: { $filter: { input: '$specifications', as: 'spec', cond: { $in: [{ $toLower: '$$spec.key' }, ['brand', 'manufacturer']] } } },
    as: 'spec', in: '$$spec.value',
  } }, 0] }, ''] } },
};

const stockNumberExpression = {
  $convert: {
    input: {
      $trim: {
        input: {
          $ifNull: [{ $arrayElemAt: [{ $map: {
            input: { $filter: { input: '$specifications', as: 'spec', cond: { $in: [{ $toLower: '$$spec.key' }, ['stock', 'inventory']] } } },
            as: 'spec', in: '$$spec.value',
          } }, 0] }, ''],
        },
      },
    },
    to: 'double',
    onError: null,
    onNull: null,
  },
};

const stockStatusExpression = {
  $switch: {
    branches: [
      { case: { $eq: ['$stockQuantity', 0] }, then: 'out-of-stock' },
      { case: { $and: [{ $gt: ['$stockQuantity', 0] }, { $lt: ['$stockQuantity', 5] }] }, then: 'low-stock' },
      { case: { $gte: ['$stockQuantity', 5] }, then: 'in-stock' },
    ],
    default: 'on-order',
  },
};

export const getPublicBrands = async () => {
  const categories = await getPublicCategories();
  const managed = await Brand.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean();
  const counts = await Product.aggregate([
    { $match: { isActive: true, categoryId: { $in: categories.map((category) => category._id) } } },
    { $group: { _id: '$brandId', count: { $sum: 1 } } },
  ]);
  const countById = new Map(counts.filter((row) => row._id).map((row) => [String(row._id), row.count]));
  // Compatibility until existing specification-only brands are migrated in admin.
  const legacy = await Product.aggregate([
    { $match: { isActive: true, categoryId: { $in: categories.map((category) => category._id) } } },
    { $project: { brand: { $toUpper: brandExpression } } },
    { $match: { brand: { $ne: '' } } },
    { $group: { _id: '$brand', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  const managedNames = new Set(managed.map((brand) => brand.name.toLowerCase()));
  const legacyCountByName = new Map(legacy.map((brand) => [brand._id.toLowerCase(), brand.count]));
  return [
    ...managed.map((brand) => ({
      ...brand,
      count: Math.max(countById.get(String(brand._id)) || 0, legacyCountByName.get(brand.name.toLowerCase()) || 0),
    })).filter((brand) => brand.count > 0),
    ...legacy.filter((brand) => !managedNames.has(brand._id.toLowerCase()))
      .map((brand) => ({ name: brand._id, slug: slugify(brand._id), count: brand.count, legacy: true })),
  ];
};

export const getPublicProducts = async (query = {}, user = null) => {
  const categories = await getPublicCategories();
  let allowedIds = categories.map((category) => category._id);
  let requestedCategoryRecord = null;
  const requestedCategory = query.categoryId || query.category || query.categorySlug;
  if (requestedCategory) {
    const category = categories.find((item) => String(item._id) === requestedCategory || item.slug === requestedCategory.toLowerCase());
    requestedCategoryRecord = category || null;
    // Never turn an unknown category into an unfiltered all-products response.
    allowedIds = category
      ? (query.exactCategory === 'true' ? [category._id] : descendantIds(categories, [category._id]))
      : [];
  }
  const match = { isActive: true, categoryId: { $in: allowedIds } };
  if (query.id) match._id = new mongoose.Types.ObjectId(query.id);
  if (query.isFeatured !== undefined) match.isFeatured = String(query.isFeatured) === 'true';
  if (query.search?.trim()) {
    const regex = new RegExp(escapeRegex(query.search.trim()), 'i');
    const matchingCategories = categories.filter((category) => regex.test(category.name) || regex.test(category.slug));
    match.$or = [
      { name: regex }, { sku: regex },
      { specifications: { $elemMatch: { key: /^(brand|manufacturer)$/i, value: regex } } },
      { categoryId: { $in: descendantIds(categories, matchingCategories.map((category) => category._id)) } },
    ];
  }
  const basePipeline = [
    { $match: match },
    { $set: { brand: { $toUpper: brandExpression }, stockQuantity: stockNumberExpression } },
    { $set: { stockStatus: stockStatusExpression } },
  ];
  const pipeline = [...basePipeline];
  let brand = query.brand;
  let managedBrandId = null;
  if (query.brandSlug) {
    const brands = await getPublicBrands();
    const selectedBrand = brands.find((item) => item.slug === query.brandSlug);
    brand = selectedBrand?.name || '__unknown_brand__';
    managedBrandId = selectedBrand?._id || null;
  }
  if (brand) pipeline.push({ $match: managedBrandId ? {
    $or: [
      { brandId: new mongoose.Types.ObjectId(managedBrandId) },
      { brand: new RegExp(`^${escapeRegex(brand.trim())}$`, 'i') },
    ],
  } : {
    brand: {
      $in: String(brand).split(',').map((name) => new RegExp(`^${escapeRegex(name.trim())}$`, 'i')),
    },
  } });

  const approvedDealer = user?.role === 'dealer'
    ? await DealerProfile.findOne({ userId: user._id, status: 'approved' }).lean() : null;
  if (approvedDealer) {
    pipeline.push({ $lookup: {
      from: DealerPricing.collection.name, let: { productId: '$_id' },
      pipeline: [{ $match: { dealerId: approvedDealer._id, isActive: true, $expr: { $eq: ['$productId', '$$productId'] } } }],
      as: '_pricing',
    } });
  }
  pipeline.push({ $set: { applicablePrice: approvedDealer
    ? { $ifNull: [{ $arrayElemAt: ['$_pricing.price', 0] }, { $cond: [{ $gt: ['$dealerPrice', 0] }, '$dealerPrice', '$standardPrice'] }] }
    : '$standardPrice' } });

  const extraFilters = [];
  const specs = query.specs ? JSON.parse(query.specs) : {};
  for (const [key, values] of Object.entries(specs)) {
    if (values.length) extraFilters.push({ specifications: { $elemMatch: { key: new RegExp(`^${escapeRegex(key)}$`, 'i'), value: { $in: values } } } });
  }
  if (query.inStock === 'true') extraFilters.push({ specifications: { $elemMatch: { key: /^(stock|inventory)$/i, value: /^\s*[1-9]\d*(\.\d+)?\s*$/ } } });
  if (query.availability) {
    const requestedStatuses = String(query.availability).split(',').filter(Boolean);
    if (requestedStatuses.length) extraFilters.push({ stockStatus: { $in: requestedStatuses } });
  }
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    extraFilters.push({ applicablePrice: {
      ...(query.minPrice !== undefined ? { $gte: Number(query.minPrice) } : {}),
      ...(query.maxPrice !== undefined ? { $lte: Number(query.maxPrice) } : {}),
    } });
  }
  const filtered = extraFilters.length ? [{ $match: { $and: extraFilters } }] : [];
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const sortField = ['standardPrice', 'dealerPrice'].includes(query.sortBy) ? 'applicablePrice'
    : ['name', 'modelNumber', 'sku', 'createdAt', 'updatedAt'].includes(query.sortBy) ? query.sortBy : 'createdAt';
  const [result] = await Product.aggregate([...pipeline, { $facet: {
    products: [...filtered, { $sort: { [sortField]: query.sortOrder === 'asc' ? 1 : -1, _id: 1 } }, { $skip: (page - 1) * limit }, { $limit: limit }, { $unset: ['_pricing', '__v'] }],
    total: [...filtered, { $count: 'count' }],
    specs: [{ $unwind: '$specifications' }, { $group: { _id: { key: '$specifications.key', value: '$specifications.value' }, count: { $sum: 1 } } }, { $sort: { '_id.key': 1, '_id.value': 1 } }],
  } }]);
  const [categoryBrands, availabilityCounts] = await Promise.all([
    Product.aggregate([...basePipeline, { $match: { brand: { $ne: '' } } }, { $group: { _id: '$brand', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    Product.aggregate([...basePipeline, { $group: { _id: '$stockStatus', count: { $sum: 1 } } }]),
  ]);
  const byId = new Map(categories.map((category) => [String(category._id), category]));
  const productBrandIds = result.products.map((product) => product.brandId).filter(Boolean);
  const productBrands = productBrandIds.length ? await Brand.find({ _id: { $in: productBrandIds }, isActive: true }).lean() : [];
  const brandById = new Map(productBrands.map((brand) => [String(brand._id), brand]));
  const categoryPathFor = (categoryId) => {
    const slugs = [];
    const visited = new Set();
    let category = byId.get(String(categoryId));
    while (category && !visited.has(String(category._id))) {
      visited.add(String(category._id));
      slugs.unshift(category.slug);
      category = byId.get(String(category.parentId?._id || category.parentId || ''));
    }
    return slugs.length ? `/${slugs.join('/')}` : null;
  };
  const products = result.products.map((product) => {
    if (approvedDealer) product.dealerPrice = product.applicablePrice;
    else delete product.dealerPrice;
    return {
      ...product,
      modelNumber: product.modelNumber || `VNX-${String(product._id).slice(-8).toUpperCase()}`,
      model: product.model || product.specifications?.find((specification) => specification.key?.trim().toLowerCase() === 'model')?.value || 'Standard Model',
      availableStock: product.stockQuantity,
      stockStatus: product.stockStatus || 'on-order',
      categoryPath: categoryPathFor(product.categoryId),
      brandId: brandById.get(String(product.brandId)) || product.brandId,
      categoryId: byId.get(String(product.categoryId)),
    };
  });
  const configuredDefinitions = requestedCategoryRecord
    ? effectiveFilterDefinitions(categories, requestedCategoryRecord._id).filter((definition) => definition.isFilterable)
    : [];
  const configuredByKey = new Map(configuredDefinitions.map((definition) => [definition.key.toLowerCase(), definition]));
  const useLegacyDiscovery = configuredDefinitions.length === 0;
  const specMap = new Map();
  for (const spec of result.specs) {
    if (/^(brand|manufacturer|model|model number|warranty|country of origin|hsn|hsn code|stock|inventory|variant|highlight \d+)$/i.test(spec._id.key)) continue;
    const definition = configuredByKey.get(spec._id.key.toLowerCase()) || (useLegacyDiscovery ? {
      key: spec._id.key, label: spec._id.key, inputType: 'multi-select', unit: '', options: [],
    } : null);
    if (!definition) continue;
    if (!specMap.has(definition.key)) specMap.set(definition.key, { definition, values: [] });
    specMap.get(definition.key).values.push({ val: spec._id.value, count: spec.count });
  }
  return {
    products, pagination: { page, limit, total: result.total[0]?.count || 0, totalPages: Math.ceil((result.total[0]?.count || 0) / limit) },
    facets: {
      brands: categoryBrands.map((item) => ({ name: item._id, count: item.count })),
      availability: ['in-stock', 'low-stock', 'on-order', 'out-of-stock'].map((status) => ({
        status,
        count: availabilityCounts.find((item) => item._id === status)?.count || 0,
      })),
      specs: [...specMap.values()].filter(({ values }) => values.length > 1).slice(0, 5).map(({ definition, values }) => ({
        key: definition.key, label: definition.label, inputType: definition.inputType, unit: definition.unit,
        values: definition.options?.length
          ? [...values].sort((a, b) => definition.options.indexOf(a.val) - definition.options.indexOf(b.val))
          : values,
      })),
    },
  };
};

export const getPublicProductById = async (id, user) => {
  const result = await getPublicProducts({ id, limit: 1 }, user);
  if (!result.products.length) throw new AppError('Product not found.', 404, 'NOT_FOUND');
  return result.products[0];
};
