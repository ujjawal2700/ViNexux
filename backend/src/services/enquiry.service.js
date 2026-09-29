import { Enquiry } from '../models/Enquiry.js';
import { Cart } from '../models/Cart.js';
import { User } from '../models/User.js';
import { Product } from '../models/Product.js';
import { calculateApplicablePrice, validateProductAndCategoryActive } from './cart.service.js';
import { AppError } from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../constants/errorCodes.js';
import { googleSheetsService } from './googleSheets/googleSheets.service.js';
import { whatsAppService } from './whatsapp/whatsapp.service.js';
import { emailService } from './email/email.service.js';
import { FooterContent } from '../models/FooterContent.js';

const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Allowed enquiry status transition matrix for PRD workflow
 * new -> contacted -> in-progress -> closed (and spam)
 */
const ALLOWED_STATUS_TRANSITIONS = {
  new: ['contacted', 'in-progress', 'closed', 'spam'],
  pending: ['new', 'contacted', 'in-progress', 'closed', 'spam'], // backward compatibility
  contacted: ['in-progress', 'closed', 'spam'],
  'in-progress': ['closed', 'spam'],
  processing: ['in-progress', 'closed', 'spam'], // backward compatibility
  closed: ['closed'],
  completed: ['closed'], // backward compatibility
  cancelled: ['closed', 'spam'], // backward compatibility
  spam: ['spam'],
};

/**
 * Generate a unique human-readable enquiry number (e.g. VNX-000001)
 */
export const generateUniqueEnquiryNumber = async () => {
  const latestEnquiry = await Enquiry.findOne({ enquiryNumber: /^VNX-\d+$/ })
    .sort({ createdAt: -1 })
    .lean();

  let nextSequence = 1;
  if (latestEnquiry && latestEnquiry.enquiryNumber) {
    const match = latestEnquiry.enquiryNumber.match(/^VNX-(\d+)$/);
    if (match && match[1]) {
      nextSequence = parseInt(match[1], 10) + 1;
    }
  }

  // Ensure uniqueness by checking existing database entries
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = `VNX-${String(nextSequence + attempt).padStart(6, '0')}`;
    const exists = await Enquiry.findOne({ enquiryNumber: candidate }).lean();
    if (!exists) {
      return candidate;
    }
  }

  return `VNX-${Date.now().toString().slice(-6)}`;
};

/**
 * Create a complete PRD-aligned Enquiry snapshot from user's cart
 */
