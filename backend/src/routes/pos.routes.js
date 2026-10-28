import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { posService } from '../services/pos.service.js';
import { posCustomerService } from '../services/posCustomer.service.js';
import { generatePosInvoice } from '../services/posInvoice.service.js';
import { generatePosExport } from '../services/posExport.service.js';
import { Product } from '../models/Product.js';
import { PosSale } from '../models/PosSale.js';
import { posSaleSchema, posSellerSchema, posListSchema, paymentSchema, returnSchema, customerSchema } from '../validators/pos.validator.js';

const router = Router();
router.use(authenticate, authorize('admin'));
const reply = (res, data, message = 'Success') => ApiResponse.success(res, message, data);
const idSchema = { params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) }) };
const searchSchema = { query: z.object({ search: z.string().trim().max(150).default('') }) };
const escapedRegex = text => new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
const phoneSchema = z.string().trim().min(10).max(20);
router.get('/customer', validate({ query: z.object({ phone: phoneSchema }) }), asyncHandler(async (req, res) => reply(res, await posCustomerService.lookup(req.query.phone, req.user._id))));
router.post('/customer/otp', validate({ body: z.object({ phone: phoneSchema }) }), asyncHandler(async (req, res) => reply(res, await posCustomerService.sendOtp(req.body.phone, req.user._id), 'Verification code sent.')));
router.post('/customer/verify', validate({ body: z.object({ phone: phoneSchema, otp: z.string().regex(/^\d{6}$/) }) }), asyncHandler(async (req, res) => reply(res, await posCustomerService.verifyOtp(req.body.phone, req.body.otp, req.user._id), 'Phone number verified.')));
router.put('/customer', validate({ body: customerSchema }), asyncHandler(async (req, res) => reply(res, await posCustomerService.save(req.body, req.user._id), 'Customer details saved to the customer list.')));

router.get('/settings', asyncHandler(async (_req, res) => reply(res, await posService.getSettings())));
router.put('/settings', validate({ body: posSellerSchema }), asyncHandler(async (req, res) => reply(res, await posService.updateSettings(req.body, req.user._id))));
router.get('/products', validate(searchSchema), asyncHandler(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.search) filter.$or = ['name', 'sku', 'modelNumber'].map(key => ({ [key]: escapedRegex(req.query.search) }));
  const products = await Product.find(filter).select('name sku modelNumber hsnCode standardPrice dealerPrice stockQuantity images specifications').sort({ name: 1 }).limit(40).lean();
  reply(res, products);
}));
router.get('/customers', validate(searchSchema), asyncHandler(async (req, res) => {
  if (req.query.search.length < 2) return reply(res, []);
  const regex = escapedRegex(req.query.search);
  const records = await PosSale.aggregate([{ $match: { $or: [{ 'customer.name': regex }, { 'customer.phone': regex }] } },
    { $sort: { createdAt: -1 } }, { $group: { _id: '$customer.phone', customer: { $first: '$customer' } } }, { $limit: 8 }]);
  reply(res, records.map(r => r.customer));
}));
router.get('/held', asyncHandler(async (req, res) => reply(res, await posService.listHeld(req.user._id))));
router.post('/held', validate({ body: z.object({ label: z.string().trim().min(1).max(100), draft: z.object({ billType: z.enum(['b2b', 'b2c']).default('b2c'), requestId: z.string().uuid(), customer: z.record(z.unknown()), shipping: z.record(z.unknown()).optional(), delivery: z.record(z.unknown()), items: z.array(z.record(z.unknown())).max(100), taxMode: z.enum(['inclusive', 'exclusive']), roundOff: z.boolean(), notes: z.string().max(1000).default('') }) }) }),
  asyncHandler(async (req, res) => reply(res, await posService.holdBill(req.body.draft, req.body.label, req.user._id))));
router.delete('/held/:id', validate(idSchema), asyncHandler(async (req, res) => reply(res, await posService.removeHeld(req.params.id, req.user._id))));
router.get('/sales/export', validate({ query: posListSchema }), asyncHandler(async (req, res) => {
  const buffer = await generatePosExport(await posService.exportSales(req.query));
  res.set({ 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename="vinexus-offline-sales.xlsx"' });
  res.send(Buffer.from(buffer));
}));
router.get('/sales', validate({ query: posListSchema }), asyncHandler(async (req, res) => reply(res, await posService.listSales(req.query))));
router.post('/sales/validate', validate({ body: posSaleSchema }), asyncHandler(async (req, res) => reply(res, await posService.validateSale(req.body, req.user._id))));
router.post('/sales', validate({ body: posSaleSchema }), asyncHandler(async (req, res) => reply(res, await posService.createSale(req.body, req.user._id), 'Sale completed and stock updated.')));
router.get('/sales/:id', validate(idSchema), asyncHandler(async (req, res) => reply(res, await posService.getSale(req.params.id))));
router.get('/sales/:id/invoice', validate(idSchema), asyncHandler(async (req, res) => {
  const sale = await posService.getSale(req.params.id);
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${sale.invoiceNumber.replaceAll('/', '-')}.pdf"`, 'Cache-Control': 'private, no-store' });
  res.send(await generatePosInvoice(sale));
}));
router.post('/sales/:id/payments', validate({ ...idSchema, body: paymentSchema }), asyncHandler(async (req, res) => reply(res, await posService.addPayment(req.params.id, req.body, req.user._id))));
router.post('/sales/:id/refunds', validate({ ...idSchema, body: paymentSchema }), asyncHandler(async (req, res) => reply(res, await posService.addPayment(req.params.id, req.body, req.user._id, true))));
router.post('/sales/:id/returns', validate({ ...idSchema, body: returnSchema }), asyncHandler(async (req, res) => reply(res, await posService.returnItems(req.params.id, req.body, req.user._id))));
router.post('/sales/:id/void', validate({ ...idSchema, body: z.object({ reason: z.string().trim().min(3).max(500) }) }), asyncHandler(async (req, res) => reply(res, await posService.voidSale(req.params.id, req.body.reason, req.user._id))));

export default router;
