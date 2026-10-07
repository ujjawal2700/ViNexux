import mongoose from 'mongoose';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { AppError } from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../constants/errorCodes.js';
import { descendantIds } from './catalog.service.js';

const slugify = (text = '') => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\/(www\.)?/i, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const sanitizeCategorySlug = (name = '', slug = '') => {
  const raw = (slug || '').toString().trim();
  if (!raw || /https?:|\/|www\./i.test(raw)) {
    return slugify(name);
  }
  return slugify(raw) || slugify(name);
};

/**
 * Resolves a unique slug for a category.
 * If the base slug already exists, automatically disambiguates by appending the parent slug
 * or a numeric counter (-2, -3, ...) so that categories with identical names under different
 * parents never cause duplicate key collisions.
 */
export const resolveUniqueCategorySlug = async (name, slug, parentId = null, excludeId = null) => {
  let baseSlug = sanitizeCategorySlug(name, slug);
  if (!baseSlug) baseSlug = 'category';

  // Check if baseSlug is available
  const query = { slug: baseSlug };
  if (excludeId) query._id = { $ne: excludeId };
  const existing = await Category.findOne(query).select('_id').lean();
  if (!existing) {
    return baseSlug;
  }

  // Base slug is already taken. Try appending parent slug if available
  if (parentId && mongoose.Types.ObjectId.isValid(parentId)) {
    const parent = await Category.findById(parentId).select('slug name').lean();
    if (parent) {
      const parentSlug = sanitizeCategorySlug(parent.name, parent.slug);
      if (parentSlug && !baseSlug.endsWith(`-${parentSlug}`)) {
        const candidate = `${baseSlug}-${parentSlug}`;
        const parentCandidateQuery = { slug: candidate };
        if (excludeId) parentCandidateQuery._id = { $ne: excludeId };
        const parentExisting = await Category.findOne(parentCandidateQuery).select('_id').lean();
        if (!parentExisting) {
          return candidate;
        }
      }
    }
  }

  // If still taken or no parent, append numerical counter (-2, -3, ...)
  let counter = 2;
  while (true) {
    const candidate = `${baseSlug}-${counter}`;
    const candidateQuery = { slug: candidate };
    if (excludeId) candidateQuery._id = { $ne: excludeId };
    const found = await Category.findOne(candidateQuery).select('_id').lean();
    if (!found) {
      return candidate;
    }
    counter += 1;
  }
};

// All categories (active or not) as a light id/parent list for tree walks.
const loadCategoryLinks = () => Category.find().select('_id parentId').lean();

/**
 * Checks whether targetParentId is categoryId itself or one of its descendants.
 * @param {string} categoryId
 * @param {string} targetParentId
 * @returns {Promise<boolean>}
 */
const isDescendant = async (categoryId, targetParentId) => {
  const parentById = new Map((await loadCategoryLinks()).map((row) => [String(row._id), row.parentId]));
  const visited = new Set();
  let currentParentId = targetParentId ? String(targetParentId) : null;
  while (currentParentId && !visited.has(currentParentId)) {
    if (currentParentId === String(categoryId)) return true;
    visited.add(currentParentId);
    const next = parentById.get(currentParentId);
    currentParentId = next ? String(next) : null;
  }
  return false;
};

/**
 * Ids of the given categories and every descendant, at any depth.
 * @param {Array<string>} rootIds
 */
export const findCategoryAndDescendantIds = async (rootIds) => descendantIds(await loadCategoryLinks(), rootIds);

export const categoryService = {
  /**
   * Create a new category.
   */
  async createCategory({ name, slug, parentId, image, description, isActive = true, sortOrder = 0, filterDefinitions = [] }) {
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

    const finalSlug = await resolveUniqueCategorySlug(name, slug, parentId);

    const category = await Category.create({
      name: name.trim(),
      slug: finalSlug,
      parentId: parentId || null,
      image: image || undefined,
      description: description ? description.trim() : undefined,
      isActive,
      sortOrder,
      filterDefinitions,
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

    const sanitizedCategories = categories.map((cat) => ({
      ...cat,
      slug: sanitizeCategorySlug(cat.name, cat.slug),
    }));

    return {
      categories: sanitizedCategories,
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

    // Slug calculation & auto-unique check
    if (updateData.slug || updateData.name) {
      const parentIdForSlug = updateData.parentId !== undefined ? updateData.parentId : category.parentId;
      const targetSlug = await resolveUniqueCategorySlug(
        updateData.name || category.name,
        updateData.slug,
        parentIdForSlug,
        id
      );
      category.slug = targetSlug;
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
    if (updateData.filterDefinitions !== undefined) category.filterDefinitions = updateData.filterDefinitions;

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

    // Find all descendants at any depth
    const allDescendantIds = await findCategoryAndDescendantIds([id]);

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
