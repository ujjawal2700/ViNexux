import {
  listCustomers,
  getCustomerById,
  updateCustomerStatus,
} from '../services/customer.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';

export const getCustomers = asyncHandler(async (req, res) => {
  const result = await listCustomers(req.query);

  return ApiResponse.success(
    res,
    'Customers list retrieved successfully',
    result,
    HTTP_STATUS.OK
  );
});

export const getCustomer = asyncHandler(async (req, res) => {
  const customer = await getCustomerById(req.params.id);

  return ApiResponse.success(
    res,
    'Customer details retrieved successfully',
    { customer },
    HTTP_STATUS.OK
  );
});

export const updateCustomerStatusController = asyncHandler(async (req, res) => {
  const customer = await updateCustomerStatus(req.params.id, req.body);

  return ApiResponse.success(
    res,
    'Customer account status updated successfully',
    { customer },
    HTTP_STATUS.OK
  );
});
