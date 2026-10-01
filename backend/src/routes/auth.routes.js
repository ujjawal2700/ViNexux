import { Router } from 'express';
import {
  signup,
  googleLogin,
  sendOtp,
  verifyOtp,
  verifySignupOtp,
  verifyResetOtp,
  resetPassword,
  forceLogin,
  refreshToken,
  logout,
  getCurrentUser,
  updateProfile,
} from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authRateLimiter, otpRateLimiter, otpRequestRateLimiter } from '../middlewares/rateLimiter.js';
import {
  signupSchema,
  googleAuthSchema,
  sendOtpSchema,
  verifyOtpSchema,
  verifySignupOtpSchema,
  verifyResetOtpSchema,
  resetPasswordSchema,
  forceLoginSchema,
  refreshTokenSchema,
  updateProfileSchema,
} from '../validators/auth.validator.js';

const router = Router();

// Public Authentication Endpoints
router.post('/signup', authRateLimiter, validate(signupSchema), signup);
router.post('/google', authRateLimiter, validate(googleAuthSchema), googleLogin);
router.post('/send-otp', authRateLimiter, validate(sendOtpSchema), otpRequestRateLimiter, sendOtp);
router.post('/verify-otp', otpRateLimiter, validate(verifyOtpSchema), verifyOtp);
router.post('/verify-signup-otp', otpRateLimiter, validate(verifySignupOtpSchema), verifySignupOtp);
router.post('/verify-reset-otp', otpRateLimiter, validate(verifyResetOtpSchema), verifyResetOtp);
router.post('/reset-password', authRateLimiter, validate(resetPasswordSchema), resetPassword);
router.post('/force-login', authRateLimiter, validate(forceLoginSchema), forceLogin);
router.post('/refresh-token', authRateLimiter, validate(refreshTokenSchema), refreshToken);

// Protected Authentication Endpoints
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getCurrentUser);
router.put('/profile', authenticate, validate(updateProfileSchema), updateProfile);

export default router;
