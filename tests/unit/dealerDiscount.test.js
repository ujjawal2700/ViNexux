import { afterEach, expect, jest, test } from '@jest/globals';
import mongoose from '../../backend/node_modules/mongoose/index.js';
import { DealerProfile } from '../../backend/src/models/DealerProfile.js';
import { User } from '../../backend/src/models/User.js';
import { Session } from '../../backend/src/models/Session.js';
import { approveDealerKyc } from '../../backend/src/services/dealer.service.js';
import { approveKyc } from '../../backend/src/controllers/adminDealer.controller.js';
import { whatsAppService } from '../../backend/src/services/whatsapp/whatsapp.service.js';
import { adminApproveKycSchema, updateDealerProfileSchema } from '../../backend/src/validators/dealer.validator.js';
import { accountBody } from '../../backend/src/services/adminAccount.service.js';
import { applyDealerDiscount } from '../../shared/dealerDiscount.js';
const id = '507f1f77bcf86cd799439011';
afterEach(() => jest.restoreAllMocks());
test('private percentage is excluded from ordinary queries and new self-service profiles', () => {
  expect(DealerProfile.schema.path('dealerDiscountPercent').options.select).toBe(false);
  expect(new DealerProfile({ userId: id, companyName: 'Dealer' }).toJSON()).not.toHaveProperty('dealerDiscountPercent');
  expect(updateDealerProfileSchema.body.parse({ companyName: 'Dealer', dealerDiscountPercent: 99 })).not.toHaveProperty('dealerDiscountPercent');
});
test('approval and account edits validate finite percentages with at most two decimals', () => {
  for (const dealerDiscountPercent of [-1, 101, Infinity, NaN, '3', 3.123]) {
    expect(adminApproveKycSchema.body.safeParse({ dealerDiscountPercent }).success).toBe(false);
    expect(accountBody('dealer').shape.dealerDiscountPercent.safeParse(dealerDiscountPercent).success).toBe(false);
  }
  for (const dealerDiscountPercent of [0, 3, 3.25, 100]) expect(adminApproveKycSchema.body.parse({ dealerDiscountPercent })).toEqual({ dealerDiscountPercent });
  expect(applyDealerDiscount(99.99, 3)).toBe(96.99);
  expect(applyDealerDiscount(100, 100)).toBe(0);
});
test('employees cannot inject a discount through KYC approval', async () => {
  const next = jest.fn();
  approveKyc({ user: { _id: id, role: 'admin', isEmployee: true }, body: { dealerDiscountPercent: 3 }, params: { id } }, {}, next);
  await new Promise(resolve => setImmediate(resolve));
  expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
});
test('discount and KYC approval commit together in the same transaction', async () => {
  const profile = { _id: id, userId: id, status: 'pending', save: jest.fn(), $session: jest.fn(), set: jest.fn(), populate: jest.fn() };
  profile.populate.mockResolvedValue(profile);
  const user = { _id: id, role: 'dealer', save: jest.fn() };
  const session = {};
  jest.spyOn(mongoose.connection, 'transaction').mockImplementation(fn => fn(session));
  jest.spyOn(DealerProfile, 'findById').mockReturnValue({ select() { return this; }, session: async () => profile });
  jest.spyOn(User, 'findById').mockReturnValue({ session: async () => user });
  jest.spyOn(Session, 'updateMany').mockResolvedValue({});
  jest.spyOn(whatsAppService, 'sendDealerKycApprovedNotification').mockResolvedValue({});
  await approveDealerKyc(id, id, 3);
  expect(profile).toMatchObject({ status: 'approved', dealerDiscountPercent: 3, kycVerifiedBy: id });
  expect(profile.save).toHaveBeenCalledWith({ session });
});
