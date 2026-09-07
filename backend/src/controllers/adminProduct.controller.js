import { productService } from '../services/product.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';

/**
 * Admin Create Product
 */
export const createProduct = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.body);

  return ApiResponse.success(
    res,
    'Product created successfully',
    product,
    HTTP_STATUS.CREATED
  );
});

/**
 * Admin Get Products List
 */
export const getProducts = asyncHandler(async (req, res) => {
  const result = await productService.getProducts(req.query);

  return ApiResponse.success(
    res,
    'Products fetched successfully',
    result,
    HTTP_STATUS.OK
  );
});

/**
 * Admin Get Product Details by ID
 */
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

/**
 * Admin Update Product
 */
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

/**
 * Admin Deactivate / Delete Product
 */
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

/**
 * Admin Upload Product Image
 */
export const uploadImage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { altText } = req.body;
  const product = await productService.uploadProductImage(id, req.file, altText);

  return ApiResponse.success(
    res,
    'Product image uploaded successfully',
    product,
    HTTP_STATUS.OK
  );
});

/**
 * Admin Delete Product Image
 */
export const deleteImage = asyncHandler(async (req, res) => {
  const { id, publicId } = req.params;
  const targetPublicId = publicId ? decodeURIComponent(publicId) : req.query.publicId;
  const product = await productService.deleteProductImage(id, targetPublicId);

  return ApiResponse.success(
    res,
    'Product image deleted successfully',
    product,
    HTTP_STATUS.OK
  );
});

export default {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  uploadImage,
  deleteImage,
};
