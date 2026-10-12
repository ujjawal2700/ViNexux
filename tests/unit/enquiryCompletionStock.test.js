import { afterEach, describe, expect, jest, test } from '@jest/globals';
import mongoose from '../../backend/node_modules/mongoose/index.js';
import { Enquiry } from '../../backend/src/models/Enquiry.js';
import { Product } from '../../backend/src/models/Product.js';
import { Cart } from '../../backend/src/models/Cart.js';
import { User } from '../../backend/src/models/User.js';
import { Category } from '../../backend/src/models/Category.js';
import { FooterContent } from '../../backend/src/models/FooterContent.js';
import { createEnquiryFromCart, updateEnquiryStatus } from '../../backend/src/services/enquiry.service.js';
import { whatsAppService } from '../../backend/src/services/whatsapp/whatsapp.service.js';
import { emailService } from '../../backend/src/services/email/email.service.js';
import { googleSheetsService } from '../../backend/src/services/googleSheets/googleSheets.service.js';
import { adminUpdateEnquiryStatusSchema } from '../../backend/src/validators/enquiry.validator.js';
import { computeCatalogFields } from '../../backend/src/utils/productCatalogFields.js';

const enquiryId = '507f1f77bcf86cd799439021';
const productId = '507f1f77bcf86cd799439022';
const secondId = '507f1f77bcf86cd799439023';
const adminId = '507f1f77bcf86cd799439024';
const categoryId = '507f1f77bcf86cd799439025';
afterEach(() => jest.restoreAllMocks());

// A transaction test double commits together or restores its initial state.
// All model calls still have to explicitly join the same session.
const setup = ({ status = 'in-progress', items, stock = 10, retry = false } = {}) => {
  let stored = { _id: enquiryId, status, stockDeductedAt: null,
    items: items || [{ productId, productName: 'Camera', quantity: 3 }], notes: [], customerReplies: [] };
  let products = new Map([
    [productId, { stockQuantity: stock, specifications: [{ key: 'Stock', value: '99' }] }],
    [secondId, { stockQuantity: 1, specifications: [] }],
  ]);
  const session = { endSession: jest.fn().mockResolvedValue(undefined) };
  session.withTransaction = jest.fn(async (operation) => {
    const oldEnquiry = structuredClone(stored);
    const oldProducts = structuredClone(products);
    try {
      await operation();
      if (retry) {
        stored = structuredClone(oldEnquiry); products = structuredClone(oldProducts);
        await operation();
      }
    } catch (err) {
      stored = oldEnquiry; products = oldProducts;
      throw err;
    }
  });
  jest.spyOn(mongoose, 'startSession').mockResolvedValue(session);
  jest.spyOn(Enquiry, 'findById').mockImplementation(() => ({ session: async (used) => {
    expect(used).toBe(session);
    const document = structuredClone(stored);
    document.$session = jest.fn();
    document.save = jest.fn(async (options) => {
      expect(options.session).toBe(session);
      const { _id, status, stockDeductedAt, items, notes, customerReplies } = document;
      stored = structuredClone({ _id, status, stockDeductedAt, items, notes, customerReplies });
    });
    document.populate = jest.fn(async () => document);
    return document;
  } }));
  jest.spyOn(Product, 'findOneAndUpdate').mockImplementation(async (filter, update, options) => {
    expect(options.session).toBe(session);
    const product = products.get(filter._id);
    if (!product || product.stockQuantity < filter.stockQuantity.$gte) return null;
    product.stockQuantity += update.$inc.stockQuantity;
    product.specifications = product.specifications.filter((specification) => !update.$pull.specifications.key.test(specification.key));
    return product;
  });
  jest.spyOn(Product, 'findById').mockImplementation((id) => ({ session: async (used) => {
    expect(used).toBe(session);
    return products.get(id) || null;
  } }));
  jest.spyOn(whatsAppService, 'sendEnquiryStatusUpdatedNotification').mockResolvedValue({ success: true });
  return { read: () => stored, stock: (id = productId) => products.get(id), session };
};

