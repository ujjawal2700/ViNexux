import { Router } from 'express';
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  uploadImage,
  deleteImage,
} from '../controllers/adminProduct.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { uploadSingle } from '../middlewares/upload.middleware.js';
import {
  createProductSchema,
  updateProductSchema,
  getProductByIdSchema,
  deleteProductSchema,
  getProductsQuerySchema,
} from '../validators/product.validator.js';

const router = Router();

// Protected Admin Product Routes (authenticate + authorize('admin'))
router.post('/', authenticate, authorize('admin'), validate(createProductSchema), createProduct);
router.get('/', authenticate, authorize('admin'), validate(getProductsQuerySchema), getProducts);
router.get('/:id', authenticate, authorize('admin'), validate(getProductByIdSchema), getProductById);
router.put('/:id', authenticate, authorize('admin'), validate(updateProductSchema), updateProduct);
router.delete('/:id', authenticate, authorize('admin'), validate(deleteProductSchema), deleteProduct);

// Product Image Storage Routes
router.post('/:id/images', authenticate, authorize('admin'), uploadSingle('file', 'product'), uploadImage);
router.delete('/:id/images/:publicId(*)', authenticate, authorize('admin'), deleteImage);

export default router;

