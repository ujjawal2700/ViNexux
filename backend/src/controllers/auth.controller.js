import { authService } from '../services/auth.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';

export const signup = asyncHandler(async (req, res) => {
  const { fullName, email, phone, password, role } = req.body;
  const result = await authService.signup({ fullName, email, phone, password, role });

  return ApiResponse.success(
    res,
    result.message,
    result,
    HTTP_STATUS.CREATED
  );
});

export const sendOtp = asyncHandler(async (req, res) => {
  const { identifier, purpose } = req.body;
  const result = await authService.sendOtp({ identifier, purpose });

  return ApiResponse.success(
    res,
    'OTP sent successfully',
    result,
    HTTP_STATUS.OK
  );
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const { identifier, otp, purpose } = req.body;
  const reqInfo = {
    deviceInfo: {
      userAgent: req.headers['user-agent'] || 'Unknown',
      platform: req.headers['sec-ch-ua-platform'] || 'Unknown Platform',
      browser: req.headers['sec-ch-ua'] || 'Unknown Browser',
    },
    ipAddress: req.ip || req.connection.remoteAddress || '127.0.0.1',
  };

  const result = await authService.verifyOtp({
    identifier,
    otp,
    purpose,
    reqInfo,
  });

  return ApiResponse.success(
    res,
    result.sessionConflict ? 'Active session conflict detected' : 'OTP verified successfully',
    result,
    HTTP_STATUS.OK
  );
});

export const forceLogin = asyncHandler(async (req, res) => {
  const { conflictTicket } = req.body;
  const reqInfo = {
    deviceInfo: {
      userAgent: req.headers['user-agent'] || 'Unknown',
      platform: req.headers['sec-ch-ua-platform'] || 'Unknown Platform',
      browser: req.headers['sec-ch-ua'] || 'Unknown Browser',
    },
    ipAddress: req.ip || req.connection.remoteAddress || '127.0.0.1',
  };

  const result = await authService.forceLogin({
    conflictTicket,
    reqInfo,
  });

  return ApiResponse.success(
    res,
    'Previous session revoked and new session initialized successfully',
    result,
    HTTP_STATUS.OK
  );
});

export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const result = await authService.refreshToken({ refreshToken });

  return ApiResponse.success(
    res,
    'Access token refreshed successfully',
    result,
    HTTP_STATUS.OK
  );
});

export const logout = asyncHandler(async (req, res) => {
  const result = await authService.logout({
    userId: req.user._id,
    sessionId: req.session.sessionId,
  });

  return ApiResponse.success(
    res,
    'Logged out successfully',
    result,
    HTTP_STATUS.OK
  );
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  const result = await authService.getCurrentUser({
    userId: req.user._id,
    sessionId: req.session.sessionId,
  });

  return ApiResponse.success(
    res,
    'User profile retrieved successfully',
    result,
    HTTP_STATUS.OK
  );
});

export default {
  signup,
  sendOtp,
  verifyOtp,
  forceLogin,
  refreshToken,
  logout,
  getCurrentUser,
};
