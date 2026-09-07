import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { AppError } from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Admin: List customers (role strictly = 'customer') with pagination, filtering & search
 */
export const listCustomers = async (query = {}) => {
  const {
    page = 1,
    limit = 20,
    accountStatus,
    status,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = query;

  const filter = { role: 'customer' };

  const targetStatus = accountStatus || status;
  if (targetStatus) {
    filter.$or = [{ accountStatus: targetStatus }, { status: targetStatus }];
  }

  if (search) {
    const safeSearch = escapeRegex(search);
    const searchFilter = [
      { fullName: new RegExp(safeSearch, 'i') },
      { name: new RegExp(safeSearch, 'i') },
      { email: new RegExp(safeSearch, 'i') },
      { phone: new RegExp(safeSearch, 'i') },
    ];

    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, { $or: searchFilter }];
      delete filter.$or;
    } else {
      filter.$or = searchFilter;
    }
  }

  const skip = (page - 1) * limit;

  const totalItems = await User.countDocuments(filter);
  const customers = await User.find(filter)
    .select('-passwordHash -currentSessionId')
    .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    customers,
    pagination: {
      totalItems,
      totalPages: Math.ceil(totalItems / limit) || 1,
      currentPage: page,
      limit,
    },
  };
};

/**
 * Admin: Get customer detail by ID (role strictly = 'customer')
 */
export const getCustomerById = async (customerId) => {
  const user = await User.findById(customerId).select('-passwordHash -currentSessionId').lean();

  if (!user || user.role !== 'customer') {
    throw new AppError('Customer not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  return user;
};

/**
 * Admin: Update customer account status (role strictly = 'customer')
 */
export const updateCustomerStatus = async (customerId, updateData = {}) => {
  const user = await User.findById(customerId);

  if (!user || user.role !== 'customer') {
    throw new AppError('Customer not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  const newStatus = updateData.accountStatus || updateData.status;
  if (!newStatus) {
    throw new AppError('Account status is required', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
  }

  user.accountStatus = newStatus;
  user.status = newStatus;
  await user.save();

  return await User.findById(user._id).select('-passwordHash -currentSessionId').lean();
};
