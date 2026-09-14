import { Router } from 'express';
import { registerToken, unregisterToken } from '../controllers/push.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { pushTokenSchema } from '../validators/push.validator.js';

const router = Router();

// Any authenticated role (customer, dealer, admin) can register a device
router.post('/register-token', authenticate, validate(pushTokenSchema), registerToken);
router.post('/unregister-token', authenticate, validate(pushTokenSchema), unregisterToken);

export default router;
