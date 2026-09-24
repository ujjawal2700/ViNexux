import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { storageService } from './storage/storage.service.js';
import { AppError } from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

/**
 * Safely escape regex special characters to prevent regex injection or ReDoS attacks.
 * @param {string} text
 * @returns {string}
 */
const escapeRegex = (text) => {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export const productService = {
  /**
   * Create a new product.
   */
  async createProduct({ sku, name, categoryId, description, images = [], specifications = [], standardPrice = 0, dealerPrice = 0, isFeatured = false, isActive = true }) {
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

    // Verify referenced category exists and is active
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      throw new AppError('Invalid categoryId format.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
    }

    const category = await Category.findById(categoryId);
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

    const product = await Product.create({
      sku: uppercaseSku,
      name: name.trim(),
      categoryId,
      description: description ? description.trim() : undefined,
      images,
      specifications,
      standardPrice,
      dealerPrice,
      isFeatured,
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
      isFeatured,
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
        const matchedCatIds = matchedCategories.map((c) => c._id);
        const childCats = await Category.find({ parentId: { $in: matchedCatIds } }).select('_id').lean();
        const allCatIds = [...matchedCatIds, ...childCats.map((c) => c._id)];
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

    if (andClauses.length > 0) {
      filter.$and = andClauses;
    }

    // Filter by categoryId (supports querying header category, main category, or subcategory)
    if (categoryId) {
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        throw new AppError('Invalid categoryId query filter format.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
      }
      const directChildren = await Category.find({ parentId: categoryId }).select('_id').lean();
      const directChildIds = directChildren.map((c) => c._id);
      const subChildren = await Category.find({ parentId: { $in: directChildIds } }).select('_id').lean();
      const allCategoryIds = [categoryId, ...directChildIds, ...subChildren.map((c) => c._id)];
      filter.categoryId = { $in: allCategoryIds };
    } else if (categorySlug && categorySlug.trim()) {
      const trimmedSlug = categorySlug.trim().toLowerCase();
      const foundCategory = await Category.findOne({
        $or: [{ slug: trimmedSlug }, { name: new RegExp(`^${escapeRegex(trimmedSlug)}$`, 'i') }],
      }).select('_id').lean();
      if (foundCategory) {
        const directChildren = await Category.find({ parentId: foundCategory._id }).select('_id').lean();
        const directChildIds = directChildren.map((c) => c._id);
        const subChildren = await Category.find({ parentId: { $in: directChildIds } }).select('_id').lean();
        const allCategoryIds = [foundCategory._id, ...directChildIds, ...subChildren.map((c) => c._id)];
        filter.categoryId = { $in: allCategoryIds };
      }
    }

    // Filter by isFeatured flag
    if (isFeatured !== undefined) {
      filter.isFeatured = isFeatured === 'true' || isFeatured === true;
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
        .sort(sortOptions)
        .skip(skip)
        .limit(parsedLimit)
        .select('-__v')
        .lean(),
      Product.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / parsedLimit);

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
      .select('-__v');

    if (!product) {
      throw new AppError('Product not found.', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
    }

    return product;
  },

  /**
   * Update product while preserving unsupplied fields.
   */
  async updateProduct(id, updateData) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid product ID format.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
    }

    const product = await Product.findById(id);
    if (!product) {
      throw new AppError('Product not found.', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
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

    // Validate category existence and active status if categoryId is updated
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
    }

    // Preserve existing fields that were not supplied
    if (updateData.name) product.name = updateData.name.trim();
    if (updateData.description !== undefined) product.description = updateData.description ? updateData.description.trim() : null;
    if (updateData.images !== undefined) product.images = updateData.images;
    if (updateData.specifications !== undefined) product.specifications = updateData.specifications;
    if (updateData.standardPrice !== undefined) product.standardPrice = updateData.standardPrice;
    if (updateData.dealerPrice !== undefined) product.dealerPrice = updateData.dealerPrice;
    if (updateData.isFeatured !== undefined) product.isFeatured = updateData.isFeatured;
    if (updateData.isActive !== undefined) product.isActive = updateData.isActive;

    await product.save();

    return product;
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

    if (!Array.isArray(product.images)) {
      product.images = [];
    }
    product.images.push(imageData);

    await product.save();
    return product;
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

    const targetPublicId = product.images[imgIndex].publicId;
    if (targetPublicId) {
      await storageService.deleteFile(targetPublicId);
    }

    product.images.splice(imgIndex, 1);
    await product.save();
    return product;
  },
};

export default productService;