describe('Enquiry completion and inventory', () => {
  test.each(['new', 'in-progress', 'completed', 'closed', 'spam'])('the current status API accepts %s', (status) => {
    expect(adminUpdateEnquiryStatusSchema.body.safeParse({ status }).success).toBe(true);
  });
  test('Contacted is removed from the status API', () => {
    expect(adminUpdateEnquiryStatusSchema.body.safeParse({ status: 'contacted' }).success).toBe(false);
  });
  test.each(['closed', 'spam'])('closing an unfulfilled enquiry as %s never touches stock', async (status) => {
    const state = setup({ status: 'new' });
    await updateEnquiryStatus(enquiryId, { status }, adminId);
    expect(state.read().status).toBe(status);
    expect(state.stock().stockQuantity).toBe(10);
    expect(Product.findOneAndUpdate).not.toHaveBeenCalled();
  });
  test('moving New to In Progress does not touch stock', async () => {
    const state = setup({ status: 'new' });
    await updateEnquiryStatus(enquiryId, { status: 'in-progress' }, adminId);
    expect(state.stock().stockQuantity).toBe(10);
    expect(Product.findOneAndUpdate).not.toHaveBeenCalled();
  });
  test('completion deducts each ordered quantity and records a durable marker', async () => {
    const state = setup();
    await updateEnquiryStatus(enquiryId, { status: 'completed' }, adminId);
    expect(state.stock().stockQuantity).toBe(7);
    expect(state.read().status).toBe('completed');
    expect(Number.isFinite(new Date(state.read().stockDeductedAt).getTime())).toBe(true);
    expect(Product.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: productId, stockQuantity: { $gte: 3 } },
      expect.objectContaining({ $inc: { stockQuantity: -3 }, $set: { stockUpdatedAt: expect.any(Date) } }),
      expect.objectContaining({ session: state.session }),
    );
  });
  test('repeated completion, notes, and subsequent closure do not deduct again', async () => {
    const state = setup();
    await updateEnquiryStatus(enquiryId, { status: 'completed' }, adminId);
    await updateEnquiryStatus(enquiryId, { status: 'completed', note: 'Paid' }, adminId);
    await updateEnquiryStatus(enquiryId, { status: 'closed' }, adminId);
    expect(state.stock().stockQuantity).toBe(7);
    expect(Product.findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(state.read().notes[0].note).toBe('Paid');
  });
  test('insufficient stock rolls back every product deduction and the status', async () => {
    const state = setup({ items: [
      { productId, productName: 'Camera', quantity: 3 },
      { productId: secondId, productName: 'Cable', quantity: 2 },
    ] });
    await expect(updateEnquiryStatus(enquiryId, { status: 'completed' }, adminId)).rejects.toThrow('current stock is 1');
    expect(state.stock().stockQuantity).toBe(10);
    expect(state.stock(secondId).stockQuantity).toBe(1);
    expect(state.read().status).toBe('in-progress');
    expect(state.read().stockDeductedAt).toBeNull();
    expect(whatsAppService.sendEnquiryStatusUpdatedNotification).not.toHaveBeenCalled();
    expect(state.session.endSession).toHaveBeenCalled();
  });
  test('transaction retries use fresh records and notify only after commit', async () => {
    const state = setup({ retry: true });
    await updateEnquiryStatus(enquiryId, { status: 'completed' }, adminId);
    expect(state.stock().stockQuantity).toBe(7);
    expect(whatsAppService.sendEnquiryStatusUpdatedNotification).toHaveBeenCalledTimes(1);
  });
  test('a deleted product prevents completion and rolls back other item deductions', async () => {
    const state = setup({ items: [
      { productId, productName: 'Camera', quantity: 3 },
      { productId: '507f1f77bcf86cd799439099', productName: 'Deleted product', quantity: 1 },
    ] });
    await expect(updateEnquiryStatus(enquiryId, { status: 'completed' }, adminId)).rejects.toThrow('removed from the catalog');
    expect(state.stock().stockQuantity).toBe(10);
    expect(state.read().status).toBe('in-progress');
    expect(state.read().stockDeductedAt).toBeNull();
  });
  test('duplicate product lines are combined before checking inventory', async () => {
    const state = setup({ items: [
      { productId, productName: 'Camera', quantity: 2 }, { productId, productName: 'Camera', quantity: 3 },
    ] });
    await updateEnquiryStatus(enquiryId, { status: 'completed' }, adminId);
    expect(state.stock().stockQuantity).toBe(5);
    expect(Product.findOneAndUpdate).toHaveBeenCalledTimes(1);
  });
  test('a depleted product cannot fall back to a stale positive inventory specification', async () => {
    const state = setup({ stock: 3 });
    await updateEnquiryStatus(enquiryId, { status: 'completed' }, adminId);
    expect(computeCatalogFields(state.stock())).toEqual(expect.objectContaining({ stockLevel: 0, stockStatus: 'out-of-stock' }));
  });
  test('historical Completed records are not deducted retrospectively', async () => {
    const state = setup({ status: 'completed' });
    await updateEnquiryStatus(enquiryId, { status: 'completed' }, adminId);
    expect(state.stock().stockQuantity).toBe(10);
    expect(Product.findOneAndUpdate).not.toHaveBeenCalled();
  });
  test('New cannot bypass the In Progress step to complete an order', async () => {
    const state = setup({ status: 'new' });
    await expect(updateEnquiryStatus(enquiryId, { status: 'completed' }, adminId)).rejects.toThrow('Invalid status transition');
    expect(state.read().status).toBe('new');
    expect(Product.findOneAndUpdate).not.toHaveBeenCalled();
  });
});

