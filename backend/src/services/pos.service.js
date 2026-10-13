import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';
import { PosSale, PosCounter, PosSettings, PosHeldBill } from '../models/PosSale.js';
import { Product } from '../models/Product.js';
import { posCustomerService } from './posCustomer.service.js';
import { AppError } from '../utils/AppError.js';
import { stockUpdate } from '../utils/productStockUpdate.js';
import { posSellerSchema } from '../validators/pos.validator.js';
import { validatePosCustomer } from '../../../shared/posValidation.js';
import { calculatePosBill, financialYear, money, toPaise, POS_SELLER_DEFAULTS } from '../../../shared/posBilling.js';

const fail = (message, status = 400, details = []) => { throw new AppError(message, status, 'VALIDATION_ERROR', details); };
const checkedBill = (input, seller, requireFullPayment = true) => {
  const issues = [...validatePosCustomer(input.customer), ...(input.shipping ? validatePosCustomer(input.shipping, 'shipping') : [])];
  const sellerResult = posSellerSchema.safeParse(seller);
  if (!sellerResult.success) issues.push(...sellerResult.error.issues.map(issue => ({ path: `seller.${issue.path.join('.')}`, message: issue.message })));
  if (seller.gstin && !seller.gstin.startsWith(seller.stateCode)) issues.push({ path: 'seller.gstin', message: 'Seller GSTIN must match the GST state code.' });
  if (issues.length) fail('Correct the highlighted billing details before payment.', 400, issues);
  const interstate = input.customer.stateCode !== seller.stateCode;
  const bill = calculatePosBill(input.items, { ...input, interstate });
  if (bill.total > 100000000 || !Number.isSafeInteger(toPaise(bill.total))) fail('Invoice total exceeds the supported billing limit.', 400, [{ path: 'items', message: 'Reduce the bill total to the supported limit.' }]);
  if (input.payments?.length !== 1 || !['cash', 'upi', 'bank'].includes(input.payments[0].method) || (requireFullPayment && toPaise(input.payments[0].amount) !== toPaise(bill.total))) {
    fail('The full invoice amount must be paid using Cash, UPI or Bank. Credit and split payments are not available.', 400, [{ path: 'payments.0.amount', message: 'Payment must equal the calculated invoice total.' }]);
  }
  return { bill, interstate };
};
const plain = doc => doc.toObject ? doc.toObject() : doc;
const syncPayment = sale => {
  const net = sale.status === 'voided' ? 0 : money(sale.total - sale.returnedAmount);
  sale.paidAmount = money(sale.payments.reduce((sum, p) => sum + p.amount, 0) - sale.refunds.reduce((sum, p) => sum + p.amount, 0));
  sale.balanceDue = Math.max(0, money(net - sale.paidAmount));
  sale.refundDue = Math.max(0, money(sale.paidAmount - net));
  sale.paymentStatus = !sale.balanceDue ? 'paid' : sale.paidAmount > 0 ? 'partial' : 'unpaid';
};
const transact = async operation => {
  const session = await mongoose.startSession();
  let result;
  try { await session.withTransaction(async () => { result = await operation(session); }); }
  finally { await session.endSession(); }
  if (result?.$session) result.$session(null);
  return result;
};
const nextNumber = async (prefix, session, kind = '') => {
  const year = financialYear();
  const counter = await PosCounter.findOneAndUpdate({ _id: `${prefix}/${kind}/${year}` }, { $inc: { sequence: 1 } }, { upsert: true, new: true, session });
  return `${prefix}/${year}/${kind}${String(counter.sequence).padStart(6, '0')}`;
};
const findSale = async (id, session) => {
  if (!mongoose.isValidObjectId(id)) fail('Invalid sale ID.');
  const sale = await PosSale.findById(id).select('+shareToken').session(session);
  if (!sale) fail('Sale not found.', 404);
  return sale;
};
const restock = async (productId, quantity, session) => {
  const product = await Product.findOneAndUpdate({ _id: productId }, stockUpdate(quantity), { new: true, runValidators: true, session });
  if (!product) fail('A product has been removed from the catalogue. Restore it before returning its stock.', 409);
};

