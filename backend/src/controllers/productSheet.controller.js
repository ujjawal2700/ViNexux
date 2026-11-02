import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { productSheetService } from '../services/googleSheets/productSheet.service.js';

export const getProductSheet = asyncHandler(async (req, res) => ApiResponse.success(res, 'Product sheet connection retrieved', await productSheetService.status()));
export const initializeProductSheet = asyncHandler(async (req, res) => {
  const { spreadsheetUrl } = z.object({ spreadsheetUrl: z.string().trim().max(500).optional().default('') }).parse(req.body);
  return ApiResponse.success(res, 'Product sheet created with the current catalogue', await productSheetService.initialize(spreadsheetUrl));
});
export const syncProductSheet = asyncHandler(async (req, res) => ApiResponse.success(res, 'Product sheet sync finished', await productSheetService.sync(req.user)));
