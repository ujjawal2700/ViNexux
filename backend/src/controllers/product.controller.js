import { getPublicProducts, getPublicProductById, getPublicBrands, getCategoryHighlights } from '../services/catalog.service.js';
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
  const result = await getPublicProducts(req.query, req.user);

  return ApiResponse.success(
    res,
    'Products fetched successfully',
    result,
    HTTP_STATUS.OK
  );
});

export const getProductHighlights = asyncHandler(async (req, res) => {
  const products = await getCategoryHighlights(req.user);

  return ApiResponse.success(
    res,
    'Category highlights fetched successfully',
    { products },
    HTTP_STATUS.OK
  );
});

export const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await getPublicProductById(id, req.user);

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

export const getBrands = asyncHandler(async (req, res) => ApiResponse.success(res, 'Catalog brands retrieved', { brands: await getPublicBrands() }));
