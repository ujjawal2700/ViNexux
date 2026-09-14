import { Router } from 'express';
import {
  signup,
  googleLogin,
  sendOtp,
  verifyOtp,
  verifySignupOtp,
  forceLogin,
  refreshToken,
  logout,
  getCurrentUser,
  updateProfile,
} from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { otpRateLimiter } from '../middlewares/rateLimiter.js';
import {
  signupSchema,
  googleAuthSchema,
  sendOtpSchema,
  verifyOtpSchema,
  verifySignupOtpSchema,
  forceLoginSchema,
  refreshTokenSchema,
} from '../validators/auth.validator.js';

const router = Router();

// Public Authentication Endpoints
router.post('/signup', validate(signupSchema), signup);
router.post('/google', validate(googleAuthSchema), googleLogin);
router.post('/send-otp', otpRateLimiter, validate(sendOtpSchema), sendOtp);
router.post('/verify-otp', otpRateLimiter, validate(verifyOtpSchema), verifyOtp);
router.post('/verify-signup-otp', otpRateLimiter, validate(verifySignupOtpSchema), verifySignupOtp);
router.post('/force-login', validate(forceLoginSchema), forceLogin);
router.post('/refresh-token', validate(refreshTokenSchema), refreshToken);

// Protected Authentication Endpoints
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getCurrentUser);
router.put('/profile', authenticate, updateProfile);

export default router;
