import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import categoryRoutes from './category.routes.js';
import productRoutes from './product.routes.js';
import dealerRoutes from './dealer.routes.js';
import adminRoutes from './admin.routes.js';
import adminCategoryRoutes from './adminCategory.routes.js';
import adminProductRoutes from './adminProduct.routes.js';
import adminDealerRoutes from './adminDealer.routes.js';
import cartRoutes from './cart.routes.js';
import enquiryRoutes from './enquiry.routes.js';
import adminEnquiryRoutes from './adminEnquiry.routes.js';
import adminCustomerRoutes from './adminCustomer.routes.js';
import adminSessionRoutes from './adminSession.routes.js';
import adminReportRoutes from './adminReport.routes.js';
import adminCmsRoutes from './adminCms.routes.js';
import publicCmsRoutes from './publicCms.routes.js';
import uploadRoutes from './upload.routes.js';
import pushRoutes from './push.routes.js';

const router = Router();

// Mount system routes
router.use('/', healthRoutes);

// Mount authentication module
router.use('/auth', authRoutes);

// Mount image upload module
router.use('/upload', uploadRoutes);

// Mount catalog modules
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);

// Mount public CMS content module
router.use('/content', publicCmsRoutes);

// Mount admin core & catalog/dealer management modules
router.use('/admin', adminRoutes);
router.use('/admin/categories', adminCategoryRoutes);
router.use('/admin/products', adminProductRoutes);
router.use('/admin/dealers', adminDealerRoutes);
router.use('/admin/enquiries', adminEnquiryRoutes);
router.use('/admin/customers', adminCustomerRoutes);
router.use('/admin/sessions', adminSessionRoutes);
router.use('/admin/reports', adminReportRoutes);
router.use('/admin/cms', adminCmsRoutes);
router.use('/admin/upload', uploadRoutes);

// Mount dealer module
router.use('/dealers', dealerRoutes);

// Mount cart and enquiry modules
router.use('/cart', cartRoutes);
router.use('/enquiries', enquiryRoutes);

// Mount push notification token registration (any authenticated role)
router.use('/push', pushRoutes);

export default router;

