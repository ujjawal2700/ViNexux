import { Router } from 'express';
import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from '../controllers/category.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import {
  createCategorySchema,
  updateCategorySchema,
  getCategoryByIdSchema,
  deleteCategorySchema,
  getCategoriesQuerySchema,
} from '../validators/category.validator.js';

const router = Router();

// Public Category Endpoints
router.get('/', validate(getCategoriesQuerySchema), getCategories);
router.get('/:id', validate(getCategoryByIdSchema), getCategoryById);

// Protected Admin Category Operations
router.post('/', authenticate, authorize('admin'), validate(createCategorySchema), createCategory);
router.put('/:id', authenticate, authorize('admin'), validate(updateCategorySchema), updateCategory);
router.delete('/:id', authenticate, authorize('admin'), validate(deleteCategorySchema), deleteCategory);

export default router;
