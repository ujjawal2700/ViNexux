import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

/**
 * Reusable saved-address book, shared by customer and dealer roles.
 * Addresses live as an embedded subdocument array on User.savedAddresses
 * (see models/User.js) rather than a separate collection - they're always
 * accessed scoped to one user and never queried across users.
 */

const loadUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }
  return user;
};

const findAddressOrThrow = (user, addressId) => {
  const address = user.savedAddresses.id(addressId);
  if (!address) {
    throw new AppError('Saved address not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }
  return address;
};

/** Unsets isDefault on every saved address except the given one. */
const clearOtherDefaults = (user, keepAddressId) => {
  user.savedAddresses.forEach((addr) => {
    if (!keepAddressId || addr._id.toString() !== keepAddressId.toString()) {
      addr.isDefault = false;
    }
  });
};

export const listAddresses = async (userId) => {
  const user = await loadUser(userId);
  return user.savedAddresses;
};

export const createAddress = async (userId, data) => {
  const user = await loadUser(userId);

  const isFirstAddress = user.savedAddresses.length === 0;
  const shouldBeDefault = isFirstAddress || data.isDefault === true;

  if (shouldBeDefault) {
    clearOtherDefaults(user, null);
  }

  user.savedAddresses.push({
    label: data.label?.trim() || 'Address',
    line1: data.line1.trim(),
    line2: data.line2 ? data.line2.trim() : '',
    city: data.city.trim(),
    state: data.state.trim(),
    pincode: data.pincode.trim(),
    isDefault: shouldBeDefault,
  });

  await user.save();
  return user.savedAddresses;
};

export const updateAddress = async (userId, addressId, data) => {
  const user = await loadUser(userId);
  const address = findAddressOrThrow(user, addressId);

  if (data.label !== undefined) address.label = data.label.trim() || 'Address';
  if (data.line1 !== undefined) address.line1 = data.line1.trim();
  if (data.line2 !== undefined) address.line2 = data.line2.trim();
  if (data.city !== undefined) address.city = data.city.trim();
  if (data.state !== undefined) address.state = data.state.trim();
  if (data.pincode !== undefined) address.pincode = data.pincode.trim();

  if (data.isDefault === true) {
    clearOtherDefaults(user, address._id);
    address.isDefault = true;
  } else if (data.isDefault === false) {
    address.isDefault = false;
  }

  await user.save();
  return user.savedAddresses;
};

export const deleteAddress = async (userId, addressId) => {
  const user = await loadUser(userId);
  const address = findAddressOrThrow(user, addressId);
  const wasDefault = address.isDefault;

  address.deleteOne();

  // Promote the first remaining address to default so there's always one
  // obvious choice at checkout, as long as at least one address is left.
  if (wasDefault && user.savedAddresses.length > 0) {
    user.savedAddresses[0].isDefault = true;
  }

  await user.save();
  return user.savedAddresses;
};

export const setDefaultAddress = async (userId, addressId) => {
  const user = await loadUser(userId);
  findAddressOrThrow(user, addressId);

  clearOtherDefaults(user, addressId);
  user.savedAddresses.id(addressId).isDefault = true;

  await user.save();
  return user.savedAddresses;
};

export default {
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};