test('submitting a cart enquiry leaves stock unchanged', async () => {
  const user = { fullName: 'Customer', role: 'customer', email: 'customer@example.com', phone: '9876543210', savedAddresses: { id: () => ({ line1: 'Address', city: 'City', state: 'State', pincode: '110001' }) } };
  const product = { _id: productId, name: 'Camera', sku: 'CAM-1', categoryId, isActive: true, stockQuantity: 10, standardPrice: 100, images: [] };
  const cart = { items: [{ productId, quantity: 3 }], save: jest.fn() };
  const record = { status: 'new', populate: jest.fn().mockImplementation(async () => record), save: jest.fn() };
  jest.spyOn(User, 'findById').mockResolvedValueOnce(user).mockReturnValueOnce({ select: () => ({ lean: async () => ({ role: 'customer' }) }) });
  jest.spyOn(Cart, 'findOne').mockResolvedValue(cart);
  jest.spyOn(Product, 'find').mockResolvedValue([product]);
  jest.spyOn(Category, 'find').mockReturnValue({ select: () => ({ lean: async () => [{ _id: categoryId, isActive: true }] }) });
  jest.spyOn(Enquiry, 'findOne').mockReturnValue({ sort() { return this; }, lean: async () => null });
  jest.spyOn(Enquiry, 'create').mockResolvedValue(record);
  jest.spyOn(FooterContent, 'findOne').mockReturnValue({ lean: async () => null });
  jest.spyOn(emailService, 'sendEmail').mockResolvedValue({ success: true });
  jest.spyOn(googleSheetsService, 'syncEnquiryToSheet').mockResolvedValue({ success: true });
  jest.spyOn(Product, 'findOneAndUpdate').mockRejectedValue(new Error('Unexpected stock update during submission'));
  await createEnquiryFromCart(adminId, { addressId: enquiryId, selectedProductIds: [productId], whatsappNumber: '9876543210' });
  expect(product.stockQuantity).toBe(10);
  expect(Enquiry.create).toHaveBeenCalledWith(expect.objectContaining({ status: 'new' }));
  expect(Product.findOneAndUpdate).not.toHaveBeenCalled();
});
