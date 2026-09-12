import { getStorageProvider, createStorageProvider } from '../integrations/storage/index.js';
import { config } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';

/**
 * Helper to determine if real Cloudinary keys are set in environment
 */
const isCloudinaryConfigured = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || config.cloudinaryCloudName;
  const apiKey = process.env.CLOUDINARY_API_KEY || config.cloudinaryApiKey;
  const apiSecret = process.env.CLOUDINARY_API_SECRET || config.cloudinaryApiSecret;

  return (
    cloudName &&
    apiKey &&
    apiSecret &&
    !cloudName.includes('your_') &&
    !apiKey.includes('your_') &&
    !apiSecret.includes('your_')
  );
};

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

    // Choose active provider: use Cloudinary if configured, otherwise fallback gracefully
    const provider = isCloudinaryConfigured()
      ? createStorageProvider('cloudinary')
      : getStorageProvider();

    const uploadResult = await provider.uploadFile({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      folder,
      category,
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: isCloudinaryConfigured()
        ? 'Image uploaded successfully to Cloudinary'
        : 'Image uploaded in dev mode (Cloudinary keys pending in backend/.env)',
      isCloudinaryActive: isCloudinaryConfigured(),
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

    const provider = isCloudinaryConfigured()
      ? createStorageProvider('cloudinary')
      : getStorageProvider();

    const uploadPromises = files.map((file) =>
      provider.uploadFile({
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
      isCloudinaryActive: isCloudinaryConfigured(),
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

    const provider = isCloudinaryConfigured()
      ? createStorageProvider('cloudinary')
      : getStorageProvider();

    const result = await provider.deleteFile(publicId);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Image deleted successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
