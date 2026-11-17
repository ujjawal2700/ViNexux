import { afterEach, expect, jest, test } from '@jest/globals';
import { AdminArrival } from '../../backend/src/models/AdminArrival.js';
import { User } from '../../backend/src/models/User.js';
import { pushService } from '../../backend/src/services/push/push.service.js';
import { adminArrivalService } from '../../backend/src/services/adminArrival.service.js';
import { requireArrivalSuperAdmin } from '../../backend/src/routes/admin.routes.js';
import { enableEnquiryNotificationSound, playAdminArrivalSound } from '../../frontend/src/utils/enquiryNotificationSound.js';
const id = '507f1f77bcf86cd799439011';
afterEach(() => jest.restoreAllMocks());
test('new arrivals fan out to every unblocked super admin and carry the exact record link', async () => {
  jest.spyOn(AdminArrival, 'create').mockImplementation(async row => ({ ...row, _id: id }));
  jest.spyOn(User, 'find').mockReturnValue({ select: () => ({ lean: async () => [{ _id: 'admin-one' }, { _id: 'admin-two' }] }) });
  jest.spyOn(pushService, 'sendToUser').mockResolvedValue({ success: true });
  await adminArrivalService.publish({ _id: id, source: 'whatsapp', enquiryNumber: 'VNX-7', contactName: 'Customer' });
  expect(User.find).toHaveBeenCalledWith(expect.objectContaining({ role: 'admin', isEmployee: { $ne: true }, accountStatus: { $ne: 'blocked' } }));
  expect(pushService.sendToUser).toHaveBeenCalledTimes(2);
  expect(pushService.sendToUser).toHaveBeenCalledWith('admin-two', expect.objectContaining({ title: 'New WhatsApp order lead', data: expect.objectContaining({ type: 'admin-arrival', arrivalId: id, link: `/admin/whatsapp-orders/${id}` }) }));
});
test('duplicate publish cannot ring twice and a notification failure does not reject the saved order', async () => {
  jest.spyOn(AdminArrival, 'create').mockRejectedValue(Object.assign(new Error('duplicate'), { code: 11000 }));
  jest.spyOn(User, 'find');
  await expect(adminArrivalService.publish({ _id: id })).resolves.toBeUndefined();
  expect(User.find).not.toHaveBeenCalled();
  AdminArrival.create.mockRejectedValue(new Error('database unavailable'));
  jest.spyOn(console, 'error').mockImplementation(() => {});
  await expect(adminArrivalService.publish({ _id: id })).resolves.toBeUndefined();
});
test('fresh panel silently starts at the newest event and cursor feed paginates without dropping a burst', async () => {
  jest.spyOn(AdminArrival, 'findOne').mockReturnValue({ sort() { return this; }, select() { return this; }, lean: async () => ({ _id: id }) });
  expect(await adminArrivalService.list()).toEqual({ arrivals: [], cursor: id, hasMore: false });
  const rows = Array.from({ length: 51 }, (_, index) => ({ _id: index.toString(16).padStart(24, '0') }));
  jest.spyOn(AdminArrival, 'find').mockReturnValue({ sort() { return this; }, limit: count => { expect(count).toBe(51); return { lean: async () => rows }; } });
  const result = await adminArrivalService.list(id);
  expect(result.arrivals).toHaveLength(50); expect(result.hasMore).toBe(true); expect(result.cursor).toBe(rows[49]._id);
  expect(AdminArrival.find).toHaveBeenCalledWith({ _id: { $gt: id } });
});
test('arrival feed is reserved for super admins', () => {
  for (const user of [{ role: 'customer' }, { role: 'admin', isEmployee: true }]) {
    const next = jest.fn(); requireArrivalSuperAdmin({ user }, {}, next);
    expect(next.mock.calls[0][0].statusCode).toBe(403);
  }
  const next = jest.fn(); requireArrivalSuperAdmin({ user: { role: 'admin' } }, {}, next); expect(next).toHaveBeenCalledWith();
});
test('admin ring lasts one second, supports a hidden panel, and deduplicates the same arrival', async () => {
  const previousWindow = globalThis.window, previousDocument = globalThis.document;
  const handlers = {}, stop = jest.fn(), start = jest.fn();
  globalThis.window = { addEventListener: (name, fn) => { handlers[name] = fn; }, removeEventListener() {}, AudioContext: class {
    state = 'running'; currentTime = 5; destination = {};
    resume() { return Promise.resolve(); }
    createOscillator() { return { frequency: {}, connect() {}, start, stop }; }
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
  } };
  globalThis.document = { visibilityState: 'hidden' };
  try {
    enableEnquiryNotificationSound(); await handlers.pointerdown();
    playAdminArrivalSound(id); playAdminArrivalSound(id);
    expect(start).toHaveBeenCalledTimes(1); expect(stop).toHaveBeenCalledWith(6);
  } finally { globalThis.window = previousWindow; globalThis.document = previousDocument; }
});
