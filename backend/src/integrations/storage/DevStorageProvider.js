import { StorageProvider } from './StorageProvider.js';

/**
 * Development & Test Storage Provider implementation.
 * Simulates secure file uploads and deletions in memory with deterministic mock URLs and public IDs.
 * Used for local development and automated integration testing (zero outbound API network calls).
 */
export class DevStorageProvider extends StorageProvider {
  constructor() {
    super();
    this.uploadedFiles = new Map();
  }

  async uploadFile({ buffer, originalname, mimetype, folder, category }) {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const cleanFolder = (folder || 'vinexus/uploads').replace(/^\/+|\/+$/g, '');
    const extension = (originalname || 'file').split('.').pop() || 'bin';
    const publicId = `${cleanFolder}/mock_${timestamp}_${randomSuffix}`;
    const url = `https://mock.storage.vinexus.dev/${publicId}.${extension}`;
    const bytes = buffer ? buffer.length : 1024;
    const resourceType = mimetype && mimetype.startsWith('image/') ? 'image' : 'raw';

    const metadata = {
      url,
      publicId,
      resourceType,
      format: extension,
      bytes,
      mimetype,
      originalname,
      folder: cleanFolder,
      category: category || 'general',
      uploadedAt: new Date(),
    };

    this.uploadedFiles.set(publicId, metadata);

    console.log(`[DevStorageProvider] ----------------------------------------`);
    console.log(`[DevStorageProvider] Uploaded File : ${originalname}`);
    console.log(`[DevStorageProvider] Public ID     : ${publicId}`);
    console.log(`[DevStorageProvider] Secure URL    : ${url}`);
    console.log(`[DevStorageProvider] Folder        : ${cleanFolder}`);
    console.log(`[DevStorageProvider] MIME Type     : ${mimetype}`);
    console.log(`[DevStorageProvider] ----------------------------------------`);

    return {
      success: true,
      url,
      publicId,
      resourceType,
      format: extension,
      bytes,
    };
  }

  async deleteFile(publicId) {
    console.log(`[DevStorageProvider] ----------------------------------------`);
    console.log(`[DevStorageProvider] Deleting Public ID: ${publicId}`);
    console.log(`[DevStorageProvider] ----------------------------------------`);

    const existed = this.uploadedFiles.delete(publicId);

    return {
      success: true,
      existed,
      publicId,
    };
  }

  // Test helper methods
  getUploadedFile(publicId) {
    return this.uploadedFiles.get(publicId);
  }

  clearFiles() {
    this.uploadedFiles.clear();
  }

  getAllFiles() {
    return Array.from(this.uploadedFiles.values());
  }
}

export default DevStorageProvider;
