import { deliveryNoteService } from '../services/deliveryNote.service.js';
import { isSuperAdmin, canAdmin } from '../../../shared/adminAccess.js';
import { AppError } from '../utils/AppError.js';
import { activeVariants, hasVariants, selectedVariantProduct, productLineKey } from '../../../shared/productVariants.js';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { posService } from '../services/pos.service.js';
import { posCustomerService } from '../services/posCustomer.service.js';
import { generatePosInvoice } from '../services/posInvoice.service.js';
import { generatePosRegisterPdf } from '../services/posRegisterPdf.service.js';
import { generatePosExport } from '../services/posExport.service.js';
import { Product } from '../models/Product.js';
import { Enquiry } from '../models/Enquiry.js';
import { PosSale } from '../models/PosSale.js';
import { posSaleSchema, posSellerSchema, posListSchema, paymentSchema, returnSchema, customerSchema, invoiceEditSchema, deliveryNoteInvoiceSchema } from '../validators/pos.validator.js';

export const requireReturnSuperAdmin = (req, res, next) => isSuperAdmin(req.user) ? next() : next(new AppError('Only super admins can edit invoices or record sale returns and refunds.', 403, 'FORBIDDEN'));
const router = Router();
router.use(authenticate, authorize('admin'));
const requireOrderAccess = asyncHandler(async (req, res, next) => {
  if (req.body.sourceEnquiryId) {
    const access = req.user.isEmployee ? { role: 'admin', ...req.adminAccess } : req.user;
    const order = await Enquiry.findById(req.body.sourceEnquiryId).select('source userType').lean();
    const section = order?.source === 'whatsapp' ? 'whatsapp-orders' : `enquiries-${order?.userType === 'dealer' ? 'dealers' : 'customers'}`;
    if (!canAdmin(access, section, 'read')) throw new AppError('Read access to this order is required.', 403, 'FORBIDDEN');
  }
  next();
});
const reply = (res, data, message = 'Success') => ApiResponse.success(res, message, data);
const idSchema = { params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) }) };
const searchSchema = { query: z.object({ search: z.string().trim().max(150).default('') }) };
const escapedRegex = text => new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
const billTypeSchema = z.enum(['b2b', 'b2c']).default('b2c');
const customerQuery = z.object({ billType: billTypeSchema });
const phoneSchema = z.string().trim().min(10).max(20);
router.get('/customer', validate({ query: z.object({ phone: phoneSchema, billType: billTypeSchema }) }), asyncHandler(async (req, res) => reply(res, await posCustomerService.lookup(req.query.phone, req.user._id, req.query.billType))));
router.post('/customer/otp', validate({ body: z.object({ phone: phoneSchema, billType: billTypeSchema }) }), asyncHandler(async (req, res) => reply(res, await posCustomerService.sendOtp(req.body.phone, req.user._id, req.body.billType), 'Verification code sent.')));
router.post('/customer/verify', validate({ body: z.object({ phone: phoneSchema, otp: z.string().regex(/^\d{6}$/) }) }), asyncHandler(async (req, res) => reply(res, await posCustomerService.verifyOtp(req.body.phone, req.body.otp, req.user._id), 'Phone number verified.')));
router.put('/customer', validate({ body: customerSchema, query: customerQuery }), asyncHandler(async (req, res) => reply(res, await posCustomerService.save(req.body, req.user._id, req.query.billType), 'Customer details saved to the customer list.')));

router.get('/settings', asyncHandler(async (_req, res) => reply(res, await posService.getSettings())));
router.put('/settings', validate({ body: posSellerSchema }), asyncHandler(async (req, res) => reply(res, await posService.updateSettings(req.body, req.user._id))));
router.get('/products', validate(searchSchema), asyncHandler(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.search) filter.$or = ['name', 'sku', 'modelNumber', 'variants.name', 'variants.sku'].map(key => ({ [key]: escapedRegex(req.query.search) }));
  const products = await Product.find(filter).select('name sku modelNumber hsnCode standardPrice dealerPrice stockQuantity images specifications variants').sort({ name: 1 }).limit(40).lean();
  reply(res, products.flatMap(product => hasVariants(product) ? activeVariants(product).map(option => ({ ...selectedVariantProduct(product, option._id), dealerPrice: option.dealerPrice > 0 ? option.dealerPrice : option.standardPrice, lineKey: productLineKey(product._id, option._id) })) : [product]));
}));
router.get('/customers', validate(searchSchema), asyncHandler(async (req, res) => {
  if (req.query.search.length < 2) return reply(res, []);
  const regex = escapedRegex(req.query.search);
  const records = await PosSale.aggregate([{ $match: { $or: [{ 'customer.name': regex }, { 'customer.phone': regex }] } },
    { $sort: { createdAt: -1 } }, { $group: { _id: '$customer.phone', customer: { $first: '$customer' } } }, { $limit: 8 }]);
  reply(res, records.map(r => r.customer));
}));
router.get('/held', asyncHandler(async (req, res) => reply(res, await posService.listHeld(req.user._id))));
router.post('/held', validate({ body: z.object({ label: z.string().trim().min(1).max(100), draft: z.object({ documentType: z.enum(['invoice', 'delivery-note']).default('invoice'), dueDate: z.string().optional(), deliveryNoteDate: z.string().optional(), dispatchDetails: z.object({ date: z.string() }).optional(), sourceEnquiryId: z.string().regex(/^[a-f\d]{24}$/i).optional(), billType: z.enum(['b2b', 'b2c']).default('b2c'), requestId: z.string().uuid(), customer: z.record(z.unknown()), shipping: z.record(z.unknown()).optional(), delivery: z.record(z.unknown()), items: z.array(z.record(z.unknown())).max(100), taxMode: z.enum(['inclusive', 'exclusive']), roundOff: z.boolean(), notes: z.string().max(1000).default('') }) }) }),
  asyncHandler(async (req, res) => reply(res, await posService.holdBill(req.body.draft, req.body.label, req.user._id))));
