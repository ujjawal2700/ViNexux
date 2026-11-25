import { getProductHsnCode } from '../../../shared/productHsn.js';
import { Enquiry } from '../models/Enquiry.js';
import { PosSale } from '../models/PosSale.js';
import { Product } from '../models/Product.js';
import { posCustomerService } from './posCustomer.service.js';
import { resolveVariant } from '../utils/productVariants.js';
import { productLineKey } from '../../../shared/productVariants.js';
import { INDIA_GST_STATE_CODES } from '../../../shared/indiaGstStates.js';
import { normalizePhoneNumber } from '../utils/phone.util.js';
import { AppError } from '../utils/AppError.js';

// Read-only handoff: preparing a bill never changes the order or reserves stock.
export async function prepareEnquiryBill(id, adminId) {
  const order = await Enquiry.findById(id).lean();
  if (!order || !['whatsapp', 'storefront', undefined].includes(order.source)) throw new AppError('Order not found.', 404, 'NOT_FOUND');
  if (order.enquiryType === 'out-of-stock') throw new AppError('Availability enquiries cannot be sent to billing.', 400, 'VALIDATION_ERROR');
  if (order.posSaleId) return { orderId: String(order._id), orderNumber: order.enquiryNumber, invoiceId: String(order.posSaleId) };
  if ((order.stockDeductedAt || order.status === 'completed') && !order.deliveryNoteIds?.length) throw new AppError('This order has already been fulfilled. Use its existing invoice or create a separate sale.', 409, 'ORDER_FULFILLED');
  if (!order.items?.length) throw new AppError('This order has no products to bill.', 400, 'VALIDATION_ERROR');
  const dispatched = new Map();
  if (order.deliveryNoteIds?.length) {
    const notes = await PosSale.find({ sourceEnquiryId: order._id, documentType: 'delivery-note', status: 'completed' }).lean();
    for (const note of notes) for (const item of note.items) { const key = productLineKey(item.productId, item.variantId); dispatched.set(key, (dispatched.get(key) || 0) + item.quantity - (item.returnedQuantity || 0)); }
  }
  const billType = order.userType === 'dealer' ? 'b2b' : 'b2c';
  const lookup = await posCustomerService.lookup(order.contactPhone, adminId, billType);
  const saved = lookup.customer || {};
  const address = order.deliveryAddress || {};
  const state = address.state || saved.state || '';
  const customer = { ...saved, name: order.contactName || saved.name || '', phone: normalizePhoneNumber(order.contactPhone),
    whatsappNumber: normalizePhoneNumber(order.whatsappNumber || saved.whatsappNumber || order.contactPhone),
    email: order.contactEmail || saved.email || '', address: [address.line1, address.line2].filter(Boolean).join(', ') || saved.address || '',
    city: address.city || saved.city || '', state, stateCode: INDIA_GST_STATE_CODES[state] || '', pincode: address.pincode || saved.pincode || '', gstin: saved.gstin || '' };
  const products = await Product.find({ _id: { $in: order.items.map(item => item.productId) }, isActive: true }).lean();
  const byId = new Map(products.map(product => [String(product._id), product]));
  const lines = new Map();
  for (const originalItem of order.items) {
    const item = { ...originalItem, quantity: originalItem.quantity - (dispatched.get(productLineKey(originalItem.productId, originalItem.variantId)) || 0) };
    if (item.quantity <= 0) continue;
    const original = byId.get(String(item.productId));
    if (!original) throw new AppError(`${item.productName || 'An ordered product'} is unavailable. Restore it before sending this order to billing.`, 409, 'PRODUCT_UNAVAILABLE');
    const product = resolveVariant(original, item.variantId);
    const key = productLineKey(original._id, item.variantId);
    if (lines.has(key)) {
      if (lines.get(key).unitPrice !== item.priceShown) throw new AppError('This order has conflicting prices for the same product. Review the order before billing.', 409, 'PRICE_CONFLICT');
      lines.get(key).quantity += item.quantity; continue;
    }
    lines.set(key, { productId: String(original._id), variantId: item.variantId ? String(item.variantId) : null, variantName: product.variant || item.variantName || '',
      productName: product.name, sku: product.sku, modelNumber: product.modelNumber || '', quantity: item.quantity,
      unitPrice: Number.isFinite(item.priceShown) ? item.priceShown : (billType === 'b2b' ? product.dealerPrice ?? product.standardPrice : product.standardPrice),
      standardPrice: product.standardPrice, dealerPrice: product.dealerPrice ?? product.standardPrice, stockQuantity: product.stockQuantity,
      discountPercent: 0, gstRate: 18, hsn: getProductHsnCode(product), unit: 'NOS', serialNumbers: [], serialInput: '' });
  }
  if (!lines.size && order.deliveryNoteIds?.length) return { orderId: String(order._id), orderNumber: order.enquiryNumber, deliveryNoteId: String(order.deliveryNoteIds[0]) };
  return { orderId: String(order._id), orderNumber: order.enquiryNumber,
    draft: { ...(order.deliveryNoteIds?.length ? { documentType: 'delivery-note' } : {}), sourceEnquiryId: String(order._id), billType, customer, items: [...lines.values()], delivery: {}, taxMode: 'inclusive', roundOff: true, notes: `${order.source === 'whatsapp' ? 'WhatsApp order' : 'Enquiry'} ${order.enquiryNumber}` },
    customerKnown: lookup.found || lookup.verified || false };
}
