import { PosSale } from '../models/PosSale.js';
import { User } from '../models/User.js';
import { DealerProfile } from '../models/DealerProfile.js';
import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { Enquiry } from '../models/Enquiry.js';

/**
 * Calculate and return Admin Dashboard Summary counts across models
 */
export const getDashboardSummary = async () => {
  const countEnquiries = filter => Enquiry.countDocuments({ ...filter, source: { $ne: 'whatsapp' } });
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
    completedEnquiries,
    inProgressEnquiries,
    closedEnquiries,
    spamEnquiries,
    dealerEnquiries,
    customerEnquiries,
    newDealerEnquiries,
    newCustomerEnquiries,
    whatsappOrders, newWhatsappOrders, posOrders,
  ] = await Promise.all([
    User.countDocuments({ role: 'customer' }),
    User.countDocuments({ role: 'dealer' }),
    DealerProfile.countDocuments({ status: 'pending', applicationState: { $ne: 'draft' } }),
    DealerProfile.countDocuments({ status: 'approved' }),
    Product.countDocuments({}),
    Product.countDocuments({ isActive: true }),
    Product.countDocuments({ isActive: false }),
    Category.countDocuments({}),
    Category.countDocuments({ isActive: true }),
    Category.countDocuments({ isActive: false }),
    countEnquiries({}),
    countEnquiries({ status: 'new' }),
    countEnquiries({ status: 'completed' }),
    countEnquiries({ status: 'in-progress' }),
    countEnquiries({ status: 'closed' }),
    countEnquiries({ status: 'spam' }),
    countEnquiries({ userType: 'dealer' }),
    countEnquiries({ userType: 'customer' }),
    countEnquiries({ userType: 'dealer', status: 'new' }),
    countEnquiries({ userType: 'customer', status: 'new' }),
    Enquiry.countDocuments({ source: 'whatsapp' }),
    Enquiry.countDocuments({ source: 'whatsapp', status: 'new' }),
    PosSale.countDocuments({ documentType: { $ne: 'delivery-note' }, status: { $ne: 'voided' } }),
  ]);

  return {
    orders: { total: whatsappOrders + posOrders, whatsapp: whatsappOrders, pos: posOrders, new: newWhatsappOrders },
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
      completed: completedEnquiries,
      inProgress: inProgressEnquiries,
      closed: closedEnquiries,
      spam: spamEnquiries,
      b2b: { total: dealerEnquiries, new: newDealerEnquiries },
      b2c: { total: customerEnquiries, new: newCustomerEnquiries },
    },
  };
};
