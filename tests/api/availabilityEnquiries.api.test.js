import { beforeEach, afterEach, expect, jest, test } from '@jest/globals';
import express from '../../backend/node_modules/express/index.js';
import mongoose from '../../backend/node_modules/mongoose/index.js';
import supertest from 'supertest';
import { User } from '../../backend/src/models/User.js';
import { Product } from '../../backend/src/models/Product.js';
import { Category } from '../../backend/src/models/Category.js';
import { Cart } from '../../backend/src/models/Cart.js';
import { Enquiry } from '../../backend/src/models/Enquiry.js';
import { pushService } from '../../backend/src/services/push/push.service.js';
import { whatsAppService } from '../../backend/src/services/whatsapp/whatsapp.service.js';
import { createAvailability, sendCustomerMessage, readCustomerReplies, changeEnquiryStatus } from '../../backend/src/controllers/enquiry.controller.js';
import { availabilityEnquirySchema, customerEnquiryMessageSchema, readEnquiryRepliesSchema, adminUpdateEnquiryStatusSchema } from '../../backend/src/validators/enquiry.validator.js';
import { assertQuantityAvailable, addToCart } from '../../backend/src/services/cart.service.js';
import { validate } from '../../backend/src/middlewares/validate.js';
import { errorHandler } from '../../backend/src/middlewares/errorHandler.js';
const id = '507f1f77bcf86cd799439011', productId = '507f1f77bcf86cd799439012', otherId = '507f1f77bcf86cd799439013';
let request, stored, product;
beforeEach(() => {
  stored = null;
  product = { _id: productId, name: 'Unavailable Camera', categoryId: id, isActive: true, stockQuantity: 0, stockStatus: 'out-of-stock', images: [], variants: [] };
  jest.spyOn(User, 'findById').mockResolvedValue({ _id: id, fullName: 'Customer', role: 'customer', email: 'customer@example.test', phone: '9876543210' });
  jest.spyOn(Product, 'find').mockImplementation(async () => [product]);
  jest.spyOn(Product, 'findOneAndUpdate').mockResolvedValue(null);
  jest.spyOn(Product, 'findById').mockImplementation(async () => product);
  jest.spyOn(Category, 'findById').mockResolvedValue({ _id: id, isActive: true });
  jest.spyOn(Cart.prototype, 'save').mockResolvedValue({});
  jest.spyOn(Category, 'find').mockReturnValue({ select: () => ({ lean: async () => [{ _id: id, isActive: true }] }) });
  jest.spyOn(Cart, 'findOne').mockResolvedValue(null);
  jest.spyOn(Enquiry, 'create').mockImplementation(async data => { stored = new Enquiry({ ...data, _id: id }); await stored.validate(); return stored; });
  jest.spyOn(Enquiry, 'findOne').mockImplementation(filter => {
    const value = filter.userId ? (stored && String(filter.userId) === String(stored.userId) ? stored : null) : null;
    return { sort: () => ({ lean: async () => null }), lean: async () => null, select: async () => value };
  });
  jest.spyOn(Enquiry, 'findById').mockImplementation(() => ({ session: async () => stored }));
  jest.spyOn(Enquiry, 'findOneAndUpdate').mockImplementation(filter => ({ select: async () => {
    if (!stored || String(filter.userId) !== String(stored.userId)) return null;
    stored.customerMessages.push({ message: filter._message || 'Follow-up question' }); return stored;
  } }));
  jest.spyOn(Enquiry, 'updateOne').mockResolvedValue({ modifiedCount: 1 });
  jest.spyOn(Enquiry.prototype, 'save').mockImplementation(async function () { await this.validate(); return this; });
  jest.spyOn(Enquiry.prototype, 'populate').mockImplementation(async function () { return this; });
  jest.spyOn(mongoose, 'startSession').mockResolvedValue({ withTransaction: async fn => fn(), endSession: async () => {} });
  jest.spyOn(pushService, 'sendToUser').mockResolvedValue({ success: true, sent: 1 });
  jest.spyOn(whatsAppService, 'sendEnquiryStatusUpdatedNotification').mockResolvedValue({});
  const app = express(); app.use(express.json());
  app.use((req, res, next) => { if (!req.headers['x-user']) return res.sendStatus(401); req.user = { _id: req.headers['x-user'] }; next(); });
  app.post('/availability', validate(availabilityEnquirySchema), createAvailability);
  app.post('/:id/messages', validate(customerEnquiryMessageSchema), sendCustomerMessage);
  app.post('/:id/read', validate(readEnquiryRepliesSchema), readCustomerReplies);
  app.put('/:id', validate(adminUpdateEnquiryStatusSchema), changeEnquiryStatus);
  app.use(errorHandler); request = supertest(app);
});
afterEach(() => jest.restoreAllMocks());
const create = body => request.post('/availability').set('x-user', id).send({ productId, message: 'When will this camera return?', ...body });

