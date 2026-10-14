import { afterEach, expect, jest, test } from '@jest/globals';
import { User } from '../../backend/src/models/User.js';
import { pushService } from '../../backend/src/services/push/push.service.js';
import { getPushProvider, setPushProvider } from '../../backend/src/integrations/push/index.js';
const originalProvider = getPushProvider();
afterEach(() => { jest.restoreAllMocks(); setPushProvider(originalProvider); });
test('transient Firebase failures are not counted as delivered devices', async () => {
  jest.spyOn(User, 'findById').mockReturnValue({ select: jest.fn().mockResolvedValue({ fcmTokens: ['valid', 'revoked', 'temporarily-unavailable'] }) });
  const update = jest.spyOn(User, 'updateOne').mockResolvedValue({});
  setPushProvider({ sendToTokens: async () => ({ success: true, provider: 'firebase', successCount: 1, failureCount: 2, invalidTokens: ['revoked'] }) });
  expect(await pushService.sendToUser('user', { title: 'Test', body: 'Test' })).toMatchObject({ sent: 1, failed: 2, simulated: false });
  expect(update).toHaveBeenCalledWith({ _id: 'user' }, { $pull: { fcmTokens: { $in: ['revoked'] } } });
});
test('development push does not claim a real notification was delivered', async () => {
  jest.spyOn(User, 'findById').mockReturnValue({ select: jest.fn().mockResolvedValue({ fcmTokens: ['browser'] }) });
  setPushProvider({ sendToTokens: async () => ({ success: true, provider: 'development', invalidTokens: [] }) });
  expect(await pushService.sendToUser('user', { title: 'Test', body: 'Test' })).toMatchObject({ sent: 0, simulated: true });
});
