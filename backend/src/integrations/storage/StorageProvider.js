/**
 * Abstract Storage Provider interface contract for Vinexus backend.
 * Concrete implementations (DevStorageProvider, CloudinaryStorageProvider, S3StorageProvider)
 * must implement uploadFile and deleteFile methods.
 */
export class StorageProvider {
  /**
   * Upload a file buffer or stream to cloud/mock storage.
   * 
   * @param {Object} params
   * @param {Buffer} params.buffer - File binary content
   * @param {string} params.originalname - Original filename
   * @param {string} params.mimetype - Validated MIME type
   * @param {string} params.folder - Target folder path (e.g. 'vinexus/kyc/123')
   * @param {string} [params.category] - Upload category ('kyc', 'product', 'cms')
   * @returns {Promise<{ success: boolean, url: string, publicId: string, resourceType: string, format: string, bytes: number }>}
   */
  async uploadFile({ buffer, originalname, mimetype, folder, category }) {
    throw new Error('Method uploadFile() must be implemented by concrete StorageProvider subclass.');
  }

  /**
   * Delete a file from storage by public ID.
   * 
   * @param {string} publicId - Target storage public ID
   * @returns {Promise<{ success: boolean, publicId: string }>}
   */
  async deleteFile(publicId) {
    throw new Error('Method deleteFile() must be implemented by concrete StorageProvider subclass.');
  }
}

export default StorageProvider;
