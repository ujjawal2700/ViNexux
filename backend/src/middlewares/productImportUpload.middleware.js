import multer from 'multer';
import { AppError } from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 2 },
  fileFilter(req, file, callback) {
    const name = file.originalname.toLowerCase();
    if (file.fieldname === 'workbook' && name.endsWith('.xlsx')) return callback(null, true);
    if (file.fieldname === 'imagesZip' && name.endsWith('.zip')) return callback(null, true);
    return callback(new AppError('Select an .xlsx workbook and an optional .zip image archive.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR));
  },
}).fields([{ name: 'workbook', maxCount: 1 }, { name: 'imagesZip', maxCount: 1 }]);

export const uploadProductImport = (req, res, next) => upload(req, res, (error) => {
  if (error) return next(error instanceof multer.MulterError
    ? new AppError(`Bulk upload error: ${error.message}`, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR)
    : error);
  if (!req.files?.workbook?.[0]) return next(new AppError('Excel workbook is required.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR));
  if (req.files.workbook[0].size > 12 * 1024 * 1024) return next(new AppError('Excel workbook must be smaller than 12 MB.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR));
  next();
});
