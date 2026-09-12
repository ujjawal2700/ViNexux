import api from './api';

/**
 * Service for uploading images to Cloudinary via backend API
 */
export const uploadService = {
  /**
   * Upload a single image file to Cloudinary
   * @param {File} file - File object from input or drag-and-drop
   * @param {string} folder - Target Cloudinary folder (e.g. 'vinexus/products')
   * @returns {Promise<{success: boolean, data: {url: string, publicId: string}}>}
   */
  uploadImage: async (file, folder = 'vinexus/products') => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('folder', folder);

    const response = await api.post('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  /**
   * Upload multiple images at once to Cloudinary
   * @param {File[]} files - Array of File objects
   * @param {string} folder - Target Cloudinary folder
   */
  uploadMultipleImages: async (files, folder = 'vinexus/products') => {
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
    formData.append('folder', folder);

    const response = await api.post('/upload/images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  /**
   * Delete image from Cloudinary by publicId
   * @param {string} publicId
   */
  deleteImage: async (publicId) => {
    const response = await api.delete('/upload/image', {
      data: { publicId },
    });

    return response.data;
  },
};

export default uploadService;
