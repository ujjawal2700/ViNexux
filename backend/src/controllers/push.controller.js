import { pushService } from '../services/push/push.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const registerToken = asyncHandler(async (req, res) => {
  await pushService.registerToken(req.user._id, req.body.token);
  return ApiResponse.success(res, 'Push notification token registered');
});

export const unregisterToken = asyncHandler(async (req, res) => {
  await pushService.unregisterToken(req.user._id, req.body.token);
  return ApiResponse.success(res, 'Push notification token unregistered');
});

export default { registerToken, unregisterToken };
