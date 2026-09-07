import {
  createEnquiryFromCart,
  getMyEnquiries,
  getMyEnquiryById,
  listAllEnquiries,
  getEnquiryById,
  updateEnquiryStatus,
} from '../services/enquiry.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { googleSheetsService } from '../services/googleSheets/googleSheets.service.js';
import { whatsAppService } from '../services/whatsapp/whatsapp.service.js';

export const createEnquiry = asyncHandler(async (req, res) => {

  const enquiry = await createEnquiryFromCart(req.user._id, req.body);

  return ApiResponse.success(
    res,
    'Enquiry created successfully from cart',
    { enquiry },
    HTTP_STATUS.CREATED
  );
});

export const fetchMyEnquiries = asyncHandler(async (req, res) => {
  const result = await getMyEnquiries(req.user._id, req.query);

  return ApiResponse.success(
    res,
    'Enquiries retrieved successfully',
    result,
    HTTP_STATUS.OK
  );
});

export const fetchMyEnquiryById = asyncHandler(async (req, res) => {
  const enquiry = await getMyEnquiryById(req.user._id, req.params.id);

  return ApiResponse.success(
    res,
    'Enquiry details retrieved successfully',
    { enquiry },
    HTTP_STATUS.OK
  );
});

export const fetchAllEnquiries = asyncHandler(async (req, res) => {
  const result = await listAllEnquiries(req.query);

  return ApiResponse.success(
    res,
    'All enquiries retrieved successfully',
    result,
    HTTP_STATUS.OK
  );
});

export const fetchAdminEnquiryById = asyncHandler(async (req, res) => {
  const enquiry = await getEnquiryById(req.params.id);

  return ApiResponse.success(
    res,
    'Enquiry details retrieved successfully',
    { enquiry },
    HTTP_STATUS.OK
  );
});

export const changeEnquiryStatus = asyncHandler(async (req, res) => {
  const enquiry = await updateEnquiryStatus(req.params.id, req.body, req.user._id);

  return ApiResponse.success(
    res,
    'Enquiry updated successfully',
    { enquiry },
    HTTP_STATUS.OK
  );
});

export const syncEnquiryToGoogleSheet = asyncHandler(async (req, res) => {
  const result = await googleSheetsService.manualSyncEnquiry(req.params.id);

  return ApiResponse.success(
    res,
    result.message || 'Enquiry synced to Google Sheets successfully',
    result,
    HTTP_STATUS.OK
  );
});

export const resendEnquiryWhatsAppNotification = asyncHandler(async (req, res) => {
  const result = await whatsAppService.resendEnquiryWhatsApp(req.params.id);

  return ApiResponse.success(
    res,
    result.message || 'WhatsApp notification sent successfully',
    result,
    HTTP_STATUS.OK
  );
});


