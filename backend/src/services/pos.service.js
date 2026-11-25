import { normalizePhoneNumber } from '../utils/phone.util.js';
import { calculatePosReturn } from '../../../shared/posReturns.js';
import { adminArrivalService } from './adminArrival.service.js';
import { resolveVariant, variantStockChange, productLineKey } from '../utils/productVariants.js';
import mongoose from 'mongoose';
import { randomBytes, randomUUID } from 'node:crypto';
import { PosSale, PosCounter, PosSettings, PosHeldBill } from '../models/PosSale.js';
import { Enquiry } from '../models/Enquiry.js';
import { Product } from '../models/Product.js';
import { posCustomerService } from './posCustomer.service.js';
import { AppError } from '../utils/AppError.js';
import { stockUpdate } from '../utils/productStockUpdate.js';
import { posSellerSchema } from '../validators/pos.validator.js';
import { validatePosCustomer } from '../../../shared/posValidation.js';
import { calculatePosBill, financialYear, money, toPaise, POS_SELLER_DEFAULTS } from '../../../shared/posBilling.js';

const fail = (message, status = 400, details = []) => { throw new AppError(message, status, 'VALIDATION_ERROR', details); };
const checkedBill = (input, seller) => {
  const issues = [...validatePosCustomer(input.customer), ...(input.shipping ? validatePosCustomer(input.shipping, 'shipping') : [])];
  const sellerResult = posSellerSchema.safeParse(seller);
  if (!sellerResult.success) issues.push(...sellerResult.error.issues.map(issue => ({ path: `seller.${issue.path.join('.')}`, message: issue.message })));
  if (seller.gstin && !seller.gstin.startsWith(seller.stateCode)) issues.push({ path: 'seller.gstin', message: 'Seller GSTIN must match the GST state code.' });
  if (issues.length) fail('Correct the highlighted billing details before payment.', 400, issues);
  const interstate = input.customer.stateCode !== seller.stateCode;
  const bill = calculatePosBill(input.items, { ...input, interstate });
  if (bill.total > 100000000 || !Number.isSafeInteger(toPaise(bill.total))) fail('Invoice total exceeds the supported billing limit.', 400, [{ path: 'items', message: 'Reduce the bill total to the supported limit.' }]);
  if (input.payments?.length !== 1 || !['cash', 'upi', 'bank'].includes(input.payments[0].method) || !Number.isFinite(input.payments[0].amount) || input.payments[0].amount < 0 || toPaise(input.payments[0].amount) > toPaise(bill.total)) {
    fail('Enter the amount received using Cash, UPI or Bank, between zero and the document total.', 400, [{ path: 'payments.0.amount', message: 'Payment cannot exceed the calculated document total.' }]);
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
  const sale = await PosSale.findById(id).select('+shareToken +revisions').session(session);
  if (!sale) fail('Sale not found.', 404);
  return sale;
};
const restock = async (productId, quantity, session, variantId) => {
  const change = variantId ? variantStockChange(productId, variantId, quantity, { active: false }) : { filter: { _id: productId, 'variants.0': { $exists: false } }, update: stockUpdate(quantity) };
  const product = await Product.findOneAndUpdate(change.filter, change.update, { new: true, runValidators: true, session });
  if (!product) fail('A product has been removed from the catalogue. Restore it before returning its stock.', 409);
};

async function sourceBillOrder(input, session = null) {
  if (!input.sourceEnquiryId) return null;
  const order = await Enquiry.findById(input.sourceEnquiryId).session(session);
  if (!order || order.enquiryType === 'out-of-stock') fail('Billable order not found.', 404);
  if (order.posSaleId) fail('This order has already been billed. Open its existing invoice.', 409);
  if (input.documentType !== 'delivery-note') {
    if (order.stockDeductedAt || order.status === 'completed' || order.deliveryNoteIds?.length) fail('This order was already dispatched. Invoice its delivery notes instead of creating another sale.', 409);
    return order;
  }
  if ((order.stockDeductedAt || order.status === 'completed') && !order.deliveryNoteIds?.length) fail('This order has already been fulfilled.', 409);
  const previous = await PosSale.find({ sourceEnquiryId: order._id, documentType: 'delivery-note', status: 'completed' }).session(session).lean();
  const dispatched = new Map();
  for (const note of previous) for (const item of note.items) {
    const key = productLineKey(item.productId, item.variantId);
    dispatched.set(key, (dispatched.get(key) || 0) + item.quantity - (item.returnedQuantity || 0));
  }
  const ordered = new Map(order.items.map(item => [productLineKey(item.productId, item.variantId), item.quantity]));
  for (const item of input.items) {
    const key = productLineKey(item.productId, item.variantId);
    if (item.quantity > (ordered.get(key) || 0) - (dispatched.get(key) || 0)) fail('Dispatch quantity exceeds the remaining ordered quantity.', 409);
    dispatched.set(key, (dispatched.get(key) || 0) + item.quantity);
  }
  order.$locals.fullyDispatched = [...ordered].every(([key, qty]) => (dispatched.get(key) || 0) >= qty);
  return order;
}

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
    await sourceBillOrder(input);
    const seller = await this.getSettings();
    const { bill } = checkedBill(input, seller, false);
    let customer;
    try { customer = await posCustomerService.lookup(input.customer.phone, adminId, input.billType); }
    catch (error) { fail(error.message, error.statusCode || 400, [{ path: 'customer.phone', message: error.message }]); }
    if (customer.needsVerification) fail('Verify and save the new customer phone number first.', 403, [{ path: 'customer.phone', message: 'Verify this phone by OTP before payment.' }]);
    const products = await Product.find({ _id: { $in: input.items.map(item => item.productId) }, isActive: true }).select('name sku stockQuantity variants').lean();
    const byId = new Map(products.map(product => [String(product._id), product]));
    const issues = input.items.flatMap((item, index) => {
      let product = byId.get(item.productId);
      if (product) { try { product = resolveVariant(product, item.variantId); } catch (error) { return [{ path: `items.${index}.variantId`, message: error.message }]; } }
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
      const sale = await transact(async session => {
        const repeated = await PosSale.findOne({ requestId: input.requestId }).select('+shareToken').session(session);
        if (repeated) return repeated;
        const sourceOrder = await sourceBillOrder(input, session);
        const customer = await posCustomerService.persist(input.customer, adminId, session, input.billType);
        const lines = [];
        for (const item of input.items) {
          const change = item.variantId ? variantStockChange(item.productId, item.variantId, -item.quantity) : {
            filter: { _id: item.productId, isActive: true, 'variants.0': { $exists: false }, stockQuantity: { $gte: item.quantity } }, update: stockUpdate(-item.quantity),
          };
          const saved = await Product.findOneAndUpdate(change.filter, change.update, { new: true, runValidators: true, session });
          const product = saved ? resolveVariant(saved, item.variantId) : null;
          if (!product) fail('Stock changed while the bill was open. Review the product quantity.', 409, [{ path: `items.${lines.length}.quantity`, message: 'The requested quantity is no longer available. Refresh stock and reduce this quantity.' }]);
          lines.push({ ...item, productName: product.name, sku: product.sku, model: product.model || '', modelName: product.model || '', modelNumber: product.modelNumber, variantId: item.variantId || null, variantName: product.variant || '', returnedQuantity: 0 });
        }
        const bill = calculatePosBill(lines, { ...input, interstate });
        if (bill.total !== expectedBill.total) fail('The invoice total changed. Review the bill before retrying.');
        const record = new PosSale({ ...input, ...bill, customer: customer.customer, customerId: customer.user._id,
          seller, shipping: input.shipping || customer.customer, interstate,
          invoiceNumber: await nextNumber(input.documentType === 'delivery-note' ? `${seller.invoicePrefix}-DN` : seller.invoicePrefix, session), shareToken: randomBytes(32).toString('hex'),
          createdBy: adminId, payments: input.payments.filter(p => p.amount > 0).map(p => ({ ...p, createdAt: new Date(), createdBy: adminId })), refunds: [], returnedAmount: 0 });
        if (record.documentType === 'delivery-note') { record.deliveryNoteNumber = record.invoiceNumber; record.deliveryNoteDate ||= record.dispatchDetails?.date || new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10); }
        syncPayment(record);
        await record.save({ session });
        if (sourceOrder) {
          sourceOrder.stockDeductedAt = new Date();
          if (record.documentType === 'delivery-note') {
            sourceOrder.deliveryNoteIds.push(record._id);
            sourceOrder.status = sourceOrder.$locals.fullyDispatched ? 'completed' : 'in-progress';
          } else { sourceOrder.posSaleId = record._id; sourceOrder.status = 'completed'; }
          await sourceOrder.save({ session });
        }
        return record;
      });
      await adminArrivalService.publish(sale, 'sale');
      return sale;
    } catch (error) {
      if (error.code === 11000) {
        const repeated = await PosSale.findOne({ requestId: input.requestId }).select('+shareToken');
        if (repeated) return repeated;
      }
      throw error;
    }
  },
  async getSale(id) { return findSale(id, null); },
  async editSale(id, input, adminId) {
    return transact(async session => {
      const sale = await findSale(id, session);
      if (input.editRequestId && sale.revisions?.some(revision => revision.requestId === input.editRequestId)) return sale;
      if (sale.status !== 'completed') fail('Voided invoices cannot be edited.', 409);
      if (new Date(sale.updatedAt || sale.createdAt).getTime() !== new Date(input.expectedUpdatedAt).getTime()) fail('This invoice changed while you were editing. Reopen it and try again.', 409);
      if (normalizePhoneNumber(input.customer.phone) !== normalizePhoneNumber(sale.customer.phone)) fail('The invoice owner phone cannot be changed.');
      const financialLocked = sale.documentType === 'delivery-note' || sale.deliveryNoteIds?.length || sale.returns.length > 0 || sale.items.some(item => item.returnedQuantity > 0) || sale.refunds.some(refund => refund.kind !== 'invoice-adjustment');
      if (financialLocked && input.items) fail('Invoices with returns or refunds can only have contact details and notes corrected.', 409);
      if (!input.items && (input.customer.state !== sale.customer.state || input.customer.stateCode !== sale.customer.stateCode)) fail('Include the complete bill to change its tax state.');
      const issues = [...validatePosCustomer(input.customer), ...(input.shipping ? validatePosCustomer(input.shipping, 'shipping') : [])];
      if (issues.length) fail('Correct the invoice contact details.', 400, issues);
      const before = JSON.parse(JSON.stringify(Object.fromEntries(['customer', 'shipping', 'items', 'total', 'subtotal', 'taxTotal', 'taxGroups', 'taxMode', 'interstate', 'roundOff', 'billType', 'delivery', 'notes'].map(key => [key, sale[key]]))));
      if (input.items) {
        const oldByKey = new Map(sale.items.map(item => [productLineKey(item.productId, item.variantId), item]));
        const newByKey = new Map(input.items.map(item => [productLineKey(item.productId, item.variantId), item]));
        // Restore removals and reductions; deduct only additional quantities.
        for (const [key, old] of oldByKey) {
          const delta = old.quantity - (newByKey.get(key)?.quantity || 0);
          if (delta > 0) await restock(old.productId, delta, session, old.variantId);
        }
        const lines = [];
        for (const item of input.items) {
          const old = oldByKey.get(productLineKey(item.productId, item.variantId));
          const extra = item.quantity - (old?.quantity || 0);
          let product;
          if (extra > 0) {
            const change = item.variantId ? variantStockChange(item.productId, item.variantId, -extra) : { filter: { _id: item.productId, isActive: true, 'variants.0': { $exists: false }, stockQuantity: { $gte: extra } }, update: stockUpdate(-extra) };
            const saved = await Product.findOneAndUpdate(change.filter, change.update, { new: true, runValidators: true, session });
            if (!saved) fail('Insufficient stock for an edited product. Refresh quantities and retry.', 409);
            product = resolveVariant(saved, item.variantId);
          }
          const snapshot = old || product;
          lines.push({ ...item, productName: old?.productName || product?.name || 'Product', sku: snapshot.sku,
            model: snapshot.model || '', modelName: snapshot.modelName || snapshot.model || '', modelNumber: snapshot.modelNumber,
            variantId: item.variantId || null, variantName: old?.variantName || product?.variant || '', returnedQuantity: 0 });
        }
        const interstate = input.customer.stateCode !== sale.seller.stateCode;
        const taxMode = input.taxMode ?? sale.taxMode, roundOff = input.roundOff ?? sale.roundOff;
        const bill = calculatePosBill(lines, { taxMode, roundOff, interstate });
        if (bill.total > 100000000 || !Number.isSafeInteger(toPaise(bill.total))) fail('Invoice total exceeds the supported billing limit.');
        Object.assign(sale, bill, { taxMode, roundOff, interstate, billType: input.billType || sale.billType });
        syncPayment(sale);
        if (input.settlement) {
          const refund = sale.refundDue > 0, amount = refund ? sale.refundDue : sale.balanceDue;
          if (amount > 0) {
            const entries = refund ? sale.refunds : sale.payments;
            entries.push({ ...input.settlement, amount, requestId: input.editRequestId || randomUUID(), kind: 'invoice-adjustment', createdAt: new Date(), createdBy: adminId });
            sale.markModified(refund ? 'refunds' : 'payments'); syncPayment(sale);
          }
        }
      }
      sale.customer = { ...input.customer, phone: sale.customer.phone };
      sale.shipping = input.shipping || { ...sale.customer };
      sale.notes = input.notes;
      if (input.delivery !== undefined) sale.delivery = input.delivery;
      sale.revisions ||= [];
      sale.revisions.push({ requestId: input.editRequestId, before, afterTotal: sale.total, createdAt: new Date(), createdBy: adminId });
      sale.revisionNumber = (sale.revisionNumber || 0) + 1;
      sale.markModified('revisions');
      await sale.save({ session });
      return sale;
    });
  },
  async getSharedSale(token) {
    if (!/^[a-f\d]{64}$/.test(token)) fail('Invoice not found.', 404);
    const sale = await PosSale.findOne({ shareToken: token });
    if (!sale) fail('Invoice not found.', 404);
    return sale;
  },
  async addPayment(id, payment, adminId, refund = false) {
    return transact(async session => {
      const sale = await findSale(id, session);
      if (sale.invoiceId) fail('This delivery note is invoiced. Record payments and refunds on its linked invoice.', 409);
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
      if (sale.invoiceId || sale.deliveryNoteIds?.length) fail('An invoiced delivery note or linked invoice cannot be voided. Use a return to preserve dispatch and payment history.', 409);
      if (sale.status === 'voided') return sale;
      for (const item of sale.items) {
        const remaining = item.quantity - item.returnedQuantity;
        if (remaining) await restock(item.productId, remaining, session, item.variantId);
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
      if (sale.invoiceId) fail('Record returns on the linked invoice.', 409);
      if (sale.returns.some(r => r.requestId === input.requestId)) return sale;
      if (sale.status !== 'completed') fail('Cannot return items from a voided sale.');
      if (new Set(input.items.map(i => productLineKey(i.productId, i.variantId))).size !== input.items.length) fail('Duplicate return items.');
      const calculation = calculatePosReturn(sale, input.items);
      for (const requested of input.items) {
        const item = sale.items.find(line => productLineKey(line.productId, line.variantId) === productLineKey(requested.productId, requested.variantId));
        if (!item || !Number.isInteger(requested.quantity) || requested.quantity < 1 || requested.quantity > item.quantity - (item.returnedQuantity || 0)) fail('Return quantity exceeds the remaining sold quantity.');
        item.returnedQuantity = (item.returnedQuantity || 0) + requested.quantity;
        await restock(item.productId, requested.quantity, session, item.variantId);
      }
      sale.returnedAmount = calculation.returnedAmount;
      const creditNoteNumber = await nextNumber(sale.seller.invoicePrefix, session, 'CN');
      sale.returns.push({ requestId: input.requestId, reason: input.reason, items: input.items, creditNoteNumber,
        amount: calculation.creditAmount, createdAt: new Date(), createdBy: adminId });
      sale.markModified('returns'); syncPayment(sale);
      // Recording a completed refund is atomic with the return and stock change.
      // Pending refunds stay explicitly due until a separate refund is recorded.
      if (input.refund) {
        const amount = Math.min(calculation.creditAmount, sale.refundDue);
        if (amount > 0) {
          sale.refunds.push({ ...input.refund, amount, requestId: input.requestId, creditNoteNumber,
            createdAt: new Date(), createdBy: adminId });
          sale.markModified('refunds'); syncPayment(sale);
        }
      }
      await sale.save({ session });
      return sale;
    });
  },
  buildFilter(query) {
    const filter = query.documentType === 'delivery-note' ? { documentType: 'delivery-note' } : { documentType: { $ne: 'delivery-note' } };
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
      filter.$or = ['invoiceNumber', 'customer.name', 'customer.phone', 'customer.whatsappNumber', 'items.productName', 'items.sku', 'items.model', 'items.modelName', 'items.modelNumber', 'items.variantName'].map(key => ({ [key]: regex }));
    }
    return filter;
  },
  async salesFilter(query) {
    const filter = this.buildFilter(query);
    if (query.search) {
      // Older invoices did not snapshot model names. Search their linked products too.
      const regex = filter.$or[0].invoiceNumber;
      const products = await Product.find({ $or: ['name', 'sku', 'model', 'modelNumber', 'variants.name', 'variants.sku'].map(key => ({ [key]: regex })) }).select('_id').lean();
      if (products.length) filter.$or.push({ 'items.productId': { $in: products.map(product => product._id) } });
    }
    return filter;
  },
  async listSales(query) {
    const filter = await this.salesFilter(query);
    const [sales, total, summary] = await Promise.all([
      PosSale.find(filter).sort({ createdAt: -1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean(),
      PosSale.countDocuments(filter),
      PosSale.aggregate([{ $match: query.documentType === 'delivery-note' ? { ...filter, invoiceId: null } : filter }, { $group: { _id: null, invoices: { $sum: 1 },
        netSales: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, { $subtract: ['$total', '$returnedAmount'] }, 0] } },
        collected: { $sum: '$paidAmount' }, balance: { $sum: '$balanceDue' }, refundsDue: { $sum: '$refundDue' } } }]),
    ]);
    return { sales, total, page: query.page, pages: Math.ceil(total / query.limit), summary: summary[0] || { invoices: 0, netSales: 0, collected: 0, balance: 0, refundsDue: 0 } };
  },
  async exportSales(query) {
    const filter = await this.salesFilter(query);
    const count = await PosSale.countDocuments(filter);
    if (count > 10000) fail('Choose a narrower date range to export up to 10,000 sales.');
    return PosSale.find(filter).sort({ createdAt: -1 }).lean();
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

export { transact, nextNumber, syncPayment, findSale };
