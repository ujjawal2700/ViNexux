import { afterEach, expect, jest, test } from '@jest/globals';
import { deliverCampaignMessage, processCampaignDelivery } from '../../backend/src/services/campaign.service.js';
import { getPushProvider, setPushProvider } from '../../backend/src/integrations/push/index.js';
import { User } from '../../backend/src/models/User.js';
import { Campaign, CampaignDelivery } from '../../backend/src/models/Campaign.js';
import { AppError } from '../../backend/src/utils/AppError.js';
import { newCampaign } from '../../shared/campaignDesign.js';

const original = getPushProvider();
afterEach(() => { setPushProvider(original); jest.restoreAllMocks(); });
const campaign = () => ({ ...newCampaign('push'), _id: 'campaign', push: { ...newCampaign('push').push, title: 'Launch', body: 'Browse now' } });

test('campaign records preserve Firebase rejection reasons and prune only revoked tokens', async () => {
  const update = jest.spyOn(User, 'updateOne').mockResolvedValue({});
  setPushProvider({ sendToTokens: async () => ({ provider: 'firebase', success: false, successCount: 0, failureCount: 2,
    invalidTokens: ['expired'], failureReasons: ['The browser token belongs to a different Firebase project.'] }) });
  const result = await deliverCampaignMessage(campaign(), { _id: 'customer', fcmTokens: ['wrong-project', 'expired'] });
  expect(result).toMatchObject({ status: 'failed', acceptedDevices: 0, failedDevices: 2, reason: expect.stringContaining('different Firebase project') });
  expect(update).toHaveBeenCalledWith({ _id: 'customer' }, { $pull: { fcmTokens: { $in: ['expired'] } } });
});

test('queued campaign retains sanitized push errors for the admin delivery record', async () => {
  jest.spyOn(CampaignDelivery, 'updateMany').mockResolvedValue({});
  jest.spyOn(CampaignDelivery, 'findOneAndUpdate').mockResolvedValue({ _id: 'job', campaignId: 'campaign', userId: 'customer' });
  jest.spyOn(Campaign, 'findById').mockReturnValue({ lean: async () => campaign() });
  jest.spyOn(Campaign, 'updateOne').mockResolvedValue({});
  jest.spyOn(User, 'findById').mockReturnValue({ lean: async () => ({ _id: 'customer', role: 'customer', accountStatus: 'active', marketingPreferences: { push: true }, fcmTokens: ['browser'] }) });
  jest.spyOn(CampaignDelivery, 'exists').mockResolvedValue(true);
  const update = jest.spyOn(CampaignDelivery, 'updateOne').mockResolvedValue({});
  setPushProvider({ sendToTokens: async () => { throw new AppError('Firebase could not authenticate the server.', 502, 'PUSH_DELIVERY_ERROR'); } });
  await expect(processCampaignDelivery()).resolves.toBe(true);
  expect(update).toHaveBeenCalledWith({ _id: 'job', status: 'processing' }, { $set: expect.objectContaining({ status: 'failed', reason: 'Firebase could not authenticate the server.' }) });
});
