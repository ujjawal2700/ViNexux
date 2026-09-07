import { User } from '../models/User.js';
import { DealerProfile } from '../models/DealerProfile.js';
import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { Enquiry } from '../models/Enquiry.js';

/**
 * Calculate and return Admin Dashboard Summary counts across models
 */
export const getDashboardSummary = async () => {
  const [
    totalCustomers,
    totalDealers,
    pendingDealers,
    approvedDealers,
    totalProducts,
    activeProducts,
    inactiveProducts,
    totalCategories,
    activeCategories,
    inactiveCategories,
    totalEnquiries,
    newEnquiries,
    contactedEnquiries,
    inProgressEnquiries,
    closedEnquiries,
    spamEnquiries,
  ] = await Promise.all([
    User.countDocuments({ role: 'customer' }),
    User.countDocuments({ role: 'dealer' }),
    DealerProfile.countDocuments({ status: 'pending' }),
    DealerProfile.countDocuments({ status: 'approved' }),
    Product.countDocuments({}),
    Product.countDocuments({ isActive: true }),
    Product.countDocuments({ isActive: false }),
    Category.countDocuments({}),
    Category.countDocuments({ isActive: true }),
    Category.countDocuments({ isActive: false }),
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
    },
    dealers: {
      total: totalDealers,
      pending: pendingDealers,
      approved: approvedDealers,
    },
    products: {
      total: totalProducts,
      active: activeProducts,
      inactive: inactiveProducts,
    },
    categories: {
      total: totalCategories,
      active: activeCategories,
      inactive: inactiveCategories,
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
