import { Router } from 'express';
import { getDashboard } from '../controllers/admin.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

// Protected Admin Dashboard Route
router.get('/dashboard', authenticate, authorize('admin'), getDashboard);

export default router;
