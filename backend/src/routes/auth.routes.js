import { Router } from 'express';
import {
  signup,
  sendOtp,
  verifyOtp,
  forceLogin,
  refreshToken,
  logout,
  getCurrentUser,
} from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { otpRateLimiter } from '../middlewares/rateLimiter.js';
import {
  signupSchema,
  sendOtpSchema,
  verifyOtpSchema,
  forceLoginSchema,
  refreshTokenSchema,
} from '../validators/auth.validator.js';

const router = Router();

// Public Authentication Endpoints
router.post('/signup', otpRateLimiter, validate(signupSchema), signup);
router.post('/send-otp', otpRateLimiter, validate(sendOtpSchema), sendOtp);
router.post('/verify-otp', otpRateLimiter, validate(verifyOtpSchema), verifyOtp);
router.post('/force-login', validate(forceLoginSchema), forceLogin);
router.post('/refresh-token', validate(refreshTokenSchema), refreshToken);

// Protected Authentication Endpoints
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getCurrentUser);

export default router;
