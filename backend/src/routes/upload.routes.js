import { Router } from 'express';
import multer from 'multer';
import { getProductImageMimeType } from '../../../shared/productImageTypes.js';
import { AppError } from '../utils/AppError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';
import { hasPathTraversal, isProhibitedExtension } from '../middlewares/upload.middleware.js';
import { uploadImage, uploadMultipleImages, deleteImage } from '../controllers/upload.controller.js';

const router = Router();

// Configure Multer in-memory storage for Cloudinary streaming
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB file limit
  },
  fileFilter: (req, file, cb) => {
    const mime = getProductImageMimeType(file.originalname, file.mimetype) || (file.mimetype === 'image/gif' ? 'image/gif' : null);
    if (mime && !hasPathTraversal(file.originalname) && !isProhibitedExtension(file.originalname)) {
      file.mimetype = mime;
      cb(null, true);
    } else {
      cb(new AppError('Upload a valid JPG, PNG, WebP, GIF or SVG image.', 400, ERROR_CODES.VALIDATION_ERROR), false);
    }
  },
});

// Single image upload route (accepts form-data with field name 'image' or 'file')
router.post('/image', upload.single('image'), uploadImage);
router.post('/file', upload.single('file'), uploadImage);

// Bulk images upload route (accepts form-data with field name 'images')
router.post('/images', upload.array('images', 10), uploadMultipleImages);

// Delete image from Cloudinary route
router.delete('/image', deleteImage);

export default router;
