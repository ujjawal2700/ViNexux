import { AppError } from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

export const notFoundHandler = (req, res, next) => {
  const error = new AppError(
    `Route ${req.originalUrl} not found`,
    HTTP_STATUS.NOT_FOUND,
    ERROR_CODES.NOT_FOUND
  );
  next(error);
};
