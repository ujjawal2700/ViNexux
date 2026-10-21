import { listSpecificationTemplates, createSpecificationTemplate, updateSpecificationTemplate, deleteSpecificationTemplate } from '../controllers/specificationTemplate.controller.js';
import { listSpecificationTemplatesSchema, createSpecificationTemplateSchema, updateSpecificationTemplateSchema, deleteSpecificationTemplateSchema } from '../validators/specificationTemplate.validator.js';
import { Router } from 'express';
import {
  listProductPositioning,
  saveProductPositioning,
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  uploadImage,
  deleteImage,
  seedTestStockQuantities,
  downloadProductImportTemplate,
  previewProductImportUpload,
  commitProductImportUpload,
  addProductStock,
  searchStockProducts,
  permanentlyDeleteProduct,
} from '../controllers/adminProduct.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { uploadSingle } from '../middlewares/upload.middleware.js';
import { uploadProductImport } from '../middlewares/productImportUpload.middleware.js';
import {
  productPositioningSchema,
  createProductSchema,
  updateProductSchema,
  getProductByIdSchema,
  deleteProductSchema,
  getProductsQuerySchema,
  addProductStockSchema,
  stockSearchSchema,
} from '../validators/product.validator.js';

const router = Router();

// Protected Admin Product Routes (authenticate + authorize('admin'))
router.post('/', authenticate, authorize('admin'), validate(createProductSchema), createProduct);
router.get('/', authenticate, authorize('admin'), validate(getProductsQuerySchema), getProducts);
router.get('/stock-search', authenticate, authorize('admin'), validate(stockSearchSchema), searchStockProducts);
router.post('/:id/stock', authenticate, authorize('admin'), validate(addProductStockSchema), addProductStock);
router.delete('/:id/permanent', authenticate, authorize('admin'), validate(deleteProductSchema), permanentlyDeleteProduct);
router.get('/import/template', authenticate, authorize('admin'), downloadProductImportTemplate);
router.post('/import/preview', authenticate, authorize('admin'), uploadProductImport, previewProductImportUpload);
router.post('/import/commit', authenticate, authorize('admin'), uploadProductImport, commitProductImportUpload);
router.get('/positioning', authenticate, authorize('admin'), listProductPositioning);
router.put('/positioning/:id', authenticate, authorize('admin'), validate(productPositioningSchema), saveProductPositioning);
// Keep template routes ahead of the product ID route; use Products read/write permissions.
router.get('/specification-templates', authenticate, authorize('admin'), validate(listSpecificationTemplatesSchema), listSpecificationTemplates);
router.post('/specification-templates', authenticate, authorize('admin'), validate(createSpecificationTemplateSchema), createSpecificationTemplate);
router.put('/specification-templates/:templateId', authenticate, authorize('admin'), validate(updateSpecificationTemplateSchema), updateSpecificationTemplate);
router.delete('/specification-templates/:templateId', authenticate, authorize('admin'), validate(deleteSpecificationTemplateSchema), deleteSpecificationTemplate);
router.get('/:id', authenticate, authorize('admin'), validate(getProductByIdSchema), getProductById);
router.put('/:id', authenticate, authorize('admin'), validate(updateProductSchema), updateProduct);
router.delete('/:id', authenticate, authorize('admin'), validate(deleteProductSchema), deleteProduct);

// Product Image Storage Routes
router.post('/:id/images', authenticate, authorize('admin'), uploadSingle('file', 'product'), uploadImage);
router.delete('/:id/images/:publicId(*)', authenticate, authorize('admin'), deleteImage);

// Dev/Admin utility: bulk seed test stock quantities
router.post('/dev/seed-stock', authenticate, authorize('admin'), seedTestStockQuantities);

export default router;

