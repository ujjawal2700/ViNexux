import mongoose from 'mongoose';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { DealerProfile } from '../models/DealerProfile.js';
import { DealerPricing } from '../models/DealerPricing.js';
import { Brand } from '../models/Brand.js';
import { AppError } from '../utils/AppError.js';
import { getCachedCategories } from '../utils/categoryCache.js';
import { allowedTypos, editDistance, requiredSearchTokens, searchWords, toBrandKey } from '../utils/productCatalogFields.js';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const slugify = (value = '') => (value || '').toString().toLowerCase().trim().replace(/^https?:\/\/(www\.)?/i, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Only nodes reachable from an active root belong in the public catalog.
// A disabled/missing parent must hide its whole branch, even if a child is active.
// Cached: callers must treat the returned rows as read-only.
export const getPublicCategories = () => getCachedCategories(loadPublicCategories);

const loadPublicCategories = async () => {
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

// Stored per product by the Product model hooks (utils/productCatalogFields.js).
const INTERNAL_CATALOG_FIELDS = ['brandKey', 'stockLevel', 'searchTokens', 'catalogFieldsVersion'];

// Vocabulary for "did you mean" spelling correction: words from active
// product names, brands and category names, with how often each appears.
const VOCABULARY_TTL_MS = 5 * 60 * 1000;
const MIN_CORRECTABLE_LENGTH = 3;
let vocabulary = null;
let vocabularyAt = 0;
let vocabularyRequest = null;

const loadSearchVocabulary = async () => {
  const counts = new Map();
  const add = (text) => {
    for (const word of searchWords(text)) {
      if (Array.from(word).length >= MIN_CORRECTABLE_LENGTH) counts.set(word, (counts.get(word) || 0) + 1);
    }
  };
  const categories = await getPublicCategories();
  categories.forEach((category) => add(category.name));
  const categoryMatch = categories.length
    ? { $or: [{ categoryId: { $in: categories.map((c) => c._id) } }, { categoryId: null }, { categoryId: { $exists: false } }] }
    : {};
  const cursor = Product.find({ isActive: true, ...categoryMatch })
    .select('name +brandKey')
    .lean()
    .cursor();
  for await (const product of cursor) {
    add(product.name);
    add(product.brandKey);
  }
  return counts;
};

const getSearchVocabulary = async () => {
  if (vocabulary && Date.now() - vocabularyAt < VOCABULARY_TTL_MS) return vocabulary;
  if (!vocabularyRequest) {
    vocabularyRequest = loadSearchVocabulary()
      .then((counts) => {
        vocabulary = counts;
        vocabularyAt = Date.now();
        return counts;
      })
      .finally(() => {
        vocabularyRequest = null;
      });
  }
  return vocabularyRequest;
};

// Replace each misspelled word with its closest catalog word (most common on
// ties). Words with no close match are dropped. Returns null when nothing
// usable remains.
const correctSearchTerm = async (term) => {
  const words = searchWords(term);
  if (!words.length) return null;
  const counts = await getSearchVocabulary();
  const corrected = [];
  for (const word of words) {
    if (Array.from(word).length < MIN_CORRECTABLE_LENGTH || counts.has(word)) {
      corrected.push(word);
      continue;
    }
    const max = allowedTypos(word);
    let best = null;
    for (const [candidate, frequency] of counts) {
      const distance = editDistance(word, candidate, max);
      if (distance > max) continue;
      if (!best || distance < best.distance || (distance === best.distance && frequency > best.frequency)) {
        best = { word: candidate, distance, frequency };
      }
    }
    if (best) corrected.push(best.word);
  }
  return corrected.some((word) => Array.from(word).length >= MIN_CORRECTABLE_LENGTH) ? corrected : null;
};

export const getPublicBrands = async () => {
  const categories = await getPublicCategories();
  const managed = await Brand.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean();
  const categoryMatch = categories.length
    ? { $or: [{ categoryId: { $in: categories.map((c) => c._id) } }, { categoryId: null }, { categoryId: { $exists: false } }] }
    : {};
  const counts = await Product.aggregate([
    { $match: { isActive: true, ...categoryMatch } },
    { $group: { _id: '$brandId', count: { $sum: 1 } } },
  ]);
  const countById = new Map(counts.filter((row) => row._id).map((row) => [String(row._id), row.count]));
  // Compatibility until existing specification-only brands are migrated in admin.
  const legacy = await Product.aggregate([
    { $match: { isActive: true, ...categoryMatch } },
    { $match: { brandKey: { $ne: '' } } },
    { $group: { _id: '$brandKey', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  const managedNames = new Set(managed.map((brand) => brand.name.toLowerCase()));
  const legacyCountByName = new Map(legacy.map((brand) => [brand._id.toLowerCase(), brand.count]));
  const allActiveBrands = [
    ...managed.map((brand) => ({
      ...brand,
      slug: (/https?:|\/|www\./i.test(brand.slug) || !brand.slug) ? slugify(brand.name) : slugify(brand.slug),
      count: Math.max(countById.get(String(brand._id)) || 0, legacyCountByName.get(brand.name.toLowerCase()) || 0),
    })),
    ...legacy.filter((brand) => !managedNames.has(brand._id.toLowerCase()))
      .map((brand) => ({ name: brand._id, slug: slugify(brand._id), count: brand.count, sortOrder: 9999, legacy: true })),
  ];
  const sorted = allActiveBrands.sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0) || a.name.localeCompare(b.name));
  const seen = new Set();
  const dedupedBrands = [];
  for (const brand of sorted) {
    const key = (brand.name || '').trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    dedupedBrands.push(brand);
  }
  return dedupedBrands;
};

// Substring search on name, SKU and brand. The indexed searchTokens clause
// narrows candidates to products containing every fragment of the term; the
// regex clauses then confirm the exact substring match on those few.
const buildSearchOr = (categories, term) => {
  const regex = new RegExp(escapeRegex(term), 'i');
  const matchingCategories = categories.filter((category) => regex.test(category.name) || regex.test(category.slug));
  const textMatch = { $or: [
    { name: regex }, { sku: regex },
    { specifications: { $elemMatch: { key: /^(brand|manufacturer)$/i, value: regex } } },
  ] };
  const tokens = requiredSearchTokens(term);
  return [
    tokens.length ? { $and: [{ searchTokens: { $all: tokens } }, textMatch] } : textMatch,
    { categoryId: { $in: descendantIds(categories, matchingCategories.map((category) => category._id)) } },
  ];
};

// Brand names compare case-insensitively against the stored brandKey. ASCII
// names become an indexed equality; names with other letters keep the
// anchored case-insensitive regex, since brandKey only upper-cases ASCII.
const brandKeyValue = (name) => (/^[\x00-\x7F]*$/.test(name.trim())
  ? toBrandKey(name)
  : new RegExp(`^${escapeRegex(name.trim())}$`, 'i'));
const buildBrandMatch = (brand, managedBrandId) => (managedBrandId ? {
  $or: [
    { brandId: new mongoose.Types.ObjectId(managedBrandId) },
    { brandKey: brandKeyValue(brand) },
  ],
} : {
  brandKey: { $in: String(brand).split(',').map(brandKeyValue) },
});

// Resolve a brand slug with one indexed lookup; only legacy specification-only
// brands (no Brand document) need the full brand aggregation.
const resolveBrandSlug = async (brandSlug) => {
  const normalizedSlug = slugify(brandSlug);
  let managed = await Brand.findOne({ slug: normalizedSlug, isActive: true }).select('_id name').lean();
  if (!managed) {
    const all = await Brand.find({ isActive: true }).select('_id name slug').lean();
    managed = all.find((item) => {
      const cleanSlug = (/https?:|\/|www\./i.test(item.slug) || !item.slug) ? slugify(item.name) : slugify(item.slug);
      return cleanSlug === normalizedSlug || slugify(item.name) === normalizedSlug || slugify(item.slug) === normalizedSlug;
    });
  }
  if (managed) return { brand: managed.name, managedBrandId: managed._id };
  const legacy = (await getPublicBrands()).find((item) => item.slug === normalizedSlug);
  return { brand: legacy?.name || '__unknown_brand__', managedBrandId: legacy?._id || null };
};

// `options` is for internal callers only (never taken from the request):
// `ids` restricts to those products; `searchWords` replaces the search term
// with words that must each match (the spelling-corrected retry).
export const getPublicProducts = async (query = {}, user = null, options = {}) => {
  const includeFacets = query.includeFacets !== 'false' && query.includeFacets !== false;
  const [categories, approvedDealer] = await Promise.all([
    getPublicCategories(),
    user?.role === 'dealer' ? DealerProfile.findOne({ userId: user._id, status: 'approved' }).lean() : null,
  ]);
  let allowedIds = categories.map((category) => category._id);
  let requestedCategoryRecord = null;
  const requestedCategory = query.categoryId || query.category || query.categorySlug;
  if (requestedCategory) {
    const requestedItems = String(requestedCategory).split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    const matchedCategories = categories.filter((item) =>
      requestedItems.includes(String(item._id).toLowerCase()) || requestedItems.includes(item.slug.toLowerCase())
    );
    requestedCategoryRecord = matchedCategories.length === 1 ? matchedCategories[0] : null;
    if (matchedCategories.length > 0) {
      const allMatchedIds = matchedCategories.map((c) => c._id);
      allowedIds = query.exactCategory === 'true' ? allMatchedIds : descendantIds(categories, allMatchedIds);
    } else {
      allowedIds = [];
    }
  }
  const match = { isActive: true };
  if (requestedCategory) {
    match.$or = [
      { categoryId: { $in: allowedIds } },
      { categoryIds: { $in: allowedIds } },
    ];
  } else if (allowedIds.length > 0) {
    match.$or = [
      { categoryId: { $in: allowedIds } },
      { categoryIds: { $in: allowedIds } },
      { categoryId: null },
      { categoryId: { $exists: false } },
    ];
  }
  if (query.id) match._id = new mongoose.Types.ObjectId(query.id);
  if (options.ids) match._id = { $in: options.ids.map((id) => new mongoose.Types.ObjectId(id)) };
  if (query.sortBy === 'stockUpdatedAt') {
    match.stockUpdatedAt = { $ne: null };
  }
  const searchTerm = options.searchWords ? '' : query.search?.trim() || '';
  const searchOr = searchTerm ? buildSearchOr(categories, searchTerm) : null;
  if (searchOr) {
    if (match.$or) {
      match.$and = [...(match.$and || []), { $or: match.$or }, { $or: searchOr }];
      delete match.$or;
    } else {
      match.$or = searchOr;
    }
  }
  if (options.searchWords) match.$and = options.searchWords.map((word) => ({ $or: buildSearchOr(categories, word) }));
  // Brand and stock fields are stored on each product, so every filter below
  // is a plain $match that can use indexes; nothing is computed per document
  // until the current page has been selected.
  const pipeline = [{ $match: match }];
  let brand = query.brand;
  let managedBrandId = null;
  if (query.brandSlug) ({ brand, managedBrandId } = await resolveBrandSlug(query.brandSlug));
  const brandMatch = brand ? buildBrandMatch(brand, managedBrandId) : null;
  if (brandMatch) pipeline.push({ $match: brandMatch });

  const pricingStages = [];
  if (approvedDealer) {
    pricingStages.push({ $lookup: {
      from: DealerPricing.collection.name, let: { productId: '$_id' },
      pipeline: [{ $match: { dealerId: approvedDealer._id, isActive: true, $expr: { $eq: ['$productId', '$$productId'] } } }],
      as: '_pricing',
    } });
  }
  pricingStages.push({ $set: { applicablePrice: approvedDealer
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
    if (requestedStatuses.length && requestedStatuses.length < 4) extraFilters.push({ stockStatus: { $in: requestedStatuses } });
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
    : ['name', 'modelNumber', 'sku', 'createdAt', 'updatedAt', 'stockUpdatedAt'].includes(query.sortBy) ? query.sortBy : 'createdAt';
  // The dealer-price lookup is per document, so run it on the current page
  // only, unless a price filter or price sort needs it for every match.
  const priceNeededBeforePaging = sortField === 'applicablePrice' || query.minPrice !== undefined || query.maxPrice !== undefined;
  if (priceNeededBeforePaging) pipeline.push(...pricingStages);
  // The specs facet counts the unfiltered set, so extra filters can only move
  // ahead of $facet (where they can use indexes) when no facets are requested.
  const facetFilters = includeFacets ? filtered : [];
  if (!includeFacets) pipeline.push(...filtered);
  const sortStage = query.sortBy === 'stockUpdatedAt'
    ? { stockUpdatedAt: query.sortOrder === 'asc' ? 1 : -1, updatedAt: -1, _id: 1 }
    : { [sortField]: query.sortOrder === 'asc' ? 1 : -1, _id: 1 };
  const resultFacets = {
    products: [
      ...facetFilters,
      { $sort: sortStage },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      ...(priceNeededBeforePaging ? [] : pricingStages),
      { $set: { brand: '$brandKey', stockQuantity: '$stockLevel' } },
      { $unset: ['_pricing', '__v', ...INTERNAL_CATALOG_FIELDS] },
    ],
    total: [...facetFilters, { $count: 'count' }],
  };
  if (includeFacets) {
    resultFacets.specs = [
      { $unwind: '$specifications' },
      { $group: { _id: { key: '$specifications.key', value: '$specifications.value' }, count: { $sum: 1 } } },
      { $sort: { '_id.key': 1, '_id.value': 1 } },
    ];
    resultFacets.availability = [{ $group: { _id: '$stockStatus', count: { $sum: 1 } } }];
  }
  const categoryFacetMatch = { ...match, categoryId: { $in: categories.map((category) => category._id) } };
  const categoryFacetPipeline = [
    { $match: brandMatch ? { $and: [categoryFacetMatch, brandMatch] } : categoryFacetMatch },
    { $match: { categoryId: { $ne: null } } },
    { $group: { _id: '$categoryId', count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
  ];

  const [[result], categoryBrands, categoryGroupCounts] = await Promise.all([
    Product.aggregate([...pipeline, { $facet: resultFacets }]),
    // Group brands from the base match (category-scoped, unaffected by selected brand) so all available brands in this category are shown
    includeFacets
      ? Product.aggregate([{ $match: { $and: [match, { brandKey: { $ne: '' } }] } }, { $group: { _id: '$brandKey', count: { $sum: 1 } } }, { $sort: { _id: 1 } }])
      : [],
    includeFacets ? Product.aggregate(categoryFacetPipeline) : [],
  ]);

  // No exact matches for a search: retry once with spelling-corrected words,
  // each required to match, keeping every other filter. The response says so
  // via `searchMode` and `correctedSearch`.
  const exactTotal = result.total[0]?.count || 0;
  if (searchTerm && exactTotal === 0 && !query.id && !options.ids) {
    const correctedWords = await correctSearchTerm(searchTerm);
    if (correctedWords) {
      const fuzzy = await getPublicProducts(query, user, { searchWords: correctedWords });
      if (fuzzy.pagination.total > 0) return { ...fuzzy, searchMode: 'fuzzy', correctedSearch: correctedWords.join(' ') };
    }
  }

  const availabilityCounts = result.availability || [];
  const byId = new Map(categories.map((category) => [String(category._id), category]));
  const productBrandIds = result.products.map((product) => product.brandId).filter(Boolean);
  const productBrands = productBrandIds.length ? await Brand.find({ _id: { $in: productBrandIds }, isActive: true }).lean() : [];
  const cleanBrand = (brand) => {
    if (!brand) return brand;
    const raw = (brand.slug || '').toString().trim();
    const cleanSlug = (!raw || /https?:|\/|www\./i.test(raw)) ? slugify(brand.name) : slugify(raw);
    return {
      ...brand,
      slug: cleanSlug,
    };
  };
  const brandById = new Map(productBrands.map((brand) => [String(brand._id), cleanBrand(brand)]));
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
    const specStockRaw = product.specifications?.find((specification) => /^(stock|inventory)$/i.test(specification.key || ''))?.value;
    const specStock = specStockRaw !== undefined && !isNaN(Number(specStockRaw)) ? Number(specStockRaw) : null;
    const resolvedStock = (product.stockQuantity !== undefined && product.stockQuantity !== null && product.stockQuantity > 0)
      ? product.stockQuantity
      : (specStock !== null ? specStock : (product.stockQuantity || 0));
    const resolvedStatus = (product.stockStatus && product.stockStatus !== 'out-of-stock')
      ? product.stockStatus
      : (resolvedStock === 0 ? 'out-of-stock' : (resolvedStock < 5 ? 'low-stock' : 'in-stock'));
    return {
      ...product,
      modelNumber: product.modelNumber || `VNX-${String(product._id).slice(-8).toUpperCase()}`,
      model: product.model || product.specifications?.find((specification) => specification.key?.trim().toLowerCase() === 'model')?.value || 'Standard Model',
      productUrl: product.productUrl || '',
      variant: product.variant || '',
      warranty: product.warranty || '1 Year ON-SITE / Direct Replacement Warranty',
      availableStock: resolvedStock,
      stockQuantity: resolvedStock,
      stockStatus: resolvedStatus,
      categoryPath: categoryPathFor(product.categoryId),
      brandId: brandById.get(String(product.brandId)) || product.brandId,
      categoryId: byId.get(String(product.categoryId)),
    };
  });
  let configuredDefinitions = [];
  if (requestedCategoryRecord) {
    configuredDefinitions = effectiveFilterDefinitions(categories, requestedCategoryRecord._id).filter((definition) => definition.isFilterable);
  } else {
    // On brand or search pages, collect filter definitions from all categories present in the results
    const seenKeys = new Set();
    for (const item of categoryGroupCounts) {
      if (!item._id) continue;
      const defs = effectiveFilterDefinitions(categories, item._id).filter((definition) => definition.isFilterable);
      for (const d of defs) {
        const lowerKey = d.key.toLowerCase();
        if (!seenKeys.has(lowerKey)) {
          seenKeys.add(lowerKey);
          configuredDefinitions.push(d);
        }
      }
    }
  }
  const configuredByKey = new Map(configuredDefinitions.map((definition) => [definition.key.toLowerCase(), definition]));
  const specMap = new Map();
  for (const spec of result.specs || []) {
    const rawKey = spec._id.key?.trim() || '';
    if (!rawKey) continue;
    if (/^(brand|manufacturer|model|model number|sku|warranty|country of origin|hsn|hsn code|stock|inventory|variant|highlight \d+|product url|information phone|dealer price|price|standard price)$/i.test(rawKey)) continue;

    const lowerKey = rawKey.toLowerCase();
    const isConfigured = configuredByKey.has(lowerKey);
    const definition = configuredByKey.get(lowerKey) || {
      key: rawKey,
      label: rawKey.charAt(0).toUpperCase() + rawKey.slice(1),
      inputType: 'multi-select',
      unit: '',
      options: [],
      isConfigured: false,
    };

    if (!specMap.has(definition.key)) {
      specMap.set(definition.key, {
        definition: { ...definition, isConfigured: Boolean(isConfigured) },
        values: [],
        totalCount: 0,
      });
    }
    const entry = specMap.get(definition.key);
    entry.values.push({ val: spec._id.value, count: spec.count });
    entry.totalCount += spec.count;
  }
  const sortedSpecs = [...specMap.values()]
    .filter(({ values }) => values.length > 0)
    .sort((a, b) => {
      // 1. Configured category definitions come first
      if (a.definition.isConfigured && !b.definition.isConfigured) return -1;
      if (!a.definition.isConfigured && b.definition.isConfigured) return 1;
      if (a.definition.sortOrder !== undefined && b.definition.sortOrder !== undefined) {
        if (a.definition.sortOrder !== b.definition.sortOrder) return a.definition.sortOrder - b.definition.sortOrder;
      }
      // 2. Prefer specs with more than 1 distinct value
      const aMultiple = a.values.length > 1 ? 1 : 0;
      const bMultiple = b.values.length > 1 ? 1 : 0;
      if (bMultiple !== aMultiple) return bMultiple - aMultiple;
      // 3. Prefer specs covering more distinct values or products
      if (b.values.length !== a.values.length) return b.values.length - a.values.length;
      return b.totalCount - a.totalCount;
    })
    .slice(0, 8)
    .map(({ definition, values }) => ({
      key: definition.key,
      label: definition.label,
      inputType: definition.inputType,
      unit: definition.unit,
      values: definition.options?.length
        ? [...values].sort((a, b) => definition.options.indexOf(a.val) - definition.options.indexOf(b.val))
        : values.sort((a, b) => b.count - a.count),
    }));
  return {
    products, pagination: { page, limit, total: result.total[0]?.count || 0, totalPages: Math.ceil((result.total[0]?.count || 0) / limit) },
    facets: {
      categories: categoryGroupCounts.map((item) => {
        const cat = byId.get(String(item._id));
        return cat ? { _id: String(cat._id), name: cat.name, slug: cat.slug, count: item.count } : null;
      }).filter(Boolean),
      brands: categoryBrands.map((item) => ({ name: item._id, count: item.count })),
      availability: ['in-stock', 'low-stock', 'on-order', 'out-of-stock'].map((status) => ({
        status,
        count: availabilityCounts.find((item) => item._id === status)?.count || 0,
      })),
      specs: sortedSpecs,
    },
  };
};

export const getPublicProductById = async (id, user) => {
  const result = await getPublicProducts({ id, limit: 1, includeFacets: 'false' }, user);
  if (!result.products.length) throw new AppError('Product not found.', 404, 'NOT_FOUND');
  return result.products[0];
};

// Newest product from each root category's subtree, in root category order.
// Replaces one catalog request per root category on the storefront home page.
export const getCategoryHighlights = async (user, maxItems = 12) => {
  const categories = await getPublicCategories();
  const byId = new Map(categories.map((category) => [String(category._id), category]));
  const rootIdOf = (category) => {
    const visited = new Set();
    let current = category;
    while (current?.parentId && !visited.has(String(current._id))) {
      visited.add(String(current._id));
      current = byId.get(String(current.parentId._id || current.parentId));
    }
    return current ? String(current._id) : null;
  };
  const newestPerCategory = await Product.aggregate([
    { $match: { isActive: true, categoryId: { $in: categories.map((category) => category._id) } } },
    { $sort: { categoryId: 1, createdAt: -1, _id: 1 } },
    { $group: { _id: '$categoryId', productId: { $first: '$_id' }, createdAt: { $first: '$createdAt' } } },
  ]);
  const newestPerRoot = new Map();
  for (const row of newestPerCategory) {
    const rootId = rootIdOf(byId.get(String(row._id)));
    if (!rootId) continue;
    const current = newestPerRoot.get(rootId);
    const isNewer = !current || row.createdAt > current.createdAt
      || (row.createdAt?.getTime() === current.createdAt?.getTime() && String(row.productId) < String(current.productId));
    if (isNewer) newestPerRoot.set(rootId, row);
  }
  const orderedIds = categories
    .filter((category) => !category.parentId && newestPerRoot.has(String(category._id)))
    .map((category) => String(newestPerRoot.get(String(category._id)).productId))
    .slice(0, maxItems);
  if (!orderedIds.length) return [];
  const { products } = await getPublicProducts({ limit: orderedIds.length, includeFacets: 'false' }, user, { ids: orderedIds });
  const productById = new Map(products.map((product) => [String(product._id), product]));
  return orderedIds.map((id) => productById.get(id)).filter(Boolean);
};