export const posService = {
  async getSettings() {
    const record = await PosSettings.findById('primary').lean();
    return { ...POS_SELLER_DEFAULTS, ...record?.seller };
  },
  async updateSettings(seller, adminId) {
    if (!seller.gstin.startsWith(seller.stateCode)) fail('Seller GSTIN must match the state code.');
    await PosSettings.findOneAndUpdate({ _id: 'primary' }, { $set: { seller, updatedBy: adminId } }, { upsert: true, new: true });
    return seller;
  },
  async validateSale(input, adminId) {
    const seller = await this.getSettings();
    const { bill } = checkedBill(input, seller, false);
    let customer;
    try { customer = await posCustomerService.lookup(input.customer.phone, adminId); }
    catch (error) { fail(error.message, error.statusCode || 400, [{ path: 'customer.phone', message: error.message }]); }
    if (customer.needsVerification) fail('Verify and save the new customer phone number first.', 403, [{ path: 'customer.phone', message: 'Verify this phone by OTP before payment.' }]);
    const products = await Product.find({ _id: { $in: input.items.map(item => item.productId) }, isActive: true }).select('name sku stockQuantity').lean();
    const byId = new Map(products.map(product => [String(product._id), product]));
    const issues = input.items.flatMap((item, index) => {
      const product = byId.get(item.productId);
      return !product || product.stockQuantity < item.quantity ? [{ path: `items.${index}.quantity`,
        message: product ? `${product.name} (${product.sku}): only ${product.stockQuantity} units remain in stock.` : 'This product is unavailable. Remove it from the bill.' }] : [];
    });
    if (issues.length) fail('Review the product quantities before payment.', 409, issues);
    return { ready: true, ...bill, seller };
  },
  async createSale(input, adminId) {
    const existing = await PosSale.findOne({ requestId: input.requestId }).select('+shareToken');
    if (existing) return existing;
    const seller = await this.getSettings();
    const { bill: expectedBill, interstate } = checkedBill(input, seller);
    try {
      return await transact(async session => {
        const repeated = await PosSale.findOne({ requestId: input.requestId }).select('+shareToken').session(session);
        if (repeated) return repeated;
        const customer = await posCustomerService.persist(input.customer, adminId, session);
        const lines = [];
        for (const item of input.items) {
          const product = await Product.findOneAndUpdate({ _id: item.productId, isActive: true, stockQuantity: { $gte: item.quantity } },
            stockUpdate(-item.quantity), { new: true, runValidators: true, session });
          if (!product) fail('Stock changed while the bill was open. Review the product quantity.', 409, [{ path: `items.${lines.length}.quantity`, message: 'The requested quantity is no longer available. Refresh stock and reduce this quantity.' }]);
          lines.push({ ...item, productName: product.name, sku: product.sku, modelNumber: product.modelNumber, returnedQuantity: 0 });
        }
        const bill = calculatePosBill(lines, { ...input, interstate });
        if (bill.total !== expectedBill.total) fail('The invoice total changed. Review the bill before retrying.');
        const record = new PosSale({ ...input, ...bill, customer: customer.customer, customerId: customer.user._id,
          seller, shipping: input.shipping || customer.customer, interstate,
          invoiceNumber: await nextNumber(seller.invoicePrefix, session), shareToken: randomBytes(32).toString('hex'),
          createdBy: adminId, payments: input.payments.map(p => ({ ...p, createdAt: new Date(), createdBy: adminId })), refunds: [], returnedAmount: 0 });
        syncPayment(record);
        await record.save({ session });
        return record;
      });
    } catch (error) {
      if (error.code === 11000) {
        const repeated = await PosSale.findOne({ requestId: input.requestId }).select('+shareToken');
        if (repeated) return repeated;
      }
      throw error;
    }
  },
  async getSale(id) { return findSale(id, null); },
  async getSharedSale(token) {
    if (!/^[a-f\d]{64}$/.test(token)) fail('Invoice not found.', 404);
    const sale = await PosSale.findOne({ shareToken: token });
    if (!sale) fail('Invoice not found.', 404);
    return sale;
  },
  async addPayment(id, payment, adminId, refund = false) {
    return transact(async session => {
      const sale = await findSale(id, session);
      const entries = refund ? sale.refunds : sale.payments;
      if (entries.some(p => p.requestId === payment.requestId)) return sale;
      if (!refund && sale.status !== 'completed') fail('Cannot collect payment on a voided sale.');
      syncPayment(sale);
      if (toPaise(payment.amount) > toPaise(refund ? sale.refundDue : sale.balanceDue)) fail(refund ? 'Refund exceeds the amount due to the customer.' : 'Payment exceeds the outstanding balance.');
      entries.push({ ...payment, createdAt: new Date(), createdBy: adminId });
      sale.markModified(refund ? 'refunds' : 'payments');
      syncPayment(sale);
      await sale.save({ session });
      return sale;
    });
  },
  async voidSale(id, reason, adminId) {
    return transact(async session => {
      const sale = await findSale(id, session);
      if (sale.status === 'voided') return sale;
      for (const item of sale.items) {
        const remaining = item.quantity - item.returnedQuantity;
        if (remaining) await restock(item.productId, remaining, session);
      }
      sale.status = 'voided'; sale.voidReason = reason; sale.voidedAt = new Date(); sale.voidedBy = adminId;
      syncPayment(sale);
      await sale.save({ session });
      return sale;
    });
  },
  async returnItems(id, input, adminId) {
    return transact(async session => {
      const sale = await findSale(id, session);
      if (sale.returns.some(r => r.requestId === input.requestId)) return sale;
      if (sale.status !== 'completed') fail('Cannot return items from a voided sale.');
      if (new Set(input.items.map(i => i.productId)).size !== input.items.length) fail('Duplicate return items.');
      const previousAmount = sale.returnedAmount;
      for (const requested of input.items) {
        const item = sale.items.find(line => String(line.productId) === requested.productId);
        if (!item || requested.quantity > item.quantity - item.returnedQuantity) fail('Return quantity exceeds the remaining sold quantity.');
        item.returnedQuantity += requested.quantity;
        await restock(item.productId, requested.quantity, session);
      }
      const allReturned = sale.items.every(i => i.returnedQuantity === i.quantity);
      const unroundedTotal = sale.items.reduce((sum, item) => sum + item.lineTotal, 0);
      sale.returnedAmount = allReturned ? sale.total : Math.min(sale.total, money(sale.items.reduce((sum, i) => sum + money(
        unroundedTotal ? sale.total * i.lineTotal / unroundedTotal * i.returnedQuantity / i.quantity : 0,
      ), 0)));
      sale.returns.push({ ...input, creditNoteNumber: await nextNumber(sale.seller.invoicePrefix, session, 'CN'),
        amount: money(sale.returnedAmount - previousAmount), createdAt: new Date(), createdBy: adminId });
      sale.markModified('returns'); syncPayment(sale);
      await sale.save({ session });
      return sale;
    });
  },
  buildFilter(query) {
    const filter = {};
    if (query.status && query.status !== 'all') filter.status = query.status;
    if (query.paymentStatus && query.paymentStatus !== 'all') filter.paymentStatus = query.paymentStatus;
    if (query.from || query.to) {
      filter.createdAt = {};
      if (query.from) filter.createdAt.$gte = new Date(`${query.from}T00:00:00+05:30`);
      if (query.to) filter.createdAt.$lt = new Date(new Date(`${query.to}T00:00:00+05:30`).getTime() + 86400000);
      if (query.from && query.to && query.from > query.to) fail('Start date must be before the end date.');
    }
    if (query.search) {
      const regex = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = ['invoiceNumber', 'customer.name', 'customer.phone', 'customer.whatsappNumber'].map(key => ({ [key]: regex }));
    }
    return filter;
  },
  async listSales(query) {
    const filter = this.buildFilter(query);
    const [sales, total, summary] = await Promise.all([
      PosSale.find(filter).sort({ createdAt: -1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean(),
      PosSale.countDocuments(filter),
      PosSale.aggregate([{ $match: filter }, { $group: { _id: null, invoices: { $sum: 1 },
        netSales: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, { $subtract: ['$total', '$returnedAmount'] }, 0] } },
        collected: { $sum: '$paidAmount' }, balance: { $sum: '$balanceDue' }, refundsDue: { $sum: '$refundDue' } } }]),
    ]);
    return { sales, total, page: query.page, pages: Math.ceil(total / query.limit), summary: summary[0] || { invoices: 0, netSales: 0, collected: 0, balance: 0, refundsDue: 0 } };
  },
  async exportSales(query) {
    const count = await PosSale.countDocuments(this.buildFilter(query));
    if (count > 10000) fail('Choose a narrower date range to export up to 10,000 sales.');
    return PosSale.find(this.buildFilter(query)).sort({ createdAt: -1 }).lean();
  },
  async listHeld(adminId) { return PosHeldBill.find({ createdBy: adminId }).sort({ updatedAt: -1 }).lean(); },
  async holdBill(draft, label, adminId) {
    if (await PosHeldBill.countDocuments({ createdBy: adminId }) >= 50) fail('Remove or complete a held bill before holding another.');
    return plain(await PosHeldBill.create({ draft, label, createdBy: adminId }));
  },
  async removeHeld(id, adminId) {
    if (!mongoose.isValidObjectId(id)) fail('Invalid held bill ID.');
    await PosHeldBill.deleteOne({ _id: id, createdBy: adminId });
    return { removed: true };
  },
};
