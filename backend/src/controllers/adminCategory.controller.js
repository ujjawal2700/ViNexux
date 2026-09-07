import { categoryService } from '../services/category.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';

/**
 * Admin Create Category
 */
export const createCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.createCategory(req.body);

  return ApiResponse.success(
    res,
    'Category created successfully',
    category,
    HTTP_STATUS.CREATED
  );
});

/**
 * Admin Get Categories List
 */
export const getCategories = asyncHandler(async (req, res) => {
  const result = await categoryService.getCategories(req.query);

  return ApiResponse.success(
    res,
    'Categories fetched successfully',
    result,
    HTTP_STATUS.OK
  );
});

/**
 * Admin Get Category Details by ID
 */
export const getCategoryById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const category = await categoryService.getCategoryById(id);

  return ApiResponse.success(
    res,
    'Category details retrieved successfully',
    category,
    HTTP_STATUS.OK
  );
});

/**
 * Admin Update Category
 */
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

/**
 * Admin Deactivate / Delete Category
 */
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
