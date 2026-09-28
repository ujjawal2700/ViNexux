import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { listBrands, createBrand, updateBrand, removeBrand, syncBrandsFromProducts } from '../controllers/adminBrand.controller.js';

const router = Router();
router.use(authenticate, authorize('admin'));
router.get('/', listBrands);
router.post('/', createBrand);
router.post('/sync-from-products', syncBrandsFromProducts);
router.put('/:id', updateBrand);
router.delete('/:id', removeBrand);
export default router;
