import { getDashboardSummary } from '../services/admin.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';

/**
 * Controller to fetch Admin Dashboard summary
 */
export const getDashboard = asyncHandler(async (req, res) => {
  const summary = await getDashboardSummary();

  return ApiResponse.success(
    res,
    'Admin dashboard summary retrieved successfully',
    summary,
    HTTP_STATUS.OK
  );
});
