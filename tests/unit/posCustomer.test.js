import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import mongoose from '../../backend/node_modules/mongoose/index.js';
import { User } from '../../backend/src/models/User.js';
import { PosSale } from '../../backend/src/models/PosSale.js';
import { PosCustomerOtp } from '../../backend/src/models/PosCustomerOtp.js';
import { posCustomerService } from '../../backend/src/services/posCustomer.service.js';
import { config } from '../../backend/src/config/env.js';
import { getOtpProvider } from '../../backend/src/integrations/otp/index.js';
import { posInput, posAdminId } from '../helpers/posFixture.js';

let users, proofs, previousSale, settings;
const query = lookup => ({ session() { return this; }, sort() { return this; }, lean: async () => lookup(),
  then(resolve, reject) { return Promise.resolve(lookup()).then(resolve, reject); } });
beforeEach(() => {
  users = new Map(); proofs = new Map(); previousSale = null;
  settings = { mockOtpEnabled: config.mockOtpEnabled, mockOtpCode: config.mockOtpCode, otpMaxAttempts: config.otpMaxAttempts, otpResendCooldownSeconds: config.otpResendCooldownSeconds };
  Object.assign(config, { mockOtpEnabled: true, mockOtpCode: '123456', otpMaxAttempts: 3, otpResendCooldownSeconds: 60 });
  jest.spyOn(User, 'findOne').mockImplementation(filter => query(() => {
    const record = [...users.values()].find(u => filter.phone.$in.includes(u.phone));
    return record ? new User(record) : null;
  }));
  jest.spyOn(PosSale, 'findOne').mockImplementation(() => query(() => previousSale));
  jest.spyOn(User.prototype, 'save').mockImplementation(async function () {
    const error = this.validateSync(); if (error) throw error;
    users.set(String(this._id), JSON.parse(JSON.stringify(this.toObject()))); return this;
  });
  jest.spyOn(PosCustomerOtp, 'findById').mockImplementation(id => query(() => proofs.has(id) ? new PosCustomerOtp(proofs.get(id)) : null));
  jest.spyOn(PosCustomerOtp, 'findOneAndUpdate').mockImplementation(async (filter, update) => {
    const old = proofs.get(filter._id);
    if (filter.$or && old && old.sentAt > filter.$or[0].sentAt.$lte) { const error = new Error('Duplicate key'); error.code = 11000; throw error; }
    if (filter.otpHash && (!old || old.otpHash !== filter.otpHash || old.attempts >= filter.attempts.$lt || old.expiresAt <= filter.expiresAt.$gt)) return null;
    const record = { ...old, ...update.$set, _id: filter._id }; proofs.set(filter._id, record); return new PosCustomerOtp(record);
  });
  jest.spyOn(PosCustomerOtp, 'updateOne').mockImplementation(async (filter, update) => { const record = proofs.get(filter._id); if (record?.otpHash === filter.otpHash) record.attempts += update.$inc.attempts; });
  jest.spyOn(PosCustomerOtp, 'deleteOne').mockImplementation(filter => query(() => { proofs.delete(filter._id); return { deletedCount: 1 }; }));
  jest.spyOn(mongoose, 'startSession').mockImplementation(async () => ({
    endSession: async () => {}, withTransaction: async task => {
      const oldUsers = structuredClone(users), oldProofs = structuredClone(proofs);
      try { await task(); } catch (error) { users = oldUsers; proofs = oldProofs; throw error; }
    },
  }));
});
afterEach(() => { Object.assign(config, settings); jest.restoreAllMocks(); });

