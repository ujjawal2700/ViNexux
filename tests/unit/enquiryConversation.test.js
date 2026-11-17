import { afterEach, expect, jest, test } from '@jest/globals';
import { availabilityEnquirySchema, customerEnquiryMessageSchema } from '../../backend/src/validators/enquiry.validator.js';
import { unreadEnquiryReplies } from '../../shared/enquiryConversation.js';
import { enableEnquiryNotificationSound, playEnquiryReplySound } from '../../frontend/src/utils/enquiryNotificationSound.js';
import { firebaseMessage } from '../../backend/src/integrations/push/FirebasePushProvider.js';
const id = '507f1f77bcf86cd799439011';
afterEach(() => { jest.restoreAllMocks(); });
test('availability requires one trimmed description and cannot accept contact/address/order fields', () => {
  expect(availabilityEnquirySchema.body.parse({ productId: id, message: '  Need availability  ' })).toEqual({ productId: id, message: 'Need availability' });
  expect(availabilityEnquirySchema.body.safeParse({ productId: id, message: ' ' }).success).toBe(false);
  expect(availabilityEnquirySchema.body.safeParse({ productId: id, message: 'Hi', addressId: id }).success).toBe(false);
  expect(customerEnquiryMessageSchema.body.safeParse({ message: 'Hi', adminId: id }).success).toBe(false);
});
test('unread responses respect the count actually viewed, including legacy enquiries', () => {
  expect(unreadEnquiryReplies({ customerReplies: [{}, {}], lastReadReplyCount: 1 })).toBe(1);
  expect(unreadEnquiryReplies({ customerReplies: [{}] })).toBe(1);
  expect(unreadEnquiryReplies({ customerReplies: [{}], lastReadReplyCount: 2 })).toBe(0);
});
test('reply push requests a normal OS alert rather than silent delivery', () => {
  const payload = firebaseMessage({ tokens: ['fixture'], title: 'New response', body: 'View enquiry', data: { type: 'enquiry-reply', enquiryId: id, replyCount: 1 } });
  expect(payload.webpush.notification.silent).toBe(false);
  expect(payload.webpush.notification.vibrate).toEqual([200, 100, 200]);
});
test('foreground reply beeps after a gesture and duplicate delivery does not beep twice', () => {
  const previousWindow = globalThis.window, previousDocument = globalThis.document;
  const events = {}; const start = jest.fn();
  globalThis.window = { addEventListener: (name, fn) => { events[name] = fn; }, removeEventListener: jest.fn(), AudioContext: class {
    state = 'running'; currentTime = 0; destination = {};
    resume() { return Promise.resolve(); }
    createOscillator() { return { frequency: {}, connect() {}, start, stop() {} }; }
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
  } };
  globalThis.document = { visibilityState: 'visible' };
  try {
    const cleanup = enableEnquiryNotificationSound(); events.pointerdown();
    const data = { type: 'enquiry-reply', enquiryId: id, replyCount: '1' };
    playEnquiryReplySound(data); playEnquiryReplySound(data);
    expect(start).toHaveBeenCalledTimes(1);
    cleanup(); expect(window.removeEventListener).toHaveBeenCalledTimes(2);
  } finally { globalThis.window = previousWindow; globalThis.document = previousDocument; }
});

test('background reply notification click opens the enquiry rather than the homepage', async () => {
  const { readFile } = await import('node:fs/promises');
  const { runInNewContext } = await import('node:vm');
  const listeners = {}; const openWindow = jest.fn().mockResolvedValue({});
  runInNewContext(await readFile(new URL('../../frontend/public/firebase-messaging-sw.js', import.meta.url), 'utf8'), {
    URL, importScripts() {}, self: { location: { origin: 'https://vinexus.in', href: 'https://vinexus.in/firebase-messaging-sw.js' }, addEventListener: (name, fn) => { listeners[name] = fn; } },
    clients: { matchAll: async () => [], openWindow },
  });
  let complete;
  const stop = jest.fn();
  listeners.notificationclick({ notification: { data: { FCM_MSG: { data: { type: 'enquiry-reply', link: `/account/enquiries/${id}` } } }, close: jest.fn() }, stopImmediatePropagation: stop, waitUntil: pending => { complete = pending; } });
  await complete;
  expect(stop).toHaveBeenCalled();
  expect(openWindow).toHaveBeenCalledWith(`https://vinexus.in/account/enquiries/${id}`);
});
