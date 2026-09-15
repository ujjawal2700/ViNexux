import {
  listAddresses as listAddressesService,
  createAddress as createAddressService,
  updateAddress as updateAddressService,
  deleteAddress as deleteAddressService,
  setDefaultAddress as setDefaultAddressService,
} from '../services/address.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';

export const listAddresses = asyncHandler(async (req, res) => {
  const addresses = await listAddressesService(req.user._id);

  return ApiResponse.success(res, 'Saved addresses fetched successfully', { addresses }, HTTP_STATUS.OK);
});

export const createAddress = asyncHandler(async (req, res) => {
  const addresses = await createAddressService(req.user._id, req.body);

  return ApiResponse.success(res, 'Address saved successfully', { addresses }, HTTP_STATUS.CREATED);
});

export const updateAddress = asyncHandler(async (req, res) => {
  const addresses = await updateAddressService(req.user._id, req.params.addressId, req.body);

  return ApiResponse.success(res, 'Address updated successfully', { addresses }, HTTP_STATUS.OK);
});

export const deleteAddress = asyncHandler(async (req, res) => {
  const addresses = await deleteAddressService(req.user._id, req.params.addressId);

  return ApiResponse.success(res, 'Address deleted successfully', { addresses }, HTTP_STATUS.OK);
});

export const setDefaultAddress = asyncHandler(async (req, res) => {
  const addresses = await setDefaultAddressService(req.user._id, req.params.addressId);

  return ApiResponse.success(res, 'Default address updated successfully', { addresses }, HTTP_STATUS.OK);
});

export default {
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};
