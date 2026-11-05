import rateLimit from 'express-rate-limit';
import { MongoRateLimitStore } from '../utils/mongoRateLimitStore.js';
import { config } from '../config/env.js';

const isDevOrTest = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
const isTest = process.env.NODE_ENV === 'test';
const normalizeIdentifier = (value = '') => {
  const normalized = value.trim().toLowerCase();
  return normalized.includes('@') ? normalized : normalized.replace(/\D/g, '');
};

/**
 * General API rate limiter.
 * Limits IP addresses to 300 requests per 15-minute window.
 * Kept in process memory (no database write per request), so under PM2
 * cluster mode each instance counts separately; it is a coarse abuse guard.
 * The auth/OTP limiters below share counts across instances via MongoDB.
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
  store: new MongoRateLimitStore({ prefix: 'auth' }),
  // A database hiccup must not lock everyone out of signing in.
  passOnStoreError: true,
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
  store: new MongoRateLimitStore({ prefix: 'otp-request' }),
  // A database hiccup must not lock everyone out of signing in.
  passOnStoreError: true,
  windowMs: config.otpRequestWindowMinutes * 60 * 1000,
  max: config.otpRequestMax,
  // Refund gateway/server failures; invalid requests still count against abuse limits.
  skipFailedRequests: true,
  requestWasSuccessful: (_req, res) => res.statusCode < 500,
  skip: () => isTest,
  keyGenerator: (req) => `otp:${normalizeIdentifier(req.body?.identifier) || 'missing'}`,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const resetAt = req.rateLimit?.resetTime?.getTime();
    const retryAfterSeconds = Math.max(1, Math.ceil(
      ((resetAt || Date.now() + config.otpRequestWindowMinutes * 60 * 1000) - Date.now()) / 1000
    ));
    res.setHeader('Retry-After', retryAfterSeconds);
    return res.status(429).json({
      success: false,
      message: `OTP request limit reached. Please wait ${retryAfterSeconds} seconds before trying again.`,
      error: { code: 'TOO_MANY_REQUESTS', retryAfterSeconds },
    });
  },
});

/**
 * Rate limiter middleware for OTP send and verification endpoints.
 * Limits IP addresses to a max of 15 requests per 15-minute window.
 */
export const otpRateLimiter = rateLimit({
  store: new MongoRateLimitStore({ prefix: 'otp' }),
  // A database hiccup must not lock everyone out of signing in.
  passOnStoreError: true,
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
  store: new MongoRateLimitStore({ prefix: 'resend' }),
  // A database hiccup must not lock everyone out of signing in.
  passOnStoreError: true,
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
