import { normalizeVariants, variantStockChange, hasVariants } from '../utils/productVariants.js';
import { variantSummary } from '../../../shared/productVariants.js';
import { isDraftIdentifier } from '../../../shared/productDrafts.js';
import { isWarrantyLink } from '../../../shared/productPresentation.js';
import { stockUpdate } from '../utils/productStockUpdate.js';
import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { Brand } from '../models/Brand.js';
import { Cart } from '../models/Cart.js';
import { DealerPricing } from '../models/DealerPricing.js';
import { Enquiry } from '../models/Enquiry.js';
import { stockSearchScore } from '../utils/productStockSearch.js';
import { storageService } from './storage/storage.service.js';
import { AppError } from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../constants/errorCodes.js';
import { findCategoryAndDescendantIds } from './category.service.js';

// Older gallery rows may contain a Cloudinary URL without its public ID.
export const getProductImagePublicId = (image) => {
  if (image.publicId) return image.publicId;
  try {
    const url = new URL(image.url);
    if (url.hostname !== 'res.cloudinary.com') return null;
    const prefix = `/${config.cloudinaryCloudName}/image/upload/`;
    if (!config.cloudinaryCloudName || !url.pathname.startsWith(prefix)) return null;
    const deliveryPath = decodeURIComponent(url.pathname.slice(prefix.length));
    // Cloudinary delivery URLs can contain transformation and version segments.
    const folderIndex = deliveryPath.indexOf('vinexus/products/');
    const path = folderIndex >= 0 ? deliveryPath.slice(folderIndex) : deliveryPath;
    // Only infer IDs for this app's product folder, never external images.
    if (!path.startsWith('vinexus/products/')) return null;
    return path.replace(/\.[^/.]+$/, '');
  } catch {
    return null;
  }
};

const cleanupProductImages = async (product) => {
  const pending = [...(product.pendingImageDeletions || [])];
  for (const publicId of pending) {
    const result = await storageService.deleteFile(publicId);
    if (!result.success) {
      throw new AppError(
        'Product saved, but image storage cleanup failed. Save again to retry deletion.',
        HTTP_STATUS.BAD_GATEWAY,
        ERROR_CODES.INTERNAL_ERROR,
      );
    }
    product.pendingImageDeletions = product.pendingImageDeletions.filter((id) => id !== publicId);
    await product.save({ validateModifiedOnly: true });
  }
};

const withManagedBrand = (specifications, name) => {
  let found = false;
  const ordered = specifications.flatMap(spec => {
    if (!/^(brand|manufacturer)$/i.test(spec.key)) return [spec];
    if (found) return [];
    found = true;
    return [{ key: 'Brand', value: name }];
  });
  return found ? ordered : [...ordered, { key: 'Brand', value: name }];
};

