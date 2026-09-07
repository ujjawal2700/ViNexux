import { Router } from 'express';
import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from '../controllers/adminCategory.controller.js';
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

// Protected Admin Category Routes (authenticate + authorize('admin'))
router.post('/', authenticate, authorize('admin'), validate(createCategorySchema), createCategory);
router.get('/', authenticate, authorize('admin'), validate(getCategoriesQuerySchema), getCategories);
router.get('/:id', authenticate, authorize('admin'), validate(getCategoryByIdSchema), getCategoryById);
router.put('/:id', authenticate, authorize('admin'), validate(updateCategorySchema), updateCategory);
router.delete('/:id', authenticate, authorize('admin'), validate(deleteCategorySchema), deleteCategory);

export default router;