test('out-of-stock enquiry requires only description and snapshots the account without using the cart', async () => {
  const result = await create();
  expect(result.status).toBe(201);
  expect(result.body.data.enquiry.enquiryType).toBe('out-of-stock');
  expect(result.body.data.enquiry.message).toBe('When will this camera return?');
  expect(result.body.data.enquiry.contactName).toBe('Customer');
  expect(Cart.findOne).not.toHaveBeenCalled();
});
test('blank descriptions, forged fields, unavailable variants and in-stock availability requests are rejected', async () => {
  expect((await create({ message: '  ' })).status).toBe(400);
  expect((await create({ enquiryType: 'order' })).status).toBe(400);
  expect((await create({ variantId: otherId })).status).toBe(400);
  product.stockStatus = 'in-stock'; product.stockQuantity = 5;
  expect((await create()).status).toBe(409);
  expect(stored).toBeNull();
});
test('cart stock enforcement blocks zero stock and manually flagged out-of-stock products', () => {
  expect(() => assertQuantityAvailable(product, 1)).toThrow('out of stock');
  expect(() => assertQuantityAvailable({ ...product, stockQuantity: 10 }, 1)).toThrow('out of stock');
  expect(() => assertQuantityAvailable({ ...product, stockQuantity: 1, stockStatus: 'in-stock' }, 1)).not.toThrow();
});
test('admin response is saved before push delivery and availability completion never deducts stock', async () => {
  await create();
  const result = await request.put(`/${id}`).set('x-user', otherId).send({ status: 'in-progress', customerReply: 'Restocking next week.' });
  expect(result.status).toBe(200);
  expect(stored.customerReplies[0].message).toBe('Restocking next week.');
  expect(pushService.sendToUser).toHaveBeenCalledWith(stored.userId, expect.objectContaining({ data: expect.objectContaining({ type: 'enquiry-reply', link: `/account/enquiries/${id}`, sound: 'default' }) }));
  expect(Enquiry.prototype.save.mock.invocationCallOrder[0]).toBeLessThan(pushService.sendToUser.mock.invocationCallOrder[0]);
  expect((await request.put(`/${id}`).set('x-user', otherId).send({ status: 'completed' })).status).toBe(200);
  expect(Product.findOneAndUpdate).not.toHaveBeenCalled();
});
test('customer messages and read receipts are owner-only and cannot write internal notes', async () => {
  await create();
  expect((await request.post(`/${id}/messages`).set('x-user', otherId).send({ message: 'wrong owner' })).status).toBe(404);
  expect((await request.post(`/${id}/read`).set('x-user', otherId).send({ replyCount: 1 })).status).toBe(404);
  expect((await request.post(`/${id}/messages`).set('x-user', id).send({ message: 'Follow-up question' })).status).toBe(200);
  expect(Enquiry.findOneAndUpdate).toHaveBeenLastCalledWith({ _id: id, userId: id }, expect.objectContaining({ $push: { customerMessages: expect.objectContaining({ message: 'Follow-up question' }) } }), expect.objectContaining({ new: true }));
  expect((await request.post(`/${id}/messages`).set('x-user', id).send({ message: 'Hi', notes: ['forged'] })).status).toBe(400);
  stored.customerReplies.push({ adminId: otherId, message: 'First reply' }, { adminId: otherId, message: 'Second reply' });
  expect((await request.post(`/${id}/read`).set('x-user', id).send({ replyCount: 1 })).status).toBe(200);
  expect(Enquiry.updateOne).toHaveBeenCalledWith({ _id: id, userId: id }, { $max: { lastReadReplyCount: 1 } });
});
test('push failure does not discard a saved admin response', async () => {
  await create(); pushService.sendToUser.mockRejectedValue(new Error('Push unavailable'));
  expect((await request.put(`/${id}`).set('x-user', otherId).send({ customerReply: 'Saved response' })).status).toBe(200);
  expect(stored.customerReplies[0].message).toBe('Saved response');
});


test('direct cart additions reject unavailable products before reading or writing a cart', async () => {
  await expect(addToCart(id, productId, 1)).rejects.toThrow('out of stock');
  expect(Cart.findOne).not.toHaveBeenCalled();
  expect(Cart.prototype.save).not.toHaveBeenCalled();
});
