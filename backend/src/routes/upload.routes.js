import { Router } from 'express';
import multer from 'multer';
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
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, WEBP, GIF, SVG) are allowed!'), false);
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
