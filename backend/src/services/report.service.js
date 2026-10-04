import mongoose from 'mongoose';
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
  const sumIf = (condition) => ({ $sum: { $cond: [condition, 1, 0] } });
  const customerWithStatus = (value) => ({
    $and: [{ $eq: ['$role', 'customer'] }, { $or: [{ $eq: ['$accountStatus', value] }, { $eq: ['$status', value] }] }],
  });
  const countBy = (rows) => new Map(rows.map((row) => [row._id, row.count]));

  // One grouped pass per collection instead of one count query per metric.
  const [[userCounts = {}], dealerRows, [productCounts = {}], [categoryCounts = {}], enquiryRows] = await Promise.all([
    User.aggregate([
      { $match: { role: { $in: ['customer', 'dealer'] } } },
      { $group: {
        _id: null,
        totalCustomers: sumIf({ $eq: ['$role', 'customer'] }),
        activeCustomers: sumIf(customerWithStatus('active')),
        pendingCustomers: sumIf(customerWithStatus('pending')),
        blockedCustomers: sumIf(customerWithStatus('blocked')),
        totalDealers: sumIf({ $eq: ['$role', 'dealer'] }),
      } },
    ]),
    DealerProfile.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Product.aggregate([{ $group: { _id: null, total: { $sum: 1 }, active: sumIf({ $eq: ['$isActive', true] }) } }]),
    Category.aggregate([{ $group: { _id: null, total: { $sum: 1 }, active: sumIf({ $eq: ['$isActive', true] }) } }]),
    Enquiry.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);
  const dealerByStatus = countBy(dealerRows);
  const enquiryByStatus = countBy(enquiryRows);

  const totalCustomers = userCounts.totalCustomers || 0;
  const activeCustomers = userCounts.activeCustomers || 0;
  const pendingCustomers = userCounts.pendingCustomers || 0;
  const blockedCustomers = userCounts.blockedCustomers || 0;
  const totalDealers = userCounts.totalDealers || 0;
  const pendingDealers = dealerByStatus.get('pending') || 0;
  const approvedDealers = dealerByStatus.get('approved') || 0;
  const rejectedDealers = dealerByStatus.get('rejected') || 0;
  const totalProducts = productCounts.total || 0;
  const activeProducts = productCounts.active || 0;
  const totalCategories = categoryCounts.total || 0;
  const activeCategories = categoryCounts.active || 0;
  const totalEnquiries = enquiryRows.reduce((sum, row) => sum + row.count, 0);
  const newEnquiries = enquiryByStatus.get('new') || 0;
  const contactedEnquiries = enquiryByStatus.get('contacted') || 0;
  const inProgressEnquiries = enquiryByStatus.get('in-progress') || 0;
  const closedEnquiries = enquiryByStatus.get('closed') || 0;
  const spamEnquiries = enquiryByStatus.get('spam') || 0;

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

  // Each breakdown keeps the other filters but ignores its own dimension,
  // matching the previous per-value countDocuments({ ...filter, field }) calls.
  // Aggregation does not cast like countDocuments, so cast ObjectIds here.
  const matchFilter = { ...filter };
  if (matchFilter.assignedTo && mongoose.isValidObjectId(matchFilter.assignedTo)) {
    matchFilter.assignedTo = new mongoose.Types.ObjectId(String(matchFilter.assignedTo));
  }
  const { status: _status, ...withoutStatus } = matchFilter;
  const { userType: _userType, ...withoutUserType } = matchFilter;
  const countBy = (rows) => new Map(rows.map((row) => [row._id, row.count]));

  const [total, filteredCount, statusRows, userTypeRows, enquiries] = await Promise.all([
    Enquiry.countDocuments({}),
    Enquiry.countDocuments(filter),
    Enquiry.aggregate([{ $match: withoutStatus }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Enquiry.aggregate([{ $match: withoutUserType }, { $group: { _id: '$userType', count: { $sum: 1 } } }]),
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
  const statusCounts = countBy(statusRows);
  const userTypeCounts = countBy(userTypeRows);
  const newCount = statusCounts.get('new') || 0;
  const contactedCount = statusCounts.get('contacted') || 0;
  const inProgressCount = statusCounts.get('in-progress') || 0;
  const closedCount = statusCounts.get('closed') || 0;
  const spamCount = statusCounts.get('spam') || 0;
  const customerCount = userTypeCounts.get('customer') || 0;
  const dealerCount = userTypeCounts.get('dealer') || 0;

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