router.delete('/held/:id', validate(idSchema), asyncHandler(async (req, res) => reply(res, await posService.removeHeld(req.params.id, req.user._id))));
router.get('/account-balances/:id', requireReturnSuperAdmin, validate(idSchema), asyncHandler(async (req, res) => { res.set('Cache-Control', 'private, no-store'); reply(res, await deliveryNoteService.balance(req.params.id)); }));
router.get('/delivery-notes/:id', validate(idSchema), asyncHandler(async (req, res) => { res.set('Cache-Control', 'private, no-store'); reply(res, await deliveryNoteService.get(req.params.id)); }));
router.post('/delivery-notes/invoice', requireReturnSuperAdmin, validate({ body: deliveryNoteInvoiceSchema }), asyncHandler(async (req, res) => reply(res, await deliveryNoteService.invoice(req.body, req.user._id))));
router.get('/sales/export/pdf', validate({ query: posListSchema }), asyncHandler(async (req, res) => {
  const filters = { ...req.query, documentType: 'invoice' };
  const buffer = await generatePosRegisterPdf(await posService.exportSales(filters), filters);
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="vinexus-sales-register.pdf"', 'Cache-Control': 'private, no-store' });
  res.send(buffer);
}));
router.get('/sales/export', validate({ query: posListSchema }), asyncHandler(async (req, res) => {
  const buffer = await generatePosExport(await posService.exportSales(req.query));
  res.set({ 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename="vinexus-offline-sales.xlsx"' });
  res.send(Buffer.from(buffer));
}));
router.get('/sales', validate({ query: posListSchema }), asyncHandler(async (req, res) => reply(res, await posService.listSales(req.query))));
router.post('/sales/validate', validate({ body: posSaleSchema }), requireOrderAccess, asyncHandler(async (req, res) => reply(res, await posService.validateSale(req.body, req.user._id))));
router.post('/sales', validate({ body: posSaleSchema }), requireOrderAccess, asyncHandler(async (req, res) => reply(res, await posService.createSale(req.body, req.user._id), 'Sale completed and stock updated.')));
router.get('/sales/:id', validate(idSchema), asyncHandler(async (req, res) => reply(res, await posService.getSale(req.params.id))));
router.put('/sales/:id', requireReturnSuperAdmin, validate({ ...idSchema, body: invoiceEditSchema }), asyncHandler(async (req, res) => reply(res, await posService.editSale(req.params.id, req.body, req.user._id), 'Invoice details updated.')));
router.get('/sales/:id/invoice', validate(idSchema), asyncHandler(async (req, res) => {
  const sale = await posService.getSale(req.params.id);
  if (sale.documentType === 'delivery-note' && sale.invoiceId) { const invoice = await posService.getSale(sale.invoiceId); sale.linkedInvoiceNumber = invoice.invoiceNumber; sale.linkedInvoiceBalance = invoice.balanceDue; }
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${sale.invoiceNumber.replaceAll('/', '-')}.pdf"`, 'Cache-Control': 'private, no-store' });
  res.send(await generatePosInvoice(sale));
}));
router.post('/sales/:id/payments', validate({ ...idSchema, body: paymentSchema }), asyncHandler(async (req, res) => reply(res, await posService.addPayment(req.params.id, req.body, req.user._id))));
router.post('/sales/:id/refunds', requireReturnSuperAdmin, validate({ ...idSchema, body: paymentSchema }), asyncHandler(async (req, res) => reply(res, await posService.addPayment(req.params.id, req.body, req.user._id, true))));
router.post('/sales/:id/returns', requireReturnSuperAdmin, validate({ ...idSchema, body: returnSchema }), asyncHandler(async (req, res) => reply(res, await posService.returnItems(req.params.id, req.body, req.user._id))));
router.post('/sales/:id/void', validate({ ...idSchema, body: z.object({ reason: z.string().trim().min(3).max(500) }) }), asyncHandler(async (req, res) => reply(res, await posService.voidSale(req.params.id, req.body.reason, req.user._id))));

export default router;