const slugify = (value = '') => (value || '').toString().toLowerCase().trim().replace(/^https?:\/\/(www\.)?/i, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const sanitizeBrandSlug = (brand) => {
  if (!brand || typeof brand !== 'object') return brand;
  const raw = (brand.slug || '').toString().trim();
  if (!raw || /https?:|\/|www\./i.test(raw)) {
    brand.slug = slugify(brand.name || raw);
  } else {
    brand.slug = slugify(raw) || slugify(brand.name);
  }
  return brand;
};

/**
 * Safely escape regex special characters to prevent regex injection or ReDoS attacks.
 * @param {string} text
 * @returns {string}
 */
const escapeRegex = (text) => {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export const productService = {
  async searchStockProducts({ search = '', page = 1, limit = 10 } = {}) {
    const selection = 'name model modelNumber sku stockQuantity isActive variants';
    const skip = (page - 1) * limit;
    let products;
    let total;
    if (search.trim()) {
      // Search every product, including inactive entries and other catalog pages.
      const candidates = await Product.find({}).select(selection).lean();
      const matches = candidates.map((product) => ({ product, score: stockSearchScore(product, search) }))
        .filter((match) => match.score !== null)
        .sort((a, b) => a.score - b.score || a.product.name.localeCompare(b.product.name) || String(a.product._id).localeCompare(String(b.product._id)));
      total = matches.length;
      products = matches.slice(skip, skip + limit).map((match) => match.product);
    } else {
      total = await Product.countDocuments({});
      products = await Product.find({}).select(selection).sort({ name: 1, _id: 1 }).skip(skip).limit(limit).lean();
    }
    return { products, pagination: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  },

  async addProductStock(id, quantity, operation = 'add', variantId) {
    if (!mongoose.Types.ObjectId.isValid(id) || !Number.isSafeInteger(quantity) || quantity <= 0 || !['add', 'remove'].includes(operation)) {
      throw new AppError('Choose add or remove and enter a positive whole number of units.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
    }
    if (variantId) {
      const change = variantStockChange(id, variantId, operation === 'remove' ? -quantity : quantity, { active: false });
      const updated = await Product.findOneAndUpdate(change.filter, change.update, { new: true, runValidators: true });
      if (!updated) throw new AppError('Variant stock changed. Refresh and check the available quantity.', 409, ERROR_CODES.CONFLICT);
      return updated;
    }
    const product = await Product.findOneAndUpdate({
      _id: id,
      'variants.0': { $exists: false },
      ...(operation === 'remove' ? { stockQuantity: { $gte: quantity } }
        : { $or: [{ stockQuantity: { $lte: Number.MAX_SAFE_INTEGER - quantity } }, { stockQuantity: { $exists: false } }] }),
    }, stockUpdate(operation === 'remove' ? -quantity : quantity, new Date(), operation === 'remove'), { new: true, runValidators: true });
    if (!product) {
      if (!await Product.exists({ _id: id })) throw new AppError('Product not found.', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
      throw new AppError(operation === 'remove' ? 'Cannot remove more units than the available stock. Refresh and try again.' : 'Total stock quantity is too large.', operation === 'remove' ? HTTP_STATUS.CONFLICT : HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
    }
    return product;
  },

  async permanentlyDeleteProduct(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Invalid product ID.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
    const product = await Product.findById(id);
    if (!product) throw new AppError('Product not found.', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);

    // Hide immediately; retain the document and storage IDs if cleanup fails so deletion can be retried.
    await Product.updateOne({ _id: id }, { $set: { isActive: false } });
    for (const [field, value] of Object.entries({ sku: product.sku, modelNumber: product.modelNumber, modelName: product.model })) {
      if (!value) continue;
      await Enquiry.updateMany({ 'items.productId': product._id }, {
        $set: { [`items.$[item].${field}`]: value },
      }, { arrayFilters: [{ 'item.productId': product._id, [`item.${field}`]: { $in: [null, ''] } }] });
    }
    const publicIds = new Set([
      ...(product.images || []).map(getProductImagePublicId).filter(Boolean),
      ...(product.pendingImageDeletions || []),
    ]);
    for (const publicId of publicIds) {
      const result = await storageService.deleteFile(publicId);
      if (!result.success) throw new AppError('Image cleanup failed. The product is deactivated; retry Delete Product to finish removing it.', HTTP_STATUS.BAD_GATEWAY, ERROR_CODES.INTERNAL_ERROR);
    }
    await Cart.updateMany({ 'items.productId': product._id }, { $pull: { items: { productId: product._id } } });
    await DealerPricing.deleteMany({ productId: product._id });
    await Product.deleteOne({ _id: product._id });
    return { deleted: true, message: 'Product permanently deleted. Historical enquiries have been preserved.' };
  },
  /**
   * Create a new product.
   */
  async createProduct({
    sku,
    name,
    modelNumber,
    model,
    stockQuantity = 0,
    variant = '',
    variants = [],
    warranty = '',
    warrantyType = 'text',
    hsnCode = '',
    informationPhone,
    productUrl,
    categoryId,
    categoryIds = [],
    brandId,
    description,
    images = [],
    specifications = [],
    additionalDetails = [],
    standardPrice = 0,
    dealerPrice = 0,
    isNewArrival = false,
    isTrending = false,
    isLowStock = false,
    isActive = true,
  }) {
    if (warrantyType === 'link' && (isActive || warranty?.trim()) && !isWarrantyLink(warranty?.trim())) {
      throw new AppError('Enter a valid HTTP or HTTPS warranty link.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, [{ path: 'warranty', message: 'Enter a valid HTTP or HTTPS warranty link.' }]);
    }
    const draftIdentifier = `__DRAFT__${new mongoose.Types.ObjectId()}`;
    if (!isActive) {
      sku = sku?.trim() || draftIdentifier;
      modelNumber = modelNumber?.trim() || draftIdentifier;
      name = name?.trim() || '';
    }
    const uppercaseSku = sku.trim().toUpperCase();

    // Check duplicate SKU
    const existingProduct = await Product.findOne({ sku: uppercaseSku });
    if (existingProduct) {
      throw new AppError(
        `Product with SKU '${uppercaseSku}' already exists.`,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.BAD_REQUEST
      );
    }

    const cleanCategoryIds = Array.isArray(categoryIds)
      ? categoryIds.filter((cid) => mongoose.Types.ObjectId.isValid(cid)).map(String)
      : [];

    let primaryCategoryId = categoryId;
    if (!primaryCategoryId && cleanCategoryIds.length > 0) {
      primaryCategoryId = cleanCategoryIds[0];
    }
    if (primaryCategoryId && !cleanCategoryIds.includes(String(primaryCategoryId))) {
      cleanCategoryIds.unshift(String(primaryCategoryId));
    }

    // Verify referenced category exists and is active
    if ((isActive || primaryCategoryId) && (!primaryCategoryId || !mongoose.Types.ObjectId.isValid(primaryCategoryId))) {
      throw new AppError('Invalid categoryId format.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
    }

    const category = primaryCategoryId && await Category.findById(primaryCategoryId);
    if ((isActive || primaryCategoryId) && !category) {
      throw new AppError('Referenced category does not exist.', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
    }
    if (category && !category.isActive) {
      throw new AppError(
        'Cannot assign product to an inactive category.',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.BAD_REQUEST
      );
    }
    const brand = brandId && await Brand.findOne({ _id: brandId, isActive: true });
    if ((isActive || brandId) && !brand) throw new AppError('Please select an active managed brand.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, [{ path: 'brandId', message: 'Please select an active managed brand.' }]);
    if (!modelNumber?.trim()) throw new AppError('Model number is required.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, [{ path: 'modelNumber', message: 'Model number is required.' }]);
    const resolvedModel = model?.trim() || 'Standard Model';
    const existingModelNumber = await Product.findOne({ modelNumber: modelNumber.trim() });
    if (existingModelNumber) throw new AppError('Model number must be unique.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, [{ path: 'modelNumber', message: 'Model number must be unique.' }]);
    const normalizedSpecifications = brand ? withManagedBrand(specifications, brand.name) : specifications;
    if (isActive && (isDraftIdentifier(uppercaseSku) || isDraftIdentifier(modelNumber))) {
      throw new AppError('Complete the SKU and model number before publishing.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
    }
    if (isActive && images.length === 0) {
      throw new AppError('At least one uploaded product image is required before publishing.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
    }

    const product = await Product.create({
      sku: uppercaseSku,
      name: name.trim(),
      modelNumber: modelNumber.trim(),
      model: resolvedModel,
      stockQuantity: Number(stockQuantity) >= 0 ? Number(stockQuantity) : 0,
      variant: variant?.trim() || '',
      variants: normalizeVariants(variants),
      warranty: warranty?.trim() || '',
      warrantyType,
      hsnCode: hsnCode.trim(),
      informationPhone: informationPhone?.trim() || undefined,
      productUrl: productUrl?.trim() || '',
      categoryId: primaryCategoryId,
      categoryIds: cleanCategoryIds,
      brandId,
      description: description ? description.trim() : undefined,
      images,
      specifications: normalizedSpecifications,
      additionalDetails,
      standardPrice,
      dealerPrice,
      isNewArrival,
      isTrending,
      isLowStock,
      isActive,
    });

    return product;
  },

  /**
   * Get main catalog listing with search, filters, pagination, and sorting.
   */
  async getProducts(queryParams = {}) {
    const {
      search,
      categoryId,
      category,
      categorySlug: rawCategorySlug,
      brand,
isActive,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = queryParams;

    const categorySlug = category || rawCategorySlug;

    const filter = {};
    const andClauses = [];

    // Filter by brand parameter (supports exact brand specification or brand keyword in product name)
    if (brand && brand.trim()) {
      const cleanBrand = brand.trim();
      const escapedBrand = escapeRegex(cleanBrand);
      const brandRegex = new RegExp(`^${escapedBrand}$`, 'i');
      const brandWordRegex = new RegExp(`(^|\\s|\\W)${escapedBrand}(\\W|\\s|$)`, 'i');
      andClauses.push({
        $or: [
          { specifications: { $elemMatch: { key: /^brand$/i, value: brandRegex } } },
          { name: brandWordRegex },
        ],
      });
    }

    // Filter by search query (sanitized regex search on product name, SKU, or matching category names)
    if (search && search.trim()) {
      const escapedSearch = escapeRegex(search.trim());
      const searchRegex = new RegExp(escapedSearch, 'i');

      const matchedCategories = await Category.find({
        $or: [{ name: searchRegex }, { slug: searchRegex }],
      }).select('_id').lean();

      if (matchedCategories.length > 0) {
        const allCatIds = await findCategoryAndDescendantIds(matchedCategories.map((c) => c._id));
        andClauses.push({
          $or: [
            { name: searchRegex },
            { sku: searchRegex },
            { categoryId: { $in: allCatIds } },
          ],
        });
      } else {
        andClauses.push({
          $or: [{ name: searchRegex }, { sku: searchRegex }],
        });
      }
    }

    // Low-stock merchandising is explicitly selected by an administrator.
    if (queryParams.lowStock === 'true' || queryParams.lowStock === true || queryParams.availability === 'low-stock') {
      andClauses.push({ isLowStock: true });
    }

    if (andClauses.length > 0) {
      filter.$and = andClauses;
    }

    // Filter by categoryId (supports querying header category, main category, or subcategory)
    if (categoryId) {
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        throw new AppError('Invalid categoryId query filter format.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
      }
      const catIds = await findCategoryAndDescendantIds([categoryId]);
      filter.$or = [
        { categoryId: { $in: catIds } },
        { categoryIds: { $in: catIds } },
      ];
    } else if (categorySlug && categorySlug.trim()) {
      const trimmedSlug = categorySlug.trim().toLowerCase();
      const foundCategory = await Category.findOne({
        $or: [{ slug: trimmedSlug }, { name: new RegExp(`^${escapeRegex(trimmedSlug)}$`, 'i') }],
      }).select('_id').lean();
      if (foundCategory) {
        const catIds = await findCategoryAndDescendantIds([foundCategory._id]);
        filter.$or = [
          { categoryId: { $in: catIds } },
          { categoryIds: { $in: catIds } },
        ];
      }
    }

    // OR within each category level; AND between levels, including descendants.
    for (const key of ['headerCategoryIds', 'mainCategoryIds', 'subCategoryIds']) {
      if (!queryParams[key]) continue;
      const ids = String(queryParams[key]).split(',');
      if (ids.some(id => !mongoose.Types.ObjectId.isValid(id))) {
        throw new AppError('Invalid category filter format.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
      }
      const catIds = await findCategoryAndDescendantIds(ids);
      filter.$and = [...(filter.$and || []), { $or: [
        { categoryId: { $in: catIds } }, { categoryIds: { $in: catIds } },
      ] }];
    }

    // Filter by isActive flag
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true' || isActive === true;
    }

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (parsedPage - 1) * parsedLimit;

    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const sortField = sortBy === 'sortOrder' ? 'createdAt' : sortBy;
    // A unique tie-breaker keeps equal names, prices or timestamps in the
    // same order across paginated requests (including bulk-imported products).
    const sortOptions = { [sortField]: sortDirection, _id: 1 };

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('categoryId', 'name slug')
        .populate('brandId', 'name slug logo isActive')
        .sort(sortOptions)
        .skip(skip)
        .limit(parsedLimit)
        .select('-__v')
        .lean(),
      Product.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / parsedLimit);

    if (products && products.length) {
      products.forEach((p) => {
        if (p.brandId) {
          sanitizeBrandSlug(p.brandId);
        }
      });
    }

    return {
      products,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages,
      },
    };
  },

  /**
   * Get single product details by ID.
   */
  async getProductById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid product ID format.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
    }

    const product = await Product.findById(id)
      .populate('categoryId', 'name slug parentId')
      .populate('categoryIds', 'name slug parentId')
      .populate('brandId', 'name slug logo isActive')
      .select('-__v +priceHistory');

    if (!product) {
      throw new AppError('Product not found.', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
    }

    if (product.brandId) {
      sanitizeBrandSlug(product.brandId);
    }

    return product;
  },

  /**
   * Update product while preserving unsupplied fields.
   */
  async updateProduct(id, updateData, actor = null, priceAttempt = 0) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid product ID format.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
    }

    const product = await Product.findById(id);
    if (!product) {
      throw new AppError('Product not found.', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
    }

    if (updateData.expectedUpdatedAt) {
      const expected = new Date(updateData.expectedUpdatedAt);
      if (!product.updatedAt || product.updatedAt.getTime() !== expected.getTime()) {
        throw new AppError('This product changed in the catalogue during sync. Retry Sync Products.', HTTP_STATUS.CONFLICT, ERROR_CODES.CONFLICT);
      }
      product.$where = { ...(product.$where || {}), updatedAt: expected };
    }

    if (updateData.images !== undefined && updateData.expectedImages !== undefined) {
      const identities = images => [...new Set(images.map(image => typeof image === 'string' ? image : (image.publicId || image.url)))].sort();
      if (JSON.stringify(identities(product.images || [])) !== JSON.stringify(identities(updateData.expectedImages))) {
        const message = 'The product gallery changed in another session. Refresh before replacing or removing images.';
        throw new AppError(message, HTTP_STATUS.CONFLICT, ERROR_CODES.CONFLICT, [{ path: 'images', message }]);
      }
    }

    if (updateData.variants !== undefined) {
      const snapshot = rows => (rows || []).map(row => ({ _id: String(row._id), name: row.name, sku: row.sku || '', standardPrice: row.standardPrice, dealerPrice: row.dealerPrice || 0, stockQuantity: row.stockQuantity, isActive: row.isActive !== false }));
      if (updateData.expectedVariants && JSON.stringify(snapshot(product.variants)) !== JSON.stringify(snapshot(updateData.expectedVariants))) {
        throw new AppError('Variant prices or stock changed in another session. Refresh before saving.', 409, ERROR_CODES.CONFLICT);
      }
      updateData.expectedUpdatedAt ||= product.updatedAt;
      product.$where = { ...(product.$where || {}), updatedAt: product.updatedAt };
      if (JSON.stringify((product.variants || []).map(row => row.stockQuantity)) !== JSON.stringify(updateData.variants.map(row => row.stockQuantity))) product.stockUpdatedAt = new Date();
      updateData.variants = normalizeVariants(updateData.variants, product.variants || []);
      const summary = variantSummary(updateData.variants);
      Object.assign(updateData, { stockQuantity: summary.stockQuantity, standardPrice: summary.standardPrice, dealerPrice: summary.dealerPrice });
    }
    if (hasVariants(product) && updateData.variants === undefined && ['stockQuantity', 'standardPrice', 'dealerPrice'].some(key => updateData[key] !== undefined && updateData[key] !== product[key])) {
      throw new AppError('Edit prices and stock on the individual variants for this product.', 400, ERROR_CODES.VALIDATION_ERROR);
    }
    const priceChanges = [];
    const originalPrices = {};
    const changedAt = new Date();
    for (const [field, priceType] of [['standardPrice', 'standard'], ['dealerPrice', 'dealer']]) {
      const previousPrice = product[field] ?? 0;
      if (updateData[field] === undefined || previousPrice === updateData[field]) continue;
      originalPrices[field] = previousPrice;
      priceChanges.push({ priceType, previousPrice, newPrice: updateData[field], changedAt,
        changedBy: actor?._id || null, changedByName: actor?.fullName || actor?.name || 'System' });
    }

    if (updateData.variants) for (const option of updateData.variants) {
      const previous = (product.variants || []).find(row => String(row._id) === String(option._id));
      if (!previous) continue;
      for (const [field, priceType] of [['standardPrice', 'standard'], ['dealerPrice', 'dealer']]) {
        if (Number(previous[field] || 0) !== option[field]) priceChanges.push({ priceType, variantId: option._id, variantName: option.name,
          previousPrice: Number(previous[field] || 0), newPrice: option[field], changedAt,
          changedBy: actor?._id || null, changedByName: actor?.fullName || actor?.name || 'System' });
      }
    }
    const savingDraft = updateData.isActive === false || (updateData.isActive === undefined && product.isActive === false);
    if (savingDraft) {
      if (updateData.sku === '') updateData.sku = `__DRAFT__${new mongoose.Types.ObjectId()}`;
      if (updateData.modelNumber === '') updateData.modelNumber = `__DRAFT__${new mongoose.Types.ObjectId()}`;
    }

    // Validate SKU uniqueness if SKU is updated
    if (updateData.sku) {
      const uppercaseSku = updateData.sku.trim().toUpperCase();
      if (uppercaseSku !== product.sku) {
        const duplicate = await Product.findOne({ sku: uppercaseSku, _id: { $ne: id } });
        if (duplicate) {
          throw new AppError(
            `Product with SKU '${uppercaseSku}' already exists.`,
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.BAD_REQUEST
          );
        }
        product.sku = uppercaseSku;
      }
    }

    // Validate category existence and active status if categoryId or categoryIds is updated
    if (updateData.categoryIds !== undefined) {
      const cleanCategoryIds = Array.isArray(updateData.categoryIds)
        ? updateData.categoryIds.filter((cid) => mongoose.Types.ObjectId.isValid(cid)).map(String)
        : [];
      if (cleanCategoryIds.length) {
        const activeCount = await Category.countDocuments({ _id: { $in: [...new Set(cleanCategoryIds)] }, isActive: true });
        if (activeCount !== new Set(cleanCategoryIds).size) {
          throw new AppError('Select existing active categories.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, [{ path: 'categoryId', message: 'Select existing active categories.' }]);
        }
      }
      product.categoryIds = cleanCategoryIds;
      if (updateData.categoryId === undefined && !cleanCategoryIds.includes(String(product.categoryId || ''))) {
        product.categoryId = cleanCategoryIds[0] || null;
      }
    }

    if (updateData.categoryId === null) product.categoryId = null;
    if (updateData.categoryId) {
      if (!mongoose.Types.ObjectId.isValid(updateData.categoryId)) {
        throw new AppError('Invalid categoryId format.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
      }

      const category = await Category.findById(updateData.categoryId);
      if (!category) {
        throw new AppError('Referenced category does not exist.', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
      }
      if (!category.isActive) {
        throw new AppError(
          'Cannot assign product to an inactive category.',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.BAD_REQUEST
        );
      }
      product.categoryId = updateData.categoryId;
      if (product.categoryIds && !product.categoryIds.map(String).includes(String(updateData.categoryId))) {
        product.categoryIds.unshift(updateData.categoryId);
      }
    }

    // Preserve existing fields that were not supplied
    if (updateData.name !== undefined) product.name = updateData.name.trim();
    if (updateData.modelNumber !== undefined) {
      const duplicateModel = await Product.findOne({ modelNumber: updateData.modelNumber.trim(), _id: { $ne: id } });
      if (duplicateModel) throw new AppError('Model number must be unique.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, [{ path: 'modelNumber', message: 'Model number must be unique.' }]);
      product.modelNumber = updateData.modelNumber.trim();
    }
    if (updateData.model !== undefined) product.model = updateData.model.trim();
    if (updateData.stockQuantity !== undefined) {
      const parsedStock = Number(updateData.stockQuantity);
      const newStock = !isNaN(parsedStock) && parsedStock >= 0 ? parsedStock : 0;
      if (product.stockQuantity !== newStock) {
        product.stockQuantity = newStock;
        product.stockUpdatedAt = new Date();
      }
    }
    if (updateData.variants !== undefined) product.variants = updateData.variants;
    if (updateData.variant !== undefined) product.variant = updateData.variant.trim();
    if (updateData.hsnCode !== undefined) product.hsnCode = updateData.hsnCode.trim();
    if (updateData.warrantyType !== undefined || updateData.warranty !== undefined) {
      const warrantyType = updateData.warrantyType ?? product.warrantyType ?? 'text';
      const warranty = (updateData.warranty ?? product.warranty ?? '').trim();
      if (warrantyType === 'link' && (!savingDraft || warranty) && !isWarrantyLink(warranty)) {
        throw new AppError('Enter a valid HTTP or HTTPS warranty link.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, [{ path: 'warranty', message: 'Enter a valid HTTP or HTTPS warranty link.' }]);
      }
      product.warranty = warranty;
      product.warrantyType = warrantyType;
    }
    if (updateData.informationPhone !== undefined) product.informationPhone = updateData.informationPhone?.trim() || '';
    if (updateData.productUrl !== undefined) product.productUrl = updateData.productUrl?.trim() || '';
    if (updateData.description !== undefined) product.description = updateData.description ? updateData.description.trim() : null;
    if (updateData.images !== undefined) {
      const retained = new Set(updateData.images.map(getProductImagePublicId).filter(Boolean));
      const removed = (product.images || []).map(getProductImagePublicId)
        .filter((publicId) => publicId && !retained.has(publicId));
      product.pendingImageDeletions = [...new Set([
        ...(product.pendingImageDeletions || []), ...removed,
      ])].filter((publicId) => !retained.has(publicId));
      product.images = updateData.images;
    }
    if (updateData.specifications !== undefined) product.specifications = updateData.specifications;
    if (updateData.additionalDetails !== undefined) product.additionalDetails = updateData.additionalDetails;
    if (updateData.standardPrice !== undefined) product.standardPrice = updateData.standardPrice;
    if (updateData.dealerPrice !== undefined) product.dealerPrice = updateData.dealerPrice;
    if (updateData.isNewArrival !== undefined) product.isNewArrival = updateData.isNewArrival;
    if (updateData.isTrending !== undefined) product.isTrending = updateData.isTrending;
    if (updateData.isLowStock !== undefined) product.isLowStock = updateData.isLowStock;
    const publishingDraft = product.isActive === false && updateData.isActive === true;
    if (updateData.isActive !== undefined) product.isActive = updateData.isActive;
    if (savingDraft && updateData.brandId === null) product.brandId = null;
    else if (updateData.brandId !== undefined) {
      const brand = await Brand.findOne({ _id: updateData.brandId, isActive: true });
      if (!brand) throw new AppError('Please select an active managed brand.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, [{ path: 'brandId', message: 'Please select an active managed brand.' }]);
      product.brandId = updateData.brandId;
      product.specifications = withManagedBrand(product.specifications || [], brand.name);
    }

    if (publishingDraft) {
      const missing = [];
      if (!product.name || product.name.trim().length < 2) missing.push({ path: 'name', message: 'Product name is required before publishing.' });
      if (!product.sku || isDraftIdentifier(product.sku) || product.sku.length < 2) missing.push({ path: 'sku', message: 'SKU is required before publishing.' });
      if (!product.modelNumber || isDraftIdentifier(product.modelNumber)) missing.push({ path: 'modelNumber', message: 'Model number is required before publishing.' });
      if (!product.categoryId) missing.push({ path: 'categoryId', message: 'Select a category before publishing.' });
      if (!product.brandId) missing.push({ path: 'brandId', message: 'Select a brand before publishing.' });
      if (product.warrantyType === 'link' && !isWarrantyLink(product.warranty)) missing.push({ path: 'warranty', message: 'Enter a valid HTTP or HTTPS warranty link.' });
      if (!product.images?.length) missing.push({ path: 'images', message: 'Upload at least one image before publishing.' });
      if (missing.length) throw new AppError('Complete the required product details before publishing.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, missing);
      const brand = await Brand.findOne({ _id: product.brandId, isActive: true });
      const category = await Category.findOne({ _id: product.categoryId, isActive: true });
      if (!brand || !category) throw new AppError('Select an active brand and category before publishing.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
      await product.validate();
    }
    let savedProduct = product;
    if (priceChanges.length) {
      await product.validate({ validateModifiedOnly: true });
      const paths = product.directModifiedPaths();
      const updates = Object.fromEntries(paths
        .filter((path) => !paths.some((parent) => parent !== path && path.startsWith(`${parent}.`)))
        .map((path) => [path, product.get(path)]));
      // The hydrated document above validates draft fields with their parent
      // visibility. Query validators cannot see that parent for nested rows.
      // Append the audit entries in the same write as the prices. Compare old
      // prices to avoid logging a stale previous value during simultaneous edits.
      savedProduct = await Product.findOneAndUpdate({ _id: id, ...(updateData.expectedUpdatedAt ? { updatedAt: new Date(updateData.expectedUpdatedAt) } : {}), ...(updateData.images !== undefined ? { __v: product.__v } : {}), ...(Object.keys(originalPrices).length ? { $and: Object.entries(originalPrices).map(([field, value]) => ({
        $or: [{ [field]: value }, { [field]: { $exists: false } }],
      })) } : {}) }, { $set: updates, $push: { priceHistory: { $each: priceChanges } }, ...(updateData.images !== undefined ? { $inc: { __v: 1 } } : {}) }, { new: true, runValidators: !savingDraft });
      if (!savedProduct) {
        if (priceAttempt < 3) return this.updateProduct(id, updateData, actor, priceAttempt + 1);
        throw new AppError('Prices changed while saving. Refresh the product and try again.', HTTP_STATUS.CONFLICT, ERROR_CODES.BAD_REQUEST);
      }
    } else {
      try { await product.save({ validateModifiedOnly: true }); }
      catch (error) {
        if (updateData.expectedUpdatedAt && error.name === 'DocumentNotFoundError') throw new AppError('This product changed in the catalogue during sync. Retry Sync Products.', HTTP_STATUS.CONFLICT, ERROR_CODES.CONFLICT);
        throw error;
      }
    }
    if (updateData.expectedUpdatedAt) product.$where = undefined;
    await cleanupProductImages(savedProduct);

    return savedProduct;
  },

  /**
   * Safely deactivate product (isActive = false).
   */
  async deleteProduct(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid product ID format.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
    }

    const product = await Product.findById(id);
    if (!product) {
      throw new AppError('Product not found.', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
    }

    product.isActive = false;
    await product.save({ validateModifiedOnly: true });

    return {
      deactivated: true,
      message: 'Product successfully deactivated.',
      product,
    };
  },

  /**
   * Upload an image for a product.
   */
  async uploadProductImage(id, file, altText = '') {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid product ID format.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
    }

    const product = await Product.findById(id);
    if (!product) {
      throw new AppError('Product not found.', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
    }

    const folder = `vinexus/products/${product._id}`;
    const uploaded = await storageService.uploadFile({
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
      folder,
      category: 'product',
    });

    const imageData = {
      url: uploaded.url,
      publicId: uploaded.publicId,
      altText: String(altText || product.name || '').trim().slice(0, 150),
      sortOrder: (product.images || []).length,
    };

    try {
      const updatedProduct = await Product.findByIdAndUpdate(
        id,
        { $push: { images: imageData }, $inc: { __v: 1 } },
        { new: true, runValidators: true }
      );
      if (!updatedProduct) throw new AppError('Product no longer exists. Refresh the catalog.', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
      updatedProduct.$locals = { ...updatedProduct.$locals, uploadedImage: imageData };
      return updatedProduct;
    } catch (error) {
      // An upload is not owned by a product until its DB write succeeds.
      await storageService.deleteFile(uploaded.publicId);
      throw error;
    }
  },

  /**
   * Delete an image from a product.
   */
  async deleteProductImage(id, publicId) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid product ID format.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
    }

    const product = await Product.findById(id);
    if (!product) {
      throw new AppError('Product not found.', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
    }

    const imgIndex = (product.images || []).findIndex((img) => img.publicId === publicId);
    if (imgIndex === -1) {
      throw new AppError('Product image with specified publicId not found.', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
    }

    return this.updateProduct(id, {
      images: product.images.filter((img) => img.publicId !== publicId)
        .map((img, sortOrder) => ({
          url: img.url, publicId: img.publicId, altText: img.altText, sortOrder,
        })),
    });
  },
};

export default productService;
