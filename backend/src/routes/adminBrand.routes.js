import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { listBrands, createBrand, updateBrand, removeBrand, syncBrandsFromProducts } from '../controllers/adminBrand.controller.js';
import { uploadSingle } from '../middlewares/upload.middleware.js';
import { uploadImage } from '../controllers/upload.controller.js';

const router = Router();
router.use(authenticate, authorize('admin'));
router.get('/', listBrands);
router.post('/logo', uploadSingle('file', 'cms'), (req, res, next) => {
  req.body.folder = 'vinexus/brands';
  req.body.category = 'cms';
  return uploadImage(req, res, next);
});
router.post('/', createBrand);
router.post('/sync-from-products', syncBrandsFromProducts);
router.put('/:id', updateBrand);
router.delete('/:id', removeBrand);
export default router;
