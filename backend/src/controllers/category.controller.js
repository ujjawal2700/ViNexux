import { AppError } from '../utils/AppError.js';
import { getPublicCategories } from '../services/catalog.service.js';
import { categoryService } from '../services/category.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';

export const createCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.createCategory(req.body);

  return ApiResponse.success(
    res,
    'Category created successfully',
    category,
    HTTP_STATUS.CREATED
  );
});

export const getCategories = asyncHandler(async (req, res) => {
  let categories = await getPublicCategories();
  if (req.query.parentId !== undefined) {
    const parentId = req.query.parentId === 'null' ? '' : req.query.parentId;
    categories = categories.filter((category) => String(category.parentId?._id || '') === parentId);
  }
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const total = categories.length;
  const result = { categories: categories.slice((page - 1) * limit, page * limit), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };

  return ApiResponse.success(
    res,
    'Categories fetched successfully',
    result,
    HTTP_STATUS.OK
  );
});

export const getCategoryById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const category = (await getPublicCategories()).find((item) => String(item._id) === id);
  if (!category) throw new AppError('Category not found', 404, 'NOT_FOUND');

  return ApiResponse.success(
    res,
    'Category details retrieved successfully',
    category,
    HTTP_STATUS.OK
  );
});

export const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const category = await categoryService.updateCategory(id, req.body);

  return ApiResponse.success(
    res,
    'Category updated successfully',
    category,
    HTTP_STATUS.OK
  );
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await categoryService.deleteCategory(id);

  return ApiResponse.success(
    res,
    result.message,
    result,
    HTTP_STATUS.OK
  );
});

export default {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};

export const getCategoryTree = asyncHandler(async (req, res) => ApiResponse.success(res, 'Active category hierarchy retrieved', { categories: await getPublicCategories() }));
