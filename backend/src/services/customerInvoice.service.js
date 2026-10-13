import mongoose from 'mongoose';
import { PosSale } from '../models/PosSale.js';
import { normalizePhoneNumber } from '../utils/phone.util.js';
import { AppError } from '../utils/AppError.js';

export function invoiceOwnerFilter(user) {
  const clauses = [{ customerId: user._id }];
  const phone = normalizePhoneNumber(user.phone);
  // Legacy invoices without an account link can belong to a verified phone.
  // Never let a phone match override an invoice's assigned customer account.
  if (user.isPhoneVerified && /^[6-9]\d{9}$/.test(phone)) clauses.push({ customerId: null,
    'customer.phone': { $in: [phone, `91${phone}`, `+91${phone}`] } });
  return { $or: clauses };
}

export const customerInvoiceService = {
  async list(user, { page = 1, reference } = {}) {
    const owner = invoiceOwnerFilter(user);
    const limit = 20;
    const [invoices, total, selected] = await Promise.all([
      PosSale.find(owner).select('invoiceNumber createdAt status total items.productName items.quantity returnedAmount')
        .sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      PosSale.countDocuments(owner),
      reference ? PosSale.findOne({ $and: [owner, { shareToken: reference }] })
        .select('invoiceNumber createdAt status total items.productName items.quantity returnedAmount').lean() : null,
    ]);
    return { invoices, total, page, pages: Math.ceil(total / limit), selected };
  },
  async get(user, id) {
    if (!mongoose.isValidObjectId(id)) throw new AppError('Invoice not found.', 404);
    const sale = await PosSale.findOne({ $and: [invoiceOwnerFilter(user), { _id: id }] });
    if (!sale) throw new AppError('Invoice not found for your account.', 404);
    return sale;
  },
};
