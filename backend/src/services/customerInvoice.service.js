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

const invoiceFields = 'documentType deliveryNoteNumber deliveryNoteIds invoiceId dueDate dispatchDetails invoiceNumber createdAt updatedAt revisionNumber status total paidAmount balanceDue refundDue items.productId items.variantId items.variantName items.productName items.sku items.modelNumber items.quantity items.returnedQuantity returnedAmount returns.creditNoteNumber returns.items returns.amount returns.reason returns.createdAt refunds.kind refunds.method refunds.amount refunds.reference refunds.creditNoteNumber refunds.createdAt';

export const customerInvoiceService = {
  async list(user, { page = 1, reference } = {}) {
    const owner = invoiceOwnerFilter(user);
    const limit = 20;
    const [invoices, total, selected] = await Promise.all([
      PosSale.find(owner).select(invoiceFields)
        .sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      PosSale.countDocuments(owner),
      reference ? PosSale.findOne({ $and: [owner, { shareToken: reference }] })
        .select(invoiceFields).lean() : null,
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
