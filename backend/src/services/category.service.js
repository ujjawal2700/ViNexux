import mongoose from 'mongoose';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { AppError } from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

/**
 * Generate URL-friendly slug from string name.
 * @param {string} text
 * @returns {string}
 */
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W_]+(?:-+[\s\W_]*)*/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Recursively checks whether targetParentId is a child/descendant of categoryId.
 * @param {string} categoryId
 * @param {string} targetParentId
 * @returns {Promise<boolean>}
 */
const isDescendant = async (categoryId, targetParentId) => {
  let currentParentId = targetParentId;
  while (currentParentId) {
    if (currentParentId.toString() === categoryId.toString()) {
      return true;
    }
    const parentCategory = await Category.findById(currentParentId).select('parentId');
    if (!parentCategory) break;
    currentParentId = parentCategory.parentId;
  }
  return false;
};

export const categoryService = {
  /**
   * Create a new category.
   */
  async createCategory({ name, slug, parentId, image, description, isActive = true, sortOrder = 0 }) {
    const finalSlug = slug ? slug.trim().toLowerCase() : slugify(name);

    // Check for duplicate slug
    const existingCategory = await Category.findOne({ slug: finalSlug });
    if (existingCategory) {
      throw new AppError(
        `Category with slug '${finalSlug}' already exists.`,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.BAD_REQUEST
      );
    }

    // Verify parent category if parentId is supplied
    if (parentId) {
      if (!mongoose.Types.ObjectId.isValid(parentId)) {
        throw new AppError('Invalid parentId format.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
      }
      const parent = await Category.findById(parentId);
      if (!parent) {
        throw new AppError('Parent category not found.', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
      }
      if (!parent.isActive) {
        throw new AppError(
          'Cannot assign a parent category that is inactive.',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.BAD_REQUEST
        );
      }
    }

    const category = await Category.create({
      name: name.trim(),
      slug: finalSlug,
      parentId: parentId || null,
      image: image || undefined,
      description: description ? description.trim() : undefined,
      isActive,
      sortOrder,
    });

    return category;
  },

  /**
   * Get list of categories with filtering, pagination, and sorting.
   */
  async getCategories(queryParams = {}) {
    const {
      parentId,
      isActive,
      page = 1,
      limit = 20,
      sortBy = 'sortOrder',
      sortOrder = 'asc',
    } = queryParams;

    const filter = {};

    // Filter by parentId
    if (parentId !== undefined) {
      if (parentId === 'null' || parentId === '' || parentId === null) {
        filter.parentId = null;
      } else if (mongoose.Types.ObjectId.isValid(parentId)) {
        filter.parentId = parentId;
      } else {
        throw new AppError('Invalid parentId query filter format.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
      }
    }

    // Filter by isActive status
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true' || isActive === true;
    }

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.max(1, Math.min(500, parseInt(limit, 10) || 20));
    const skip = (parsedPage - 1) * parsedLimit;

    const sortDirection = sortOrder === 'desc' ? -1 : 1;
    const sortOptions = {};
    sortOptions[sortBy] = sortDirection;
    if (sortBy !== 'name') {
      sortOptions.name = 1;
    }

    const [categories, total] = await Promise.all([
      Category.find(filter)
        .populate('parentId', 'name slug')
        .sort(sortOptions)
        .skip(skip)
        .limit(parsedLimit)
        .select('-__v')
        .lean(),
      Category.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / parsedLimit);

    return {
      categories,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages,
      },
    };
  },

  /**
   * Get single category by ID.
   */
  async getCategoryById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid category ID format.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
    }

    const category = await Category.findById(id)
      .populate('parentId', 'name slug')
      .select('-__v');

    if (!category) {
      throw new AppError('Category not found.', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
    }

    return category;
  },

  /**
   * Update category.
   */
  async updateCategory(id, updateData) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid category ID format.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
    }

    const category = await Category.findById(id);
    if (!category) {
      throw new AppError('Category not found.', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
    }

    // Slug calculation & duplicate check
    if (updateData.slug || updateData.name) {
      const targetSlug = updateData.slug
        ? updateData.slug.trim().toLowerCase()
        : slugify(updateData.name);

      if (targetSlug !== category.slug) {
        const duplicate = await Category.findOne({ slug: targetSlug, _id: { $ne: id } });
        if (duplicate) {
          throw new AppError(
            `Category with slug '${targetSlug}' already exists.`,
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.BAD_REQUEST
          );
        }
        category.slug = targetSlug;
      }
    }

    // Parent ID validation & self/circular reference prevention
    if (updateData.parentId !== undefined) {
      const newParentId = updateData.parentId;

      if (newParentId) {
        if (!mongoose.Types.ObjectId.isValid(newParentId)) {
          throw new AppError('Invalid parentId format.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
        }

        if (newParentId.toString() === id.toString()) {
          throw new AppError('A category cannot be its own parent.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
        }

        const parentCategory = await Category.findById(newParentId);
        if (!parentCategory) {
          throw new AppError('Parent category not found.', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
        }
        if (!parentCategory.isActive) {
          throw new AppError(
            'Cannot assign a parent category that is inactive.',
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.BAD_REQUEST
          );
        }

        // Prevent circular hierarchy loops
        const circular = await isDescendant(id, newParentId);
        if (circular) {
          throw new AppError(
            'Cannot assign a child category as the parent (circular hierarchy detected).',
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.BAD_REQUEST
          );
        }

        category.parentId = newParentId;
      } else {
        category.parentId = null;
      }
    }

    // Update remaining scalar fields if provided
    if (updateData.name) category.name = updateData.name.trim();
    if (updateData.image !== undefined) category.image = updateData.image;
    if (updateData.description !== undefined) category.description = updateData.description ? updateData.description.trim() : null;
    if (updateData.isActive !== undefined) category.isActive = updateData.isActive;
    if (updateData.sortOrder !== undefined) category.sortOrder = updateData.sortOrder;

    await category.save();

    return category;
  },

  /**
   * Delete category and associated descendants permanently.
   */
  async deleteCategory(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid category ID format.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
    }

    const category = await Category.findById(id);
    if (!category) {
      throw new AppError('Category not found.', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
    }

    // Find all direct and indirect children
    const directChildren = await Category.find({ parentId: id }).select('_id');
    const directChildIds = directChildren.map((c) => c._id);
    const subChildren = await Category.find({ parentId: { $in: directChildIds } }).select('_id');
    const allDescendantIds = [id, ...directChildIds, ...subChildren.map((c) => c._id)];

    // Clean up products in this category or any of its children
    await Product.deleteMany({ categoryId: { $in: allDescendantIds } });

    // Delete the categories
    await Category.deleteMany({ _id: { $in: allDescendantIds } });

    return {
      deleted: true,
      message: `Category "${category.name}" deleted successfully.`,
      category,
    };
  },
};

export default categoryService;
