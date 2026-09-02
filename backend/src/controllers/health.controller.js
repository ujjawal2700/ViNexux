import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { getHealthStatus } from '../services/health.service.js';

export const checkHealth = asyncHandler(async (req, res) => {
  const statusData = await getHealthStatus();
  return ApiResponse.success(res, 'Vinexus API is healthy', statusData);
});
