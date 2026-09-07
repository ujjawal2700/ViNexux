import { productService } from '../services/product.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';

export const createProduct = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.body);

  return ApiResponse.success(
    res,
    'Product created successfully',
    product,
    HTTP_STATUS.CREATED
  );
});

export const getProducts = asyncHandler(async (req, res) => {
  const result = await productService.getProducts(req.query);

  return ApiResponse.success(
    res,
    'Products fetched successfully',
    result,
    HTTP_STATUS.OK
  );
});

export const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await productService.getProductById(id);

  return ApiResponse.success(
    res,
    'Product details retrieved successfully',
    product,
    HTTP_STATUS.OK
  );
});

export const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await productService.updateProduct(id, req.body);

  return ApiResponse.success(
    res,
    'Product updated successfully',
    product,
    HTTP_STATUS.OK
  );
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await productService.deleteProduct(id);

  return ApiResponse.success(
    res,
    result.message,
    result,
    HTTP_STATUS.OK
  );
});

export default {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};
