import { Router } from 'express';
import {
  getSessions,
  getSession,
  revokeSessionController,
  deleteSessionController,
} from '../controllers/adminSession.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import {
  getSessionByIdSchema,
  revokeSessionSchema,
  getSessionsQuerySchema,
} from '../validators/session.validator.js';

const router = Router();

// Protected Admin Session Management Operations
router.use(authenticate, authorize('admin'));

router.get('/', validate(getSessionsQuerySchema), getSessions);
router.get('/:id', validate(getSessionByIdSchema), getSession);
router.put('/:id/revoke', validate(revokeSessionSchema), revokeSessionController);
router.delete('/:id', validate(getSessionByIdSchema), deleteSessionController);

export default router;

