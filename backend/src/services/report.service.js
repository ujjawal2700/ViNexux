import { User } from '../models/User.js';
import { DealerProfile } from '../models/DealerProfile.js';
import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { Enquiry } from '../models/Enquiry.js';

const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Admin: Summary report of platform metrics
 */
export const getReportSummary = async () => {
  const [
    totalCustomers,
    activeCustomers,
    pendingCustomers,
    blockedCustomers,
    totalDealers,
    pendingDealers,
    approvedDealers,
    rejectedDealers,
    totalProducts,
    activeProducts,
    totalCategories,
    activeCategories,
    totalEnquiries,
    newEnquiries,
    contactedEnquiries,
    inProgressEnquiries,
    closedEnquiries,
    spamEnquiries,
  ] = await Promise.all([
    User.countDocuments({ role: 'customer' }),
    User.countDocuments({ role: 'customer', $or: [{ accountStatus: 'active' }, { status: 'active' }] }),
    User.countDocuments({ role: 'customer', $or: [{ accountStatus: 'pending' }, { status: 'pending' }] }),
    User.countDocuments({ role: 'customer', $or: [{ accountStatus: 'blocked' }, { status: 'blocked' }] }),
    User.countDocuments({ role: 'dealer' }),
    DealerProfile.countDocuments({ status: 'pending' }),
    DealerProfile.countDocuments({ status: 'approved' }),
    DealerProfile.countDocuments({ status: 'rejected' }),
    Product.countDocuments({}),
    Product.countDocuments({ isActive: true }),
    Category.countDocuments({}),
    Category.countDocuments({ isActive: true }),
    Enquiry.countDocuments({}),
    Enquiry.countDocuments({ status: 'new' }),
    Enquiry.countDocuments({ status: 'contacted' }),
    Enquiry.countDocuments({ status: 'in-progress' }),
    Enquiry.countDocuments({ status: 'closed' }),
    Enquiry.countDocuments({ status: 'spam' }),
  ]);

  return {
    customers: {
      total: totalCustomers,
      active: activeCustomers,
      pending: pendingCustomers,
      blocked: blockedCustomers,
    },
    dealers: {
      total: totalDealers,
      pending: pendingDealers,
      approved: approvedDealers,
      rejected: rejectedDealers,
    },
    products: {
      total: totalProducts,
      active: activeProducts,
      inactive: totalProducts - activeProducts,
    },
    categories: {
      total: totalCategories,
      active: activeCategories,
      inactive: totalCategories - activeCategories,
    },
    enquiries: {
      total: totalEnquiries,
      new: newEnquiries,
      contacted: contactedEnquiries,
      inProgress: inProgressEnquiries,
      closed: closedEnquiries,
      spam: spamEnquiries,
    },
  };
};

/**
 * Admin: Enquiry Analytics & Paginated Report
 */
