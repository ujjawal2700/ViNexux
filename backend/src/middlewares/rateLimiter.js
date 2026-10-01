import rateLimit from 'express-rate-limit';

const isDevOrTest = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
const isTest = process.env.NODE_ENV === 'test';
const normalizeIdentifier = (value = '') => {
  const normalized = value.trim().toLowerCase();
  return normalized.includes('@') ? normalized : normalized.replace(/\D/g, '');
};

/**
 * General API rate limiter.
 * Limits IP addresses to 300 requests per 15-minute window.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  skip: () => isDevOrTest,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP address. Please try again after 15 minutes.',
    error: {
      code: 'TOO_MANY_REQUESTS',
    },
  },
});

/**
 * Rate limiter middleware for authentication & login endpoints.
 * Limits IP addresses to 30 requests per 10-minute window.
 */
export const authRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  skip: () => isDevOrTest,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP address. Please try again after 10 minutes.',
    error: {
      code: 'TOO_MANY_REQUESTS',
    },
  },
});

/**
 * Per-account OTP request limiter. This prevents an attacker from exhausting
 * one user's SMS quota even if the attacker changes IP addresses.
 */
export const otpRequestRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  skip: () => isTest,
  keyGenerator: (req) => `otp:${normalizeIdentifier(req.body?.identifier) || 'missing'}`,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'OTP request limit reached. Please wait 10 minutes before trying again.',
    error: {
      code: 'TOO_MANY_REQUESTS',
      retryAfterSeconds: 600,
    },
  },
});

/**
 * Rate limiter middleware for OTP send and verification endpoints.
 * Limits IP addresses to a max of 15 requests per 15-minute window.
 */
export const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  skip: () => isDevOrTest,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many OTP requests from this IP address. Please try again after 15 minutes.',
    error: {
      code: 'TOO_MANY_REQUESTS',
    },
  },
});

/**
 * Rate limiter middleware for admin manual notification resend endpoints.
 */
export const resendRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skip: () => isDevOrTest,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many notification resend requests. Please wait before retrying.',
    error: {
      code: 'TOO_MANY_REQUESTS',
    },
  },
});

export default {
  apiRateLimiter,
  authRateLimiter,
  otpRequestRateLimiter,
  otpRateLimiter,
  resendRateLimiter,
};
