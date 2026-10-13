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
import { effectiveFilterDefinitions, getPublicCategories } from './catalog.service.js';
import { findCategoryAndDescendantIds } from './category.service.js';

// Older gallery rows may contain a Cloudinary URL without its public ID.
export const getProductImagePublicId = (image) => {
  if (image.publicId) return image.publicId;
  try {
    const url = new URL(image.url);
    if (url.hostname !== 'res.cloudinary.com') return null;
    const prefix = `/${config.cloudinaryCloudName}/image/upload/`;
    if (!config.cloudinaryCloudName || !url.pathname.startsWith(prefix)) return null;
    const path = decodeURIComponent(url.pathname.slice(prefix.length)).replace(/^v\d+\//, '');
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
    await product.save();
  }
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

const validateCategorySpecifications = async (categoryId, specifications = []) => {
  const categories = await getPublicCategories();
  const definitions = effectiveFilterDefinitions(categories, categoryId);
  const valuesByKey = new Map();
  for (const specification of specifications) {
    const key = specification.key.trim().toLowerCase();
    if (!valuesByKey.has(key)) valuesByKey.set(key, []);
    valuesByKey.get(key).push(specification.value.trim());
  }
  for (const definition of definitions) {
    const values = valuesByKey.get(definition.key.toLowerCase()) || [];
    if (definition.isRequired && values.length === 0) {
      throw new AppError(`${definition.label} is required for this category.`, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
    }
    if (['select', 'multi-select'].includes(definition.inputType)) {
      const allowed = new Set(definition.options.map((option) => option.toLowerCase()));
      if (values.some((value) => !allowed.has(value.toLowerCase()))) {
        throw new AppError(`${definition.label} contains an option not configured for this category.`, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
      }
    }
    if (definition.inputType === 'number' && values.some((value) => !Number.isFinite(Number(value)))) {
      throw new AppError(`${definition.label} must be numeric.`, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
    }
    if (definition.inputType === 'boolean' && values.some((value) => !['yes', 'no', 'true', 'false'].includes(value.toLowerCase()))) {
      throw new AppError(`${definition.label} must be Yes or No.`, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
    }
  }
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
    const selection = 'name model modelNumber sku stockQuantity isActive';
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

  async addProductStock(id, quantity, operation = 'add') {
    if (!mongoose.Types.ObjectId.isValid(id) || !Number.isSafeInteger(quantity) || quantity <= 0 || !['add', 'remove'].includes(operation)) {
      throw new AppError('Choose add or remove and enter a positive whole number of units.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
    }
    const product = await Product.findOneAndUpdate({
      _id: id,
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
    warranty = '',
    hsnCode = '',
    informationPhone,
    productUrl,
    categoryId,
    categoryIds = [],
    brandId,
    description,
    images = [],
    specifications = [],
    standardPrice = 0,
    dealerPrice = 0,
    isTrending = false,
    isActive = true,
  }) {
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
    if (!primaryCategoryId || !mongoose.Types.ObjectId.isValid(primaryCategoryId)) {
      throw new AppError('Invalid categoryId format.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
    }

    const category = await Category.findById(primaryCategoryId);
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
    await validateCategorySpecifications(primaryCategoryId, specifications);
    const brand = brandId && await Brand.findOne({ _id: brandId, isActive: true });
    if (!brand) throw new AppError('Please select an active managed brand.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
    if (!modelNumber?.trim()) throw new AppError('Model number is required.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
    const resolvedModel = model?.trim() || 'Standard Model';
    const existingModelNumber = await Product.findOne({ modelNumber: modelNumber.trim() });
    if (existingModelNumber) throw new AppError('Model number must be unique.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
    const normalizedSpecifications = [
      ...specifications.filter((specification) => !/^(brand|manufacturer)$/i.test(specification.key)),
      { key: 'Brand', value: brand.name },
    ];
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
      warranty: warranty?.trim() || '',
      hsnCode: hsnCode.trim(),
      informationPhone: informationPhone?.trim() || undefined,
      productUrl: productUrl?.trim() || '',
      categoryId: primaryCategoryId,
      categoryIds: cleanCategoryIds,
      brandId,
      description: description ? description.trim() : undefined,
      images,
      specifications: normalizedSpecifications,
      standardPrice,
      dealerPrice,
      isTrending,
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

    // Filter by low stock (stock > 0 and stock < 10)
    if (queryParams.lowStock === 'true' || queryParams.lowStock === true || queryParams.availability === 'low-stock') {
      andClauses.push({
        $or: [
          { stockStatus: 'low-stock' },
          { stockQuantity: { $gt: 0, $lt: 10 } },
        ],
      });
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

    // Filter by isActive flag
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true' || isActive === true;
    }

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (parsedPage - 1) * parsedLimit;

    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const sortField = sortBy === 'sortOrder' ? 'createdAt' : sortBy;
    const sortOptions = {};
    sortOptions[sortField] = sortDirection;

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
      product.categoryIds = cleanCategoryIds;
      if (cleanCategoryIds.length > 0 && !updateData.categoryId && !product.categoryId) {
        product.categoryId = cleanCategoryIds[0];
      }
    }

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
    if (updateData.name) product.name = updateData.name.trim();
    if (updateData.modelNumber !== undefined) {
      const duplicateModel = await Product.findOne({ modelNumber: updateData.modelNumber.trim(), _id: { $ne: id } });
      if (duplicateModel) throw new AppError('Model number must be unique.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
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
    if (updateData.variant !== undefined) product.variant = updateData.variant.trim();
    if (updateData.hsnCode !== undefined) product.hsnCode = updateData.hsnCode.trim();
    if (updateData.warranty !== undefined) product.warranty = updateData.warranty.trim();
    if (updateData.informationPhone !== undefined) product.informationPhone = updateData.informationPhone.trim();
    if (updateData.productUrl !== undefined) product.productUrl = updateData.productUrl.trim();
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
    if (updateData.standardPrice !== undefined) product.standardPrice = updateData.standardPrice;
    if (updateData.dealerPrice !== undefined) product.dealerPrice = updateData.dealerPrice;
    if (updateData.isTrending !== undefined) product.isTrending = updateData.isTrending;
    if (updateData.isActive !== undefined) product.isActive = updateData.isActive;
    if (updateData.brandId !== undefined) {
      const brand = await Brand.findOne({ _id: updateData.brandId, isActive: true });
      if (!brand) throw new AppError('Please select an active managed brand.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
      product.brandId = updateData.brandId;
      product.specifications = [
        ...(product.specifications || []).filter((specification) => !/^(brand|manufacturer)$/i.test(specification.key)),
        { key: 'Brand', value: brand.name },
      ];
    }

    if (product.categoryId) {
      await validateCategorySpecifications(product.categoryId, product.specifications);
    }
    let savedProduct = product;
    if (priceChanges.length) {
      await product.validate();
      const paths = product.directModifiedPaths();
      const updates = Object.fromEntries(paths
        .filter((path) => !paths.some((parent) => parent !== path && path.startsWith(`${parent}.`)))
        .map((path) => [path, product.get(path)]));
      // Append the audit entries in the same write as the prices. Compare old
      // prices to avoid logging a stale previous value during simultaneous edits.
      savedProduct = await Product.findOneAndUpdate({ _id: id, $and: Object.entries(originalPrices).map(([field, value]) => ({
        $or: [{ [field]: value }, { [field]: { $exists: false } }],
      })) }, { $set: updates, $push: { priceHistory: { $each: priceChanges } } }, { new: true, runValidators: true });
      if (!savedProduct) {
        if (priceAttempt < 3) return this.updateProduct(id, updateData, actor, priceAttempt + 1);
        throw new AppError('Prices changed while saving. Refresh the product and try again.', HTTP_STATUS.CONFLICT, ERROR_CODES.BAD_REQUEST);
      }
    } else {
      await product.save();
    }
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
    await product.save();

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
      altText: altText || product.name,
      sortOrder: (product.images || []).length,
    };

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { $push: { images: imageData } },
      { new: true, runValidators: false }
    );

    return updatedProduct || product;
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