export const createEnquiryFromCart = async (userId, payload = {}) => {
  // 1. Load authenticated user profile
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User account not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  // 2. Fetch user's cart
  const cart = await Cart.findOne({ userId });
  if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
    throw new AppError(
      'Cannot create enquiry because cart is empty',
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.BAD_REQUEST
    );
  }

  const selectedIds = new Set(payload.selectedProductIds || []);
  const matchingItems = cart.items.filter((item) => selectedIds.size === 0 || selectedIds.has(String(item.productId)));
  // Older carts may contain repeated lines for the same product. Keep a single
  // enquiry line with the combined quantity so the saved record matches the UI.
  const selectedItems = [...matchingItems.reduce((byProduct, item) => {
    const key = String(item.productId);
    const existing = byProduct.get(key);
    if (existing) existing.quantity += item.quantity;
    else byProduct.set(key, { productId: item.productId, quantity: item.quantity });
    return byProduct;
  }, new Map()).values()];
  if (!selectedItems.length) {
    throw new AppError('No selected cart products were found', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
  }

  // 3. Validate selected products against the live catalog.
  for (const item of selectedItems) {
    await validateProductAndCategoryActive(item.productId);
  }

  // 4. Build Contact Snapshot
  const contactName = payload.contactName || user.fullName || user.name || 'Vinexus Customer';
  const contactEmail = payload.contactEmail || user.email;
  const contactPhone = payload.contactPhone || user.phone;
  const userType = user.role === 'dealer' ? 'dealer' : 'customer';

  // 5. Build Delivery Address Snapshot - resolved from the user's saved
  // address book (payload.addressId), not typed in ad hoc. Required by the
  // validator, so an enquiry always carries a real, selected address.
  const savedAddress = user.savedAddresses.id(payload.addressId);
  if (!savedAddress) {
    throw new AppError(
      'Selected delivery address not found. Please select or add a valid address.',
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.BAD_REQUEST
    );
  }
  const deliveryAddress = payload.deliveryAddress || {
    line1: savedAddress.line1,
    line2: savedAddress.line2 || '',
    city: savedAddress.city,
    state: savedAddress.state,
    pincode: savedAddress.pincode,
  };

  // 5b. WhatsApp number the submitter wants to be reached on - required by
  // the validator (10-digit Indian mobile), used to build the admin's
  // wa.me deep link rather than any Business API integration.
  const whatsappNumber = payload.whatsappNumber;

  // 6. Build Message Snapshot
  const rawMessage = payload.message || payload.customerNote || '';
  const message = rawMessage ? rawMessage.trim() : undefined;

  // 7. Build Enquiry Items Snapshot (productName & priceShown snapshots)
  const enquiryItems = [];
  for (const item of selectedItems) {
    const product = await Product.findById(item.productId);
    const productName = product ? product.name : 'Vinexus Product';
    const priceShown = product ? await calculateApplicablePrice(userId, product) : 0;

    enquiryItems.push({
      productId: item.productId,
      productName,
      productImageUrl: product?.images?.[0]?.url || '',
      quantity: item.quantity,
      priceShown,
    });
  }

  // 8. Generate unique enquiryNumber
  const enquiryNumber = await generateUniqueEnquiryNumber();

  // 9. Create Enquiry record with initial status 'new'
  const enquiry = await Enquiry.create({
    enquiryNumber,
    userId,
    contactName,
    contactEmail,
    contactPhone,
    whatsappNumber,
    deliveryAddress,
    userType,
    items: enquiryItems,
    message,
    status: 'new',
    notes: [],
    notifiedViaEmail: false,
    syncedToGoogleSheet: false,
  });

  const footer = await FooterContent.findOne({ isActive: true }).lean();
  const addressText = [deliveryAddress.line1, deliveryAddress.line2, deliveryAddress.city, deliveryAddress.state, deliveryAddress.pincode].filter(Boolean).join(', ');
  const itemsText = enquiryItems
    .map((item) => `${item.productName} — Qty ${item.quantity} × ₹${item.priceShown} = ₹${item.quantity * item.priceShown}`)
    .join('\n');
  const adminText = `Enquiry: ${enquiryNumber}\nName: ${contactName}\nEmail: ${contactEmail}\nPhone: ${contactPhone}\nAddress: ${addressText}\n\nProducts:\n${itemsText}\n\nMessage: ${message || '-'}`;
  const emailJobs = [];
  if (footer?.email) {
    emailJobs.push(emailService.sendEmail({ to: footer.email, subject: `New enquiry ${enquiryNumber}`, text: adminText }));
  }
  if (contactEmail) {
    emailJobs.push(emailService.sendEmail({
      to: contactEmail,
      subject: `We received your enquiry ${enquiryNumber}`,
      text: `Hello ${contactName},\n\nYour enquiry has been received. Our team will contact you shortly.\n\n${itemsText}`,
    }));
  }
  if (emailJobs.length) {
    const results = await Promise.allSettled(emailJobs);
    enquiry.notifiedViaEmail = results.some((result) => result.status === 'fulfilled');
    await enquiry.save();
    results.filter((result) => result.status === 'rejected').forEach((result) => {
      console.error('[EnquiryService] Email notification failed silently:', result.reason?.message || result.reason);
    });
  }

  // 10. Remove only the submitted products; unselected cart items stay available.
  cart.items = cart.items.filter((item) => !selectedIds.has(String(item.productId)));
  await cart.save();

  // 11. Attempt Google Sheets Sync (Isolated operation; does not throw or break enquiry creation if sync fails)
  await googleSheetsService.syncEnquiryToSheet(enquiry);

  // 12. Populate and return enquiry record

  return await enquiry.populate([
    { path: 'userId', select: 'fullName email phone role accountStatus' },
    { path: 'assignedTo', select: 'fullName email phone role' },
    { path: 'notes.adminId', select: 'fullName email phone role' },
    { path: 'customerReplies.adminId', select: 'fullName email role' },
    {
      path: 'items.productId',
      select: 'sku name categoryId description images specifications isFeatured isActive standardPrice',
      populate: { path: 'categoryId', select: 'name slug isActive' },
    },
  ]);
};