export const getEnquiryReport = async (query = {}) => {
  const {
    page = 1,
    limit = 20,
    status,
    userType,
    assignedTo,
    startDate,
    endDate,
  } = query;

  const filter = {};

  if (status) {
    filter.status = status;
  }
  if (userType) {
    filter.userType = userType;
  }
  if (assignedTo) {
    filter.assignedTo = assignedTo;
  }

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;

  const [
    total,
    filteredCount,
    newCount,
    contactedCount,
    inProgressCount,
    closedCount,
    spamCount,
    customerCount,
    dealerCount,
    enquiries,
  ] = await Promise.all([
    Enquiry.countDocuments({}),
    Enquiry.countDocuments(filter),
    Enquiry.countDocuments({ ...filter, status: 'new' }),
    Enquiry.countDocuments({ ...filter, status: 'contacted' }),
    Enquiry.countDocuments({ ...filter, status: 'in-progress' }),
    Enquiry.countDocuments({ ...filter, status: 'closed' }),
    Enquiry.countDocuments({ ...filter, status: 'spam' }),
    Enquiry.countDocuments({ ...filter, userType: 'customer' }),
    Enquiry.countDocuments({ ...filter, userType: 'dealer' }),
    Enquiry.find(filter)
      .populate([
        { path: 'userId', select: 'fullName email phone role accountStatus' },
        { path: 'assignedTo', select: 'fullName email phone role' },
        { path: 'notes.adminId', select: 'fullName email phone role' },
      ])
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return {
    total,
    filteredCount,
    statusBreakdown: {
      new: newCount,
      contacted: contactedCount,
      inProgress: inProgressCount,
      closed: closedCount,
      spam: spamCount,
    },
    userTypeBreakdown: {
      customer: customerCount,
      dealer: dealerCount,
    },
    enquiries,
    pagination: {
      totalItems: filteredCount,
      totalPages: Math.ceil(filteredCount / limit) || 1,
      currentPage: page,
      limit,
    },
  };
};

/**
 * Admin: Dealer Analytics & Paginated Report
 */
export const getDealerReport = async (query = {}) => {
  const {
    page = 1,
    limit = 20,
    status,
    city,
    state,
    startDate,
    endDate,
  } = query;

  const filter = {};

  if (status) {
    filter.status = status;
  }
  if (city) {
    filter.city = new RegExp(escapeRegex(city), 'i');
  }
  if (state) {
    filter.state = new RegExp(escapeRegex(state), 'i');
  }

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;

  const [
    total,
    filteredCount,
    pendingCount,
    approvedCount,
    rejectedCount,
    dealers,
  ] = await Promise.all([
    DealerProfile.countDocuments({}),
    DealerProfile.countDocuments(filter),
    DealerProfile.countDocuments({ ...filter, status: 'pending' }),
    DealerProfile.countDocuments({ ...filter, status: 'approved' }),
    DealerProfile.countDocuments({ ...filter, status: 'rejected' }),
    DealerProfile.find(filter)
      .populate('userId', 'fullName email phone role accountStatus isPhoneVerified isEmailVerified')
      .populate('kycReviewedBy', 'fullName email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return {
    total,
    filteredCount,
    statusBreakdown: {
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
    },
    dealers,
    pagination: {
      totalItems: filteredCount,
      totalPages: Math.ceil(filteredCount / limit) || 1,
      currentPage: page,
      limit,
    },
  };
};

/**
 * Admin: Customer Analytics & Paginated Report
 */
export const getCustomerReport = async (query = {}) => {
  const {
    page = 1,
    limit = 20,
    accountStatus,
    status,
    startDate,
    endDate,
  } = query;

  const filter = { role: 'customer' };

  const targetStatus = accountStatus || status;
  if (targetStatus) {
    filter.$or = [{ accountStatus: targetStatus }, { status: targetStatus }];
  }

  if (startDate || endDate) {
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, { createdAt: dateFilter }];
      delete filter.$or;
    } else {
      filter.createdAt = dateFilter;
    }
  }

  const skip = (page - 1) * limit;

  const [
    total,
    filteredCount,
    activeCount,
    pendingCount,
    blockedCount,
    customers,
  ] = await Promise.all([
    User.countDocuments({ role: 'customer' }),
    User.countDocuments(filter),
    User.countDocuments({ ...filter, $or: [{ accountStatus: 'active' }, { status: 'active' }] }),
    User.countDocuments({ ...filter, $or: [{ accountStatus: 'pending' }, { status: 'pending' }] }),
    User.countDocuments({ ...filter, $or: [{ accountStatus: 'blocked' }, { status: 'blocked' }] }),
    User.find(filter)
      .select('-passwordHash -currentSessionId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return {
    total,
    filteredCount,
    statusBreakdown: {
      active: activeCount,
      pending: pendingCount,
      blocked: blockedCount,
    },
    customers,
    pagination: {
      totalItems: filteredCount,
      totalPages: Math.ceil(filteredCount / limit) || 1,
      currentPage: page,
      limit,
    },
  };
};
