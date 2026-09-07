export const formatApiError = (error) => {
  if (!error) return { message: 'An unexpected error occurred.', statusCode: 500 };

  const response = error.response;
  if (!response) {
    if (error.request) {
      return {
        message: 'Network Error. Unable to reach the Vinexus server.',
        statusCode: 0,
        errorCode: 'NETWORK_ERROR',
      };
    }
    return {
      message: error.message || 'An unexpected error occurred.',
      statusCode: 500,
      errorCode: 'UNKNOWN_ERROR',
    };
  }

  const { status, data } = response;
  const serverMessage = data?.error?.message || data?.message;
  const errorCode = data?.error?.errorCode || 'API_ERROR';
  const details = data?.error?.details || null;

  switch (status) {
    case 400:
      return {
        message: serverMessage || 'Invalid request parameters.',
        statusCode: 400,
        errorCode,
        details,
      };

    case 401:
      return {
        message: serverMessage || 'Authentication required or session expired.',
        statusCode: 401,
        errorCode,
        details,
      };

    case 403:
      return {
        message: serverMessage || 'Access forbidden. You do not have permission to perform this action.',
        statusCode: 403,
        errorCode,
        details,
      };

    case 404:
      return {
        message: serverMessage || 'Requested resource not found.',
        statusCode: 404,
        errorCode,
        details,
      };

    case 409:
      return {
        message: serverMessage || 'Conflict detected. Resource already exists or session conflict.',
        statusCode: 409,
        errorCode,
        details,
      };

    case 422:
      return {
        message: serverMessage || 'Unprocessable entity. Validation failed.',
        statusCode: 422,
        errorCode,
        details,
      };

    case 429:
      return {
        message: serverMessage || 'Too many requests. Please slow down and try again later.',
        statusCode: 429,
        errorCode,
        details,
      };

    case 500:
    case 502:
    case 503:
      return {
        message: 'Vinexus Server Error. Our technical team has been notified.',
        statusCode: status,
        errorCode: 'SERVER_ERROR',
        details,
      };

    default:
      return {
        message: serverMessage || `Request failed with status ${status}.`,
        statusCode: status,
        errorCode,
        details,
      };
  }
};
