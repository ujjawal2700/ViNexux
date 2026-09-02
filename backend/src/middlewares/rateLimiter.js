import rateLimit from 'express-rate-limit';

/**
 * Rate limiter middleware for OTP send and verification endpoints.
 * Limits IP addresses to a max of 10 requests per 15-minute window.
 */
export const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
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

export default otpRateLimiter;