/**
 * Get paginated list of enquiries for authenticated customer/dealer
 */
export const getMyEnquiries = async (userId, query = {}) => {
  const { page = 1, limit = 20, status, userType, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;

  const filter = { userId };
  if (status) {
    filter.status = status;
  }
  if (userType) {
    filter.userType = userType;
  }
  if (search) {
    filter.enquiryNumber = new RegExp(escapeRegex(search), 'i');
  }

  const skip = (page - 1) * limit;

  const totalItems = await Enquiry.countDocuments(filter);
  const enquiries = await Enquiry.find(filter)
    .select('-notes')
    .populate([
      { path: 'userId', select: 'fullName email phone role accountStatus' },
      { path: 'assignedTo', select: 'fullName email phone role' },
      { path: 'customerReplies.adminId', select: 'fullName email role' },
      {
        path: 'items.productId',
        select: 'sku name categoryId description images specifications isFeatured isActive standardPrice',
        populate: { path: 'categoryId', select: 'name slug isActive' },
      },
    ])
    .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    enquiries,
    pagination: {
      totalItems,
      totalPages: Math.ceil(totalItems / limit) || 1,
      currentPage: page,
      limit,
    },
  };
};

/**
 * Get single enquiry owned by authenticated user
 */
export const getMyEnquiryById = async (userId, enquiryId) => {
  const enquiry = await Enquiry.findById(enquiryId).select('-notes').populate([
    { path: 'userId', select: 'fullName email phone role accountStatus' },
    { path: 'assignedTo', select: 'fullName email phone role' },
    { path: 'customerReplies.adminId', select: 'fullName email role' },
    {
      path: 'items.productId',
      select: 'sku name categoryId description images specifications isFeatured isActive standardPrice',
      populate: { path: 'categoryId', select: 'name slug isActive' },
    },
  ]);

  if (!enquiry) {
    throw new AppError('Enquiry not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  if (enquiry.userId._id.toString() !== userId.toString()) {
    throw new AppError('Enquiry not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  return enquiry;
};

/**
 * List all enquiries across all users (Admin only)
 */
export const listAllEnquiries = async (query = {}) => {
  const { page = 1, limit = 20, status, userType, search, userId, sortBy = 'createdAt', sortOrder = 'desc' } = query;

  const filter = {};
  if (status) {
    filter.status = status;
  }
  if (userType) {
    filter.userType = userType;
  }
  if (userId) {
    filter.userId = userId;
  }

  if (search) {
    const safeSearch = escapeRegex(search);
    filter.$or = [
      { enquiryNumber: new RegExp(safeSearch, 'i') },
      { contactName: new RegExp(safeSearch, 'i') },
      { contactEmail: new RegExp(safeSearch, 'i') },
      { contactPhone: new RegExp(safeSearch, 'i') },
      { message: new RegExp(safeSearch, 'i') },
    ];
  }

  const skip = (page - 1) * limit;

  const totalItems = await Enquiry.countDocuments(filter);
  const enquiries = await Enquiry.find(filter)
    .populate([
      { path: 'userId', select: 'fullName email phone role accountStatus' },
      { path: 'assignedTo', select: 'fullName email phone role' },
      { path: 'notes.adminId', select: 'fullName email phone role' },
      { path: 'customerReplies.adminId', select: 'fullName email role' },
      {
        path: 'items.productId',
        select: 'sku name categoryId description images specifications isFeatured isActive standardPrice',
        populate: { path: 'categoryId', select: 'name slug isActive' },
      },
    ])
    .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    enquiries,
    pagination: {
      totalItems,
      totalPages: Math.ceil(totalItems / limit) || 1,
      currentPage: page,
      limit,
    },
  };
};

/**
 * Get any enquiry by ID (Admin only)
 */
export const getEnquiryById = async (enquiryId) => {
  const enquiry = await Enquiry.findById(enquiryId).populate([
    { path: 'userId', select: 'fullName email phone role accountStatus' },
    { path: 'assignedTo', select: 'fullName email phone role' },
    { path: 'notes.adminId', select: 'fullName email phone role' },
    { path: 'customerReplies.adminId', select: 'fullName email role' },
    {
      path: 'items.productId',
      select: 'sku name categoryId description images specifications isFeatured isActive standardPrice',
      populate: { path: 'categoryId', select: 'name slug isActive' },
    },
  ]);

  if (!enquiry) {
    throw new AppError('Enquiry not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  return enquiry;
};

/**
 * Update enquiry status, append internal note history, or assign owner (Admin only)
 */
export const updateEnquiryStatus = async (enquiryId, updateData = {}, adminUserId) => {
  const enquiry = await Enquiry.findById(enquiryId);
  if (!enquiry) {
    throw new AppError('Enquiry not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  const { status, note, adminNote, customerReply, assignedTo } = updateData;
  const oldStatus = enquiry.status;

  // 1. Validate status transition if status is being updated
  if (status && enquiry.status !== status) {
    const currentStatus = enquiry.status;
    const allowedNextStatuses = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
    if (!allowedNextStatuses.includes(status)) {
      throw new AppError(
        `Invalid status transition from '${currentStatus}' to '${status}'`,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.BAD_REQUEST
      );
    }
    enquiry.status = status;
  }

  // 2. Append internal note to notes array if note text is provided
  const noteText = note || adminNote;
  if (noteText && noteText.trim()) {
    if (!Array.isArray(enquiry.notes)) {
      enquiry.notes = [];
    }
    enquiry.notes.push({
      adminId: adminUserId,
      note: noteText.trim(),
      createdAt: new Date(),
    });
  }

  if (customerReply && customerReply.trim()) {
    enquiry.customerReplies.push({ adminId: adminUserId, message: customerReply.trim(), createdAt: new Date() });
  }

  // 3. Update assignedTo admin reference if provided
  if (assignedTo) {
    const adminUser = await User.findById(assignedTo);
    if (!adminUser) {
      throw new AppError('Assigned admin user not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
    }
    if (adminUser.role !== 'admin') {
      throw new AppError('Assigned user must have admin role', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
    }
    enquiry.assignedTo = assignedTo;
  }

  await enquiry.save();

  // 4. Attempt WhatsApp status update notification (Isolated operation; does not throw if fails)
  if (status && oldStatus !== status) {
    try {
      await whatsAppService.sendEnquiryStatusUpdatedNotification(enquiry, oldStatus, status);
    } catch (err) {
      console.error('[EnquiryService] WhatsApp status update notification failed silently:', err.message);
    }
  }

  return await enquiry.populate([

    { path: 'userId', select: 'fullName email phone role accountStatus' },
    { path: 'assignedTo', select: 'fullName email phone role' },
    { path: 'notes.adminId', select: 'fullName email phone role' },
    { path: 'customerReplies.adminId', select: 'fullName email role' },
    {
      path: 'items.productId',
      select: 'sku name categoryId description images specifications isFeatured isActive standardPrice',
      populate: { path: 'categoryId', select: 'name slug isActive' },
    },
  ]);
};
