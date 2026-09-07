import { getStorageProvider } from '../../integrations/storage/index.js';
import { AppError } from '../../utils/AppError.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../../constants/errorCodes.js';

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

    const provider = getStorageProvider();
    try {
      const result = await provider.uploadFile({
        buffer,
        originalname,
        mimetype,
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
