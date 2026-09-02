import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';

const router = Router();

// Mount system routes
router.use('/', healthRoutes);

// Mount authentication module
router.use('/auth', authRoutes);

// Modular mount points ready for future Vinexus modules:
// router.use('/products', productRoutes);
// router.use('/categories', categoryRoutes);
// router.use('/cart', cartRoutes);
// router.use('/enquiries', enquiryRoutes);
// router.use('/dealers', dealerRoutes);
// router.use('/admin', adminRoutes);
// router.use('/cms', cmsRoutes);

export default router;
