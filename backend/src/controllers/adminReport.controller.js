import {
  getReportSummary,
  getEnquiryReport,
  getDealerReport,
  getCustomerReport,
} from '../services/report.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';

export const getSummaryReport = asyncHandler(async (req, res) => {
  const summary = await getReportSummary();

  return ApiResponse.success(
    res,
    'Platform report summary retrieved successfully',
    summary,
    HTTP_STATUS.OK
  );
});

export const getEnquiriesReport = asyncHandler(async (req, res) => {
  const result = await getEnquiryReport(req.query);

  return ApiResponse.success(
    res,
    'Enquiry report retrieved successfully',
    result,
    HTTP_STATUS.OK
  );
});

export const getDealersReport = asyncHandler(async (req, res) => {
  const result = await getDealerReport(req.query);

  return ApiResponse.success(
    res,
    'Dealer report retrieved successfully',
    result,
    HTTP_STATUS.OK
  );
});

export const getCustomersReport = asyncHandler(async (req, res) => {
  const result = await getCustomerReport(req.query);

  return ApiResponse.success(
    res,
    'Customer report retrieved successfully',
    result,
    HTTP_STATUS.OK
  );
});
