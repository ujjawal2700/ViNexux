import { Router } from 'express';
import {
  getCustomers,
  getCustomer,
  updateCustomerStatusController,
} from '../controllers/adminCustomer.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import {
  getCustomerByIdSchema,
  updateCustomerStatusSchema,
  getCustomersQuerySchema,
} from '../validators/customer.validator.js';

const router = Router();

// Protected Admin Customer Management Operations
router.use(authenticate, authorize('admin'));

router.get('/', validate(getCustomersQuerySchema), getCustomers);
router.get('/:id', validate(getCustomerByIdSchema), getCustomer);
router.put('/:id/status', validate(updateCustomerStatusSchema), updateCustomerStatusController);

export default router;
