import { Router } from 'express';
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from '../controllers/product.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import {
  createProductSchema,
  updateProductSchema,
  getProductByIdSchema,
  deleteProductSchema,
  getProductsQuerySchema,
} from '../validators/product.validator.js';

const router = Router();

// Public Product Catalog Endpoints
router.get('/', validate(getProductsQuerySchema), getProducts);
router.get('/:id', validate(getProductByIdSchema), getProductById);

// Protected Admin Product Operations
router.post('/', authenticate, authorize('admin'), validate(createProductSchema), createProduct);
router.put('/:id', authenticate, authorize('admin'), validate(updateProductSchema), updateProduct);
router.delete('/:id', authenticate, authorize('admin'), validate(deleteProductSchema), deleteProduct);

export default router;
