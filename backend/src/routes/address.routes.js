import { Router } from 'express';
import {
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from '../controllers/address.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import {
  createAddressSchema,
  updateAddressSchema,
  addressIdParamSchema,
} from '../validators/address.validator.js';

const router = Router();

// Saved address book - customer & dealer only (mirrors enquiry.routes.js's
// role scope; admins manage their own account elsewhere and don't need a
// delivery-address book).
router.get('/', authenticate, authorize('customer', 'dealer'), listAddresses);
router.post('/', authenticate, authorize('customer', 'dealer'), validate(createAddressSchema), createAddress);
router.put('/:addressId', authenticate, authorize('customer', 'dealer'), validate(updateAddressSchema), updateAddress);
router.delete('/:addressId', authenticate, authorize('customer', 'dealer'), validate(addressIdParamSchema), deleteAddress);
router.put('/:addressId/default', authenticate, authorize('customer', 'dealer'), validate(addressIdParamSchema), setDefaultAddress);

export default router;
