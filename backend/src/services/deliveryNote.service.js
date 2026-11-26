import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';
import { PosSale } from '../models/PosSale.js';
import { Enquiry } from '../models/Enquiry.js';
import { invoiceOwnerFilter } from './customerInvoice.service.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { transact, allocateInvoiceNumber, syncPayment, findSale } from './pos.service.js';
import { money, calculatePosBill } from '../../../shared/posBilling.js';
import { productLineKey } from '../../../shared/productVariants.js';
const fail = message => { throw new AppError(message, 409, 'DELIVERY_NOTE_CONFLICT'); };
const totals = ['itemsTotal', 'discountTotal', 'subtotal', 'cgst', 'sgst', 'igst', 'taxTotal', 'roundOffAmount', 'total', 'totalQuantity', 'returnedAmount'];

export const deliveryNoteService = {
  async get(id) {
    const note = await findSale(id, null);
    if (note.documentType !== 'delivery-note') throw new AppError('Delivery note not found.', 404, 'NOT_FOUND');
    const result = note.toObject();
    if (note.invoiceId) result.invoice = (await findSale(note.invoiceId, null)).toObject();
    return result;
  },
  async invoice(input, adminId) {
    const requestId = `delivery-invoice:${input.requestId}`;
    return transact(async session => {
      const replay = await PosSale.findOne({ requestId }).select('+shareToken').session(session);
      if (replay) {
        if ([...replay.deliveryNoteIds].map(String).sort().join(',') !== [...input.noteIds].sort().join(',')) fail('This request was already used for other delivery notes.');
        return replay;
      }
      const notes = [];
      for (const id of input.noteIds) {
        const note = await findSale(id, session);
        if (note.documentType !== 'delivery-note' || note.status !== 'completed' || note.invoiceId) fail('Select active, uninvoiced delivery notes.');
        if (!note.items.some(item => item.quantity > item.returnedQuantity)) fail('A fully returned delivery note cannot be invoiced.');
        notes.push(note);
      }
      const first = notes[0];
      if (notes.some(note => String(note.customerId) !== String(first.customerId) || note.customer.phone !== first.customer.phone || note.customer.gstin !== first.customer.gstin || note.billType !== first.billType || note.taxMode !== first.taxMode || note.interstate !== first.interstate || note.seller.gstin !== first.seller.gstin)) fail('Combine notes for the same customer, GSTIN, seller, bill type and tax treatment.');
      const remainingDocuments = notes.map(note => {
        const remainingItems = note.items.filter(item => item.quantity > (item.returnedQuantity || 0)).map(item => ({ ...item.toObject(),
          quantity: item.quantity - (item.returnedQuantity || 0), returnedQuantity: 0,
          // A quantity-only return does not identify a particular serial. Keep the
          // original serial list on the delivery note rather than guessing here.
          serialNumbers: item.returnedQuantity ? [] : [...item.serialNumbers],
        }));
        const bill = calculatePosBill(remainingItems, { taxMode: note.taxMode, interstate: note.interstate, roundOff: false });
        const total = money(note.total - (note.returnedAmount || 0));
        return { ...bill, total, roundOffAmount: money(total - bill.subtotal - bill.taxTotal), returnedAmount: 0 };
      });
      const items = new Map(), groups = new Map();
      const sum = field => money(remainingDocuments.reduce((value, document) => value + (document[field] || 0), 0));
      for (const document of remainingDocuments) {
        for (const line of document.items) {
          const key = productLineKey(line.productId, line.variantId), item = { ...line, serialNumbers: [...line.serialNumbers] };
          const previous = items.get(key);
          if (previous) {
            if (['unitPrice', 'discountPercent', 'gstRate', 'hsn', 'unit'].some(field => previous[field] !== item[field])) fail('The same product has different rates or tax settings across these notes. Invoice those notes separately.');
            previous.quantity += item.quantity; previous.returnedQuantity += item.returnedQuantity || 0;
            previous.serialNumbers.push(...item.serialNumbers);
            for (const field of ['taxable', 'cgst', 'sgst', 'igst', 'originalAmount', 'discountAmount', 'lineTotal']) previous[field] = money(previous[field] + item[field]);
          } else items.set(key, item);
        }
        for (const group of document.taxGroups) {
          const key = `${group.hsn}:${group.gstRate}`, previous = groups.get(key);
          if (previous) for (const field of ['taxable', 'cgst', 'sgst', 'igst']) previous[field] = money(previous[field] + group[field]);
          else groups.set(key, { ...group });
        }
      }
      if (sum('total') > 100000000) fail('Choose fewer notes to keep the invoice within the supported billing limit.');
      const serials = [...items.values()].flatMap(item => item.serialNumbers);
      if (new Set(serials).size !== serials.length) fail('Duplicate serial numbers exist across the selected delivery notes. Correct the notes before invoicing.');
      const transferred = field => notes.flatMap(note => note[field].map(entry => ({ ...(entry.toObject ? entry.toObject() : entry), requestId: `${note._id}:${entry.requestId}`, reference: `${note.deliveryNoteNumber}${entry.reference ? ` / ${entry.reference}` : ''}`, kind: 'delivery-note-transfer' })));
      const invoice = new PosSale({ requestId, documentType: 'invoice', invoiceNumber: await allocateInvoiceNumber({ ...input, billType: first.billType, documentType: 'invoice' }, first.seller.invoicePrefix, session), shareToken: randomBytes(32).toString('hex'),
        seller: first.seller, customer: first.customer, customerId: first.customerId, shipping: first.shipping, billType: first.billType,
        taxMode: first.taxMode, interstate: first.interstate, roundOff: first.roundOff, ...Object.fromEntries(totals.map(field => [field, sum(field)])),
        items: [...items.values()], taxGroups: [...groups.values()], payments: transferred('payments'), refunds: transferred('refunds'),
        returns: [],
        deliveryNoteIds: notes.map(note => note._id), delivery: { deliveryNote: notes.map(note => note.deliveryNoteNumber).join(', ') },
        dueDate: input.dueDate || notes.map(note => note.dueDate).filter(Boolean).sort()[0],
        notes: `Converted from ${notes.map(note => note.deliveryNoteNumber).join(', ')}. Earlier returns remain in the delivery-note history.`, status: 'completed', createdBy: adminId });
      syncPayment(invoice); await invoice.save({ session });
      for (const note of notes) { note.invoiceId = invoice._id; note.conversionRequestId = input.requestId; await note.save({ session }); }
      // Goods moved on the delivery notes. No product stock writes occur here.
      for (const sourceId of new Set(notes.map(note => String(note.sourceEnquiryId || '')).filter(Boolean))) {
        const source = await Enquiry.findById(sourceId).session(session);
        const pending = await PosSale.exists({ sourceEnquiryId: sourceId, documentType: 'delivery-note', status: 'completed', invoiceId: null }).session(session);
        if (source && !pending && source.status === 'completed') { source.posSaleId = invoice._id; await source.save({ session }); }
      }
      return invoice;
    });
  },
  async balance(userId) {
    if (!mongoose.isValidObjectId(userId)) throw new AppError('Invalid account ID.', 400);
    const user = await User.findById(userId).select('_id role phone isPhoneVerified').lean();
    if (!user || !['customer', 'dealer'].includes(user.role)) throw new AppError('Customer or dealer not found.', 404);
    const match = { $and: [invoiceOwnerFilter(user), { $or: [{ documentType: { $ne: 'delivery-note' } }, { invoiceId: null }] }] };
    const [summary, documents] = await Promise.all([
      PosSale.aggregate([{ $match: match }, { $group: { _id: null, balanceDue: { $sum: '$balanceDue' }, refundDue: { $sum: '$refundDue' }, paidAmount: { $sum: '$paidAmount' }, documentCount: { $sum: 1 } } }]),
      PosSale.find(match).select('documentType billType invoiceNumber deliveryNoteNumber dueDate createdAt total returnedAmount balanceDue refundDue paidAmount status paymentStatus').sort({ createdAt: -1 }).limit(100).lean(),
    ]);
    if (summary[0]) for (const field of ['balanceDue', 'refundDue', 'paidAmount']) summary[0][field] = money(summary[0][field]);
    return { ...(summary[0] || { balanceDue: 0, refundDue: 0, paidAmount: 0, documentCount: 0 }), documents };
  },
};
