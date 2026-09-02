import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../constants/errorCodes.js';
import { config } from '../config/env.js';

export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let message = err.message || 'Something went wrong';
  let errorCode = err.errorCode || ERROR_CODES.INTERNAL_SERVER_ERROR;

  // Handle Zod Error
  if (err.name === 'ZodError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    errorCode = ERROR_CODES.VALIDATION_ERROR;
    message = 'Validation failed';
  }

  // Handle Mongoose CastError (Invalid ID)
  if (err.name === 'CastError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    errorCode = ERROR_CODES.BAD_REQUEST;
    message = `Invalid resource identifier: ${err.path}`;
  }

  // Handle Mongoose Duplicate Key Error
  if (err.code === 11000) {
    statusCode = HTTP_STATUS.CONFLICT;
    errorCode = ERROR_CODES.CONFLICT;
    message = 'Duplicate field value entered';
  }

  // Handle Mongoose ValidationError
  if (err.name === 'ValidationError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    errorCode = ERROR_CODES.VALIDATION_ERROR;
    message = Object.values(err.errors)
      .map((item) => item.message)
      .join(', ');
  }

  // Log error details for server diagnostics
  if (config.nodeEnv === 'development') {
    console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);
  } else {
    console.error(`[Error] ${req.method} ${req.originalUrl} - ${statusCode} - ${message}`);
  }

  const response = {
    success: false,
    message,
    error: {
      code: errorCode,
    },
  };

  return res.status(statusCode).json(response);
};
