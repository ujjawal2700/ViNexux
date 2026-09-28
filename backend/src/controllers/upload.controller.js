import { storageService } from '../services/storage/storage.service.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';

/**
 * Controller to upload a single image to Cloudinary (or DevStorage fallback)
 */
export const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'No image file provided in request. Use field name "image" or "file".',
      });
    }

    const folder = req.body.folder || 'vinexus/products';
    const category = req.body.category || 'general';

    const uploadResult = await storageService.uploadFile({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      folder,
      category,
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        url: uploadResult.url,
        publicId: uploadResult.publicId,
        format: uploadResult.format,
        bytes: uploadResult.bytes,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to upload multiple images at once
 */
export const uploadMultipleImages = async (req, res, next) => {
  try {
    const files = req.files || [];
    if (!files.length) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'No image files provided in request. Use field name "images".',
      });
    }

    const folder = req.body.folder || 'vinexus/products';
    const category = req.body.category || 'general';

    const uploadPromises = files.map((file) =>
      storageService.uploadFile({
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        folder,
        category,
      })
    );

    const results = await Promise.all(uploadPromises);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `${results.length} images uploaded successfully`,
      data: {
        images: results.map((r) => ({
          url: r.url,
          publicId: r.publicId,
          format: r.format,
          bytes: r.bytes,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to delete an image by publicId from Cloudinary
 */
export const deleteImage = async (req, res, next) => {
  try {
    const publicId = req.body.publicId || req.query.publicId;
    if (!publicId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'publicId is required to delete image',
      });
    }

    const result = await storageService.deleteFile(publicId);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Image deleted successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