describe('POS customer verification and directory persistence', () => {
  test('a new number cannot be saved without successful OTP verification', async () => {
    const input = posInput().customer;
    expect(await posCustomerService.lookup(input.phone, posAdminId)).toMatchObject({ found: false, needsVerification: true });
    await expect(posCustomerService.save(input, posAdminId)).rejects.toMatchObject({ statusCode: 403 });
    expect(users.size).toBe(0);
    await posCustomerService.sendOtp(input.phone, posAdminId);
    await expect(posCustomerService.save(input, posAdminId)).rejects.toMatchObject({ statusCode: 403 });
  });
  test('OTP creates one real customer, consumes proof, and saves reusable billing details', async () => {
    const input = posInput().customer;
    await posCustomerService.sendOtp(`+91${input.phone}`, posAdminId);
    await posCustomerService.verifyOtp(input.phone, '123456', posAdminId);
    const saved = await posCustomerService.save(input, posAdminId);
    const account = [...users.values()][0];
    expect(account).toMatchObject({ role: 'customer', createdVia: 'pos', isPhoneVerified: true, fullName: input.name, phone: input.phone });
    expect(account.email).toBeUndefined(); expect(account.posBillingProfile.city).toBe('Kota');
    expect(account.savedAddresses[0]).toMatchObject({ line1: input.address, pincode: '324005', isDefault: true });
    expect(proofs.size).toBe(0);
    expect(saved.customer).toMatchObject(input);
    const lookup = await posCustomerService.lookup(`91${input.phone}`, posAdminId);
    expect(lookup).toMatchObject({ found: true, needsVerification: false, customer: input });
    await posCustomerService.save({ ...input, address: 'Updated street', whatsappNumber: '8769959424' }, posAdminId);
    expect(users.size).toBe(1);
    expect((await posCustomerService.lookup(input.phone, posAdminId)).customer).toMatchObject({ address: 'Updated street', whatsappNumber: '8769959424' });
  });
  test('existing customer accounts bypass OTP and missing address fields can be completed', async () => {
    const customer = new User({ _id: '507f1f77bcf86cd799439025', fullName: 'Existing Customer', email: 'existing@example.com', phone: '9876543210', role: 'customer', isPhoneVerified: true, accountStatus: 'active', status: 'active' });
    users.set(String(customer._id), JSON.parse(JSON.stringify(customer)));
    expect((await posCustomerService.lookup(customer.phone, posAdminId)).customer.city).toBe('');
    await posCustomerService.save({ ...posInput().customer, email: customer.email }, posAdminId);
    expect((await posCustomerService.lookup(customer.phone, posAdminId)).customer.city).toBe('Kota');
    expect(proofs.size).toBe(0); expect(users.size).toBe(1);
  });
  test('proof is bound to the admin and phone, expires, and is limited to three attempts', async () => {
    const phone = posInput().customer.phone;
    await posCustomerService.sendOtp(phone, posAdminId);
    await expect(posCustomerService.verifyOtp(phone, '123456', '507f1f77bcf86cd799439099')).rejects.toThrow('missing');
    for (let i = 0; i < 3; i++) await expect(posCustomerService.verifyOtp(phone, '000000', posAdminId)).rejects.toThrow('Incorrect OTP');
    await expect(posCustomerService.verifyOtp(phone, '123456', posAdminId)).rejects.toMatchObject({ statusCode: 429 });
    const record = [...proofs.values()][0]; record.attempts = 0; record.expiresAt = new Date(0);
    await expect(posCustomerService.verifyOtp(phone, '123456', posAdminId)).rejects.toThrow('expired');
    await expect(posCustomerService.save(posInput().customer, posAdminId)).rejects.toMatchObject({ statusCode: 403 });
  });
  test('OTP resend cooldown is enforced, including mock mode', async () => {
    const phone = posInput().customer.phone;
    await posCustomerService.sendOtp(phone, posAdminId);
    await expect(posCustomerService.sendOtp(phone, posAdminId)).rejects.toMatchObject({ statusCode: 429 });
  });
  test('live mode uses the configured SMS provider and never returns an OTP', async () => {
    config.mockOtpEnabled = false;
    const provider = jest.spyOn(getOtpProvider(), 'sendOtp').mockResolvedValue({ success: true });
    const response = await posCustomerService.sendOtp(posInput().customer.phone, posAdminId);
    expect(provider).toHaveBeenCalledWith(expect.objectContaining({ identifier: '9876543210', otp: expect.stringMatching(/^\d{6}$/), purpose: 'pos-customer' }));
    expect(response.mockOtp).toBeUndefined();
  });
  test('legacy POS invoices remain returning customers without falsely asserting OTP verification', async () => {
    previousSale = { customer: posInput().customer };
    expect(await posCustomerService.lookup(previousSale.customer.phone, posAdminId)).toMatchObject({ found: true, needsVerification: false });
    await posCustomerService.save(previousSale.customer, posAdminId);
    expect([...users.values()][0].isPhoneVerified).toBe(false);
  });
  test('dealer/admin/blocked numbers cannot be converted to POS customers', async () => {
    for (const role of ['admin', 'dealer', 'customer']) {
      users.clear(); const user = new User({ fullName: 'Other account', email: 'other@example.com', phone: '9876543210', role, accountStatus: role === 'customer' ? 'blocked' : 'active' });
      users.set(String(user._id), JSON.parse(JSON.stringify(user)));
      await expect(posCustomerService.lookup(user.phone, posAdminId)).rejects.toMatchObject({ statusCode: role === 'customer' ? 403 : 409 });
    }
  });
  test('email remains required for normal signup records', () => {
    expect(new User({ fullName: 'Customer', phone: '9876543210' }).validateSync().errors.email).toBeDefined();
    for (const role of ['admin', 'dealer']) expect(new User({ fullName: 'Other account', role, createdVia: 'pos' }).validateSync().errors.email).toBeDefined();
  });
});
