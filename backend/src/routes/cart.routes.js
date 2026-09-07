import { Router } from 'express';
import {
  addItem,
  fetchCart,
  updateItem,
  removeItem,
  emptyCart,
} from '../controllers/cart.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import {
  addItemSchema,
  updateCartItemSchema,
  removeCartItemSchema,
} from '../validators/cart.validator.js';

const router = Router();

// Protected Customer / Dealer Cart Operations
router.use(authenticate, authorize('customer', 'dealer'));

router.post('/items', validate(addItemSchema), addItem);
router.get('/', fetchCart);
router.put('/items/:productId', validate(updateCartItemSchema), updateItem);
router.delete('/items/:productId', validate(removeCartItemSchema), removeItem);
router.delete('/', emptyCart);

export default router;
