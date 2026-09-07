import { v2 as cloudinary } from 'cloudinary';
import { StorageProvider } from './StorageProvider.js';
import { config } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';
import { HTTP_STATUS } from '../../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../../constants/errorCodes.js';

/**
 * Production Cloudinary Storage Provider implementation.
 * Encapsulates official Cloudinary v2 SDK configuration and upload/delete streams.
 */
export class CloudinaryStorageProvider extends StorageProvider {
  constructor(options = {}) {
    super();
    this.cloudName = options.cloudName || config.cloudinaryCloudName;
    this.apiKey = options.apiKey || config.cloudinaryApiKey;
    this.apiSecret = options.apiSecret || config.cloudinaryApiSecret;

    cloudinary.config({
      cloud_name: this.cloudName,
      api_key: this.apiKey,
      api_secret: this.apiSecret,
      secure: true,
    });
  }

  async uploadFile({ buffer, originalname, mimetype, folder, category }) {
    if (!this.cloudName || !this.apiKey || !this.apiSecret) {
      throw new AppError(
        'Cloudinary credentials are missing or unconfigured in server environment.',
        HTTP_STATUS.BAD_GATEWAY,
        ERROR_CODES.INTERNAL_ERROR
      );
    }

    const isImage = mimetype && mimetype.startsWith('image/');
    const resourceType = isImage ? 'image' : 'raw';
    const cleanFolder = (folder || 'vinexus/uploads').replace(/^\/+|\/+$/g, '');

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: cleanFolder,
          resource_type: resourceType,
          use_filename: false,
          unique_filename: true,
        },
        (error, result) => {
          if (error) {
            console.error(`[CloudinaryStorageProvider] Upload failed: ${error.message}`);
            return reject(
              new AppError(
                'File upload service unavailable or failed to process file.',
                HTTP_STATUS.BAD_GATEWAY,
                ERROR_CODES.INTERNAL_ERROR
              )
            );
          }

          resolve({
            success: true,
            url: result.secure_url,
            publicId: result.public_id,
            resourceType: result.resource_type,
            format: result.format || originalname.split('.').pop() || '',
            bytes: result.bytes || (buffer ? buffer.length : 0),
          });
        }
      );

      uploadStream.end(buffer);
    });
  }

  async deleteFile(publicId) {
    if (!publicId) {
      return { success: true, publicId: '' };
    }

    if (!this.cloudName || !this.apiKey || !this.apiSecret) {
      throw new AppError(
        'Cloudinary credentials missing for delete operation.',
        HTTP_STATUS.BAD_GATEWAY,
        ERROR_CODES.INTERNAL_ERROR
      );
    }

    try {
      // Try image resource_type first, fallback to raw if not found
      let result = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
      if (result.result !== 'ok') {
        result = await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
      }

      return {
        success: result.result === 'ok' || result.result === 'not found',
        publicId,
        result: result.result,
      };
    } catch (error) {
      console.error(`[CloudinaryStorageProvider] Delete failed for ${publicId}: ${error.message}`);
      throw new AppError(
        'Storage file deletion encountered an error.',
        HTTP_STATUS.BAD_GATEWAY,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }
}

export default CloudinaryStorageProvider;
