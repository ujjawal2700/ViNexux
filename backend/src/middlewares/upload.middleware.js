import multer from 'multer';
import { AppError } from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const PROHIBITED_EXTENSIONS = [
  'exe', 'js', 'php', 'html', 'htm', 'sh', 'bat', 'cmd', 'vbs', 'scr', 'cpl', 'jar', 'msi', 'dll', 'bin'
];

const ALLOWED_MIME_TYPES = {
  kyc: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
  product: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  cms: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  general: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
};

/**
 * Validates filename extension against prohibited executable file formats.
 * @param {string} filename
 * @returns {boolean}
 */
export const isProhibitedExtension = (filename) => {
  if (!filename) return false;
  const ext = filename.split('.').pop().toLowerCase();
  return PROHIBITED_EXTENSIONS.includes(ext);
};

/**
 * Checks if filename contains path traversal patterns.
 * @param {string} filename
 * @returns {boolean}
 */
export const hasPathTraversal = (filename) => {
  if (!filename) return false;
  return filename.includes('..') || filename.includes('/') || filename.includes('\\');
};

/**
 * Creates a Multer upload middleware configured for memory storage and file validation.
 * 
 * @param {string} fieldName - Form field name (default 'file')
 * @param {string} category - Upload category ('kyc', 'product', 'cms', 'general')
 */
export const uploadSingle = (fieldName = 'file', category = 'general') => {
  const allowedMimes = ALLOWED_MIME_TYPES[category] || ALLOWED_MIME_TYPES.general;

  const storage = multer.memoryStorage();

  const upload = multer({
    storage,
    limits: {
      fileSize: MAX_FILE_SIZE,
    },
    fileFilter: (req, file, cb) => {
      if (!file) {
        return cb(new AppError('No file uploaded.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR), false);
      }

      // Check path traversal
      if (hasPathTraversal(file.originalname)) {
        return cb(
          new AppError(
            'Path traversal sequences in filename are strictly prohibited.',
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.VALIDATION_ERROR
          ),
          false
        );
      }

      // Check prohibited extension
      if (isProhibitedExtension(file.originalname)) {
        return cb(
          new AppError(
            'Executable or script files are strictly prohibited.',
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.VALIDATION_ERROR
          ),
          false
        );
      }


      // Check allowed MIME type
      const mimetype = (file.mimetype || '').toLowerCase();
      if (!allowedMimes.includes(mimetype)) {
        return cb(
          new AppError(
            `Invalid file format '${mimetype}' for ${category} upload. Allowed formats: ${allowedMimes.join(', ')}`,
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.VALIDATION_ERROR
          ),
          false
        );
      }

      cb(null, true);
    },
  }).single(fieldName);

  return (req, res, next) => {
    upload(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(
              new AppError(
                'File size exceeds the maximum limit of 5MB.',
                HTTP_STATUS.BAD_REQUEST,
                ERROR_CODES.VALIDATION_ERROR
              )
            );
          }
          return next(new AppError(`File upload error: ${err.message}`, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR));
        }
        return next(err);
      }

      if (!req.file) {
        return next(new AppError('Upload payload missing file.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR));
      }

      next();
    });
  };
};

export default uploadSingle;
