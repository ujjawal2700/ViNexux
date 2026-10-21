import { getStorageProvider } from '../../integrations/storage/index.js';
import { AppError } from '../../utils/AppError.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../../constants/errorCodes.js';

// Cap dimensions on the long edge so oversized camera/scan photos don't
// bloat storage - upscaling is never applied (withoutEnlargement).
const MAX_IMAGE_DIMENSION = 2000;
const WEBP_QUALITY = 80;

/** Decode every image before storage; vector source is never stored or served. */
export const prepareImageBuffer = async (buffer, mimetype, { lossless = false } = {}) => {
  if (!mimetype || !mimetype.startsWith('image/')) {
    return { buffer, mimetype, extension: null };
  }

  try {
    // Reject active SVG content and external resources before rasterizing. Even
    // a mislabeled SVG must pass these checks; inspect content as well as MIME.
    const source = buffer.toString('utf8');
    if (mimetype === 'image/svg+xml' || /<svg[\s>]/i.test(source)) {
      const references = [...source.matchAll(/(?:href\s*=\s*["']([^"']*)["']|url\(\s*["']?([^\s)"']+))/gi)]
        .map(match => match[1] ?? match[2]);
      if (/<!DOCTYPE|<!ENTITY|<\s*(?:script|foreignObject)\b|\bon\w+\s*=|@import/i.test(source)
        || references.some(value => !value.startsWith('#') && !/^data:image\/(?:png|jpeg|webp);base64,/i.test(value))) {
        throw new Error('SVG must contain self-contained artwork without scripts or external resources');
      }
    }
    const { default: sharp } = await import('sharp');
    const converted = await sharp(buffer, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: MAX_IMAGE_DIMENSION, height: MAX_IMAGE_DIMENSION, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY, lossless })
      .toBuffer();
    return { buffer: converted, mimetype: 'image/webp', extension: 'webp' };
  } catch {
    throw new AppError(
      'This image could not be processed. Upload a valid JPG, PNG, WebP or self-contained SVG without scripts or external resources.',
      HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR,
      [{ path: 'images', message: 'Choose a valid image; SVG artwork must not contain scripts or external resources.' }],
    );
  }
};

/**
 * Centralized Storage Service facade.
 * Decouples business/controller logic from raw storage API SDKs.
 */
export const storageService = {
  /**
   * Upload a file via active storage provider.
   * 
   * @param {Object} params
   * @param {Buffer} params.buffer
   * @param {string} params.originalname
   * @param {string} params.mimetype
   * @param {string} params.folder
   * @param {string} [params.category]
   * @returns {Promise<{ url: string, publicId: string, resourceType: string, format: string, bytes: number }>}
   */
  async uploadFile({ buffer, originalname, mimetype, folder, category }) {
    if (!buffer || buffer.length === 0) {
      throw new AppError('File content buffer is missing or empty.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
    }

    // Compress + convert to WebP before handing off to the provider (image
    // uploads only - PDFs and other non-image files pass through untouched).
    const prepared = await prepareImageBuffer(buffer, mimetype, { lossless: category === 'qr' });
    const preparedName = prepared.extension
      ? `${(originalname || 'file').replace(/\.[^./]+$/, '')}.${prepared.extension}`
      : originalname;

    const provider = getStorageProvider();
    try {
      const result = await provider.uploadFile({
        buffer: prepared.buffer,
        originalname: preparedName,
        mimetype: prepared.mimetype,
        folder,
        category,
      });

      return {
        url: result.url,
        publicId: result.publicId,
        resourceType: result.resourceType,
        format: result.format,
        bytes: result.bytes,
      };
    } catch (err) {
      if (err instanceof AppError) throw err;
      console.error(`[StorageService] Upload failed: ${err.message}`);
      throw new AppError(
        'Failed to upload file to storage. Please try again.',
        HTTP_STATUS.BAD_GATEWAY,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  },

  /**
   * Delete a file from storage by public ID.
   * 
   * @param {string} publicId
   * @returns {Promise<{ success: boolean, publicId: string }>}
   */
  async deleteFile(publicId) {
    if (!publicId) {
      return { success: true, publicId: '' };
    }

    const provider = getStorageProvider();
    try {
      return await provider.deleteFile(publicId);
    } catch (err) {
      console.warn(`[StorageService] Delete warning for ${publicId}: ${err.message}`);
      return { success: false, publicId };
    }
  },

  /**
   * Replace an existing file safely.
   * Uploads new file first -> returns new metadata -> callers can cleanup old file if DB update succeeds.
   * If new upload fails, old file remains unchanged.
   * 
   * @param {Object} params
   * @param {string} [params.oldPublicId]
   * @param {Buffer} params.buffer
   * @param {string} params.originalname
   * @param {string} params.mimetype
   * @param {string} params.folder
   * @param {string} [params.category]
   * @returns {Promise<{ url: string, publicId: string, resourceType: string, format: string, bytes: number }>}
   */
  async replaceFile({ oldPublicId, buffer, originalname, mimetype, folder, category }) {
    // 1. Upload new file first
    const newFile = await this.uploadFile({
      buffer,
      originalname,
      mimetype,
      folder,
      category,
    });

    // 2. Delete old file if provided (non-blocking failure safe)
    if (oldPublicId) {
      this.deleteFile(oldPublicId).catch((err) => {
        console.warn(`[StorageService] Failed cleanup of replaced object ${oldPublicId}: ${err.message}`);
      });
    }

    return newFile;
  },
};

export default storageService;
