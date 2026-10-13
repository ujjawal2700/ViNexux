import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../constants/errorCodes.js';
import { config } from '../config/env.js';

export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let message = err.message || 'Something went wrong';
  let errorCode = err.errorCode || ERROR_CODES.INTERNAL_SERVER_ERROR;

  let errorDetails = Array.isArray(err.details) ? err.details : undefined;

  // Handle Zod Error
  if (err.name === 'ZodError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    errorCode = ERROR_CODES.VALIDATION_ERROR;
    const issues = err.errors || err.issues || [];
    errorDetails = issues.map((item) => ({
      path: Array.isArray(item.path) ? item.path.join('.') : String(item.path || ''),
      message: item.message,
    }));
    const issueMessages = errorDetails
      .map((item) => (item.path ? `${item.path}: ${item.message}` : item.message))
      .filter(Boolean);
    message = issueMessages.length > 0 ? issueMessages.join(', ') : 'Validation failed';
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
    const errorsList = Object.entries(err.errors || {});
    errorDetails = errorsList.map(([key, val]) => ({
      path: key,
      message: val.message,
    }));
    message = errorDetails.map(detail => `${detail.path}: ${detail.message}`).join(', ');
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
      ...(errorDetails ? { details: errorDetails } : {}),
    },
    ...(errorDetails ? { details: errorDetails } : {}),
  };

  if (Number.isFinite(err.retryAfterSeconds)) {
    res.setHeader('Retry-After', err.retryAfterSeconds);
    response.error.retryAfterSeconds = err.retryAfterSeconds;
  }

  return res.status(statusCode).json(response);
};
