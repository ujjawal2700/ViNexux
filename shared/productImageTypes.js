const MIME_BY_EXTENSION = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  svg: 'image/svg+xml',
};

const MIME_ALIASES = {
  'image/jpg': 'image/jpeg',
  'image/pjpeg': 'image/jpeg',
  'image/x-png': 'image/png',
};

export const PRODUCT_IMAGE_ACCEPT = '.jpg,.jpeg,.png,.webp,.svg,image/jpeg,image/png,image/webp,image/svg+xml';

// Browsers and multipart clients can omit the MIME type or send a generic
// binary type. Only fall back to a supported extension in those cases.
export const getProductImageMimeType = (filename, mimeType) => {
  const mime = (mimeType || '').trim().toLowerCase();
  if (!mime || mime === 'application/octet-stream') {
    const extension = (filename || '').split('.').pop().toLowerCase();
    return MIME_BY_EXTENSION[extension] || null;
  }
  const normalized = MIME_ALIASES[mime] || mime;
  return Object.values(MIME_BY_EXTENSION).includes(normalized) ? normalized : null;
};
