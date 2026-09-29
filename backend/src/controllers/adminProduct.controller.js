import { productService } from '../services/product.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { createProductImportTemplate, previewProductImport, commitProductImport } from '../services/productImport.service.js';

export const downloadProductImportTemplate = asyncHandler(async (req, res) => {
  const buffer = await createProductImportTemplate();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="vinexus-product-import-template.xlsx"');
  return res.send(Buffer.from(buffer));
});

export const previewProductImportUpload = asyncHandler(async (req, res) => {
  const result = await previewProductImport(req.files.workbook[0].buffer, req.files.imagesZip?.[0]?.buffer);
  return ApiResponse.success(res, 'Import preview ready', result, HTTP_STATUS.OK);
});

export const commitProductImportUpload = asyncHandler(async (req, res) => {
  const result = await commitProductImport(req.files.workbook[0].buffer, req.files.imagesZip?.[0]?.buffer);
  return ApiResponse.success(res, 'Bulk import finished', result, HTTP_STATUS.OK);
});

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

/**
 * DEV/ADMIN: Bulk seed test stock quantities for UI testing.
 * Sets 6-7 stock on branded laptops, 2-3 on some (low), 0 on a couple (OOS).
 */
export const seedTestStockQuantities = asyncHandler(async (req, res) => {
  // Find all laptop-related categories (any category whose name includes 'laptop')
  const laptopCats = await Category.find({ name: /laptop/i }).select('_id').lean();
  const laptopCatIds = laptopCats.map((c) => c._id);

  // Get all active products in laptop categories
  const products = await Product.find({
    isActive: true,
    ...(laptopCatIds.length ? { categoryId: { $in: laptopCatIds } } : {}),
  })
    .select('_id name specifications')
    .lean();

  if (!products.length) {
    return ApiResponse.success(res, 'No products found', { updated: 0 });
  }

  // Stock distribution pattern for test visibility:
  // index % 7 == 0 → out-of-stock (0)
  // index % 7 == 1 or 2 → low-stock (2 or 3)
  // rest → in-stock (6 or 7)
  const stockForIndex = (i) => {
    const mod = i % 7;
    if (mod === 0) return 0;
    if (mod === 1) return 2;
    if (mod === 2) return 3;
    if (mod === 3) return 6;
    if (mod === 4) return 7;
    if (mod === 5) return 6;
    return 7;
  };

  const bulkOps = products.map((prod, idx) => {
    const stockQty = stockForIndex(idx);
    // Remove old stock/inventory spec entries, add fresh one
    const filteredSpecs = (prod.specifications || []).filter(
      (s) => !['stock', 'inventory'].includes((s.key || '').toLowerCase().trim())
    );
    return {
      updateOne: {
        filter: { _id: prod._id },
        update: { $set: { specifications: [...filteredSpecs, { key: 'Stock', value: String(stockQty) }] } },
      },
    };
  });

  const result = await Product.bulkWrite(bulkOps);

  const summary = products.map((p, i) => ({
    name: p.name?.slice(0, 40),
    stock: stockForIndex(i),
    status: stockForIndex(i) === 0 ? 'out-of-stock' : stockForIndex(i) < 5 ? 'low-stock' : 'in-stock',
  }));

  return ApiResponse.success(res, `Stock seeded for ${result.modifiedCount} products`, {
    updated: result.modifiedCount,
    products: summary,
  });
});

export default {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  uploadImage,
  deleteImage,
  seedTestStockQuantities,
};
