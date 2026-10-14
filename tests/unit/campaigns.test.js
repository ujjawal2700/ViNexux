import { campaignValidationDetails, normalizeCampaignUrl } from '../../shared/campaignValidation.js';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, test } from '@jest/globals';
import { newCampaign, newEmailBlock, renderEmailDesign } from '../../shared/campaignDesign.js';
import { campaignInput, readyCampaign } from '../../backend/src/validators/campaign.validator.js';
import { renderCampaignEmail, sanitizeCampaignHtml, unsubscribeToken, verifyUnsubscribeToken, audienceFingerprint } from '../../backend/src/services/campaign.service.js';
import { SmtpEmailProvider } from '../../backend/src/integrations/email/SmtpEmailProvider.js';
import { firebaseMessage } from '../../backend/src/integrations/push/FirebasePushProvider.js';
const id = '507f1f77bcf86cd799439011';
describe('campaign content and recipient safety', () => {
  test('drafts allow unfinished content; sending needs content and a complete button', () => {
    const draft = { ...newCampaign('email'), name: 'New launch' };
    expect(campaignInput.safeParse(draft).success).toBe(true);
    expect(readyCampaign.safeParse(draft).success).toBe(false);
    draft.email.subject = 'Hello {{name}}'; draft.email.blocks[2].url = 'https://example.com/products';
    expect(readyCampaign.safeParse(draft).success).toBe(true);
  });
  test('rejects dangerous URLs, too many actions, oversize payloads and empty selected audiences', () => {
    const draft = { ...newCampaign('push'), name: 'Launch' }; draft.push.title = 'Hi'; draft.push.body = 'New products';
    expect(readyCampaign.safeParse(draft).success).toBe(true);
    draft.push.link = 'javascript:alert(1)'; expect(readyCampaign.safeParse(draft).success).toBe(false);
    draft.push.link = 'https://name:password@example.com'; expect(campaignInput.safeParse(draft).success).toBe(false);
    draft.push.link = ''; draft.push.actions = Array(3).fill({ label: 'Open', url: 'https://example.com' }); expect(campaignInput.safeParse(draft).success).toBe(false);
    draft.push.actions = []; draft.audience.segment = 'selected'; expect(readyCampaign.safeParse(draft).success).toBe(false);
    draft.audience.segment = 'all'; draft.push.imageUrl = `https://example.com/${'a'.repeat(1900)}`; draft.push.link = draft.push.imageUrl;
    expect(readyCampaign.safeParse(draft).success).toBe(false);
  });
  test('sanitizes HTML and preserves safe email styling with a separate unsubscribe footer', () => {
    const campaign = newCampaign('email'); campaign.email.mode = 'html'; campaign.email.subject = 'Hi {{name}}';
    campaign.email.html = '<script>alert(1)</script><img src="javascript:alert(1)" onerror="alert(2)"><p style="color:#800020;position:fixed">Hello {{name}}</p><table><tr><td>Unclosed';
    const { html, subject, unsubscribeUrl } = renderCampaignEmail(campaign, { _id: id, fullName: '<img onerror=alert(9)>\nFriend' });
    expect(html).not.toMatch(/<script|onerror="|src="javascript|position:fixed/);
    expect(html).toContain('color:#800020'); expect(html).toContain('background-color:#f6f2f3');
    expect(html).toContain('&lt;img onerror=alert(9)&gt;'); expect(html).toContain('Unsubscribe from promotional emails');
    expect(subject).not.toContain('\n'); expect(verifyUnsubscribeToken(new URL(unsubscribeUrl).searchParams.get('token'))).toBe(id);
  });
  test('personalization escapes user text and new blocks have independent defaults', () => {
    const campaign = newCampaign('email'); campaign.email.blocks = [newEmailBlock('text')];
    expect(renderEmailDesign(campaign.email, { fullName: '<b>Asha</b>' })).toContain('&lt;b&gt;Asha&lt;/b&gt;');
    expect(sanitizeCampaignHtml('<a href="//evil.com">bad</a><iframe src="https://example.com"></iframe><form>x</form>')).not.toMatch(/href=|iframe|form/);
  });
  test('unsubscribe tokens cannot be substituted or tampered with', () => {
    const token = unsubscribeToken(id); expect(verifyUnsubscribeToken(token)).toBe(id);
    expect(() => verifyUnsubscribeToken(`${token}x`)).toThrow('invalid'); expect(() => verifyUnsubscribeToken(null)).toThrow('invalid');
  });
  test('audience fingerprints bind a campaign revision and exact ordered recipients', () => {
    const campaign = { _id: id, revision: 0 }, users = [{ _id: id, recipientKey: 'asha@example.com' }];
    expect(audienceFingerprint(campaign, users)).not.toBe(audienceFingerprint({ ...campaign, revision: 1 }, users));
    expect(audienceFingerprint(campaign, users)).not.toBe(audienceFingerprint(campaign, []));
  });
});

test('Firebase campaigns use data-only messages with a TTL and no duplicate automatic notification', () => {
  const message = firebaseMessage({ tokens: ['device'], title: 'Launch', body: 'Now', data: { title: 'Launch', link: 'https://example.com', number: 3 }, campaign: true, ttl: 3600 });
  expect(message.notification).toBeUndefined(); expect(message.webpush.notification).toBeUndefined();
  expect(message.webpush.headers.TTL).toBe('3600'); expect(message.data.number).toBe('3');
  expect(firebaseMessage({ tokens: ['device'], title: 'Order', body: 'Received' }).notification.title).toBe('Order');
});

test('SMTP campaign customization carries reply-to and one-click unsubscribe headers', async () => {
  let message;
  const smtp = new SmtpEmailProvider({ sendMail: async input => { message = input; return { messageId: 'test', accepted: ['reader@example.test'] }; } });
  await smtp.sendEmail({ to: 'reader@example.test', subject: 'Launch', html: '<p>Launch</p>', from: { name: 'ViNexus Offers', address: 'sender@example.test' }, replyTo: 'help@example.test', unsubscribeUrl: 'https://example.test/preferences', oneClickUrl: 'https://api.example.test/unsubscribe/signed-token' });
  expect(message.replyTo).toBe('help@example.test'); expect(message.from.name).toBe('ViNexus Offers');
  expect(message.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
  expect(message.headers['List-Unsubscribe']).toContain('https://api.example.test/unsubscribe/signed-token');
  const rejected = new SmtpEmailProvider({ sendMail: async () => ({ accepted: [], rejected: ['reader@example.test'] }) });
  await expect(rejected.sendEmail({ to: 'reader@example.test', subject: 'Launch' })).rejects.toThrow('did not accept');
});


test('Firebase background worker renders rich messages once, honors expiry and opens action links', async () => {
  const events = {}, shown = [], opened = [], order = []; let receive;
  const self = {
    location: { origin: 'https://shop.example.test', href: `https://shop.example.test/firebase-messaging-sw.js?config=${encodeURIComponent(JSON.stringify({ apiKey: 'public-key', projectId: 'project' }))}` },
    addEventListener: (event, listener) => { order.push(event); events[event] = listener; },
    registration: { showNotification: async (title, options) => shown.push({ title, options }) },
    skipWaiting: () => {},
  };
  const clients = { claim: async () => {}, matchAll: async () => [], openWindow: async url => opened.push(url) };
  const firebase = { initializeApp: () => {}, messaging: () => ({ onBackgroundMessage: callback => { receive = callback; } }) };
  vm.runInNewContext(readFileSync(new URL('../../frontend/public/firebase-messaging-sw.js', import.meta.url), 'utf8'), { self, clients, firebase, URL, Date, importScripts: () => order.push('import') });
  expect(order.indexOf('notificationclick')).toBeLessThan(order.indexOf('import'));
  await receive({ data: { title: 'New collection', body: 'Browse today', imageUrl: 'https://shop.example.test/image.webp', link: 'https://shop.example.test/products', requireInteraction: 'true', actions: JSON.stringify([{ label: 'Browse', url: 'https://shop.example.test/products/new' }]) } });
  expect(shown).toHaveLength(1); expect(shown[0].options.image).toContain('image.webp'); expect(shown[0].options.actions[0].title).toBe('Browse');
  await receive({ notification: { title: 'Automatically shown by FCM' } });
  await receive({ data: { title: 'Expired', expiresAt: String(Date.now() - 1000) } }); expect(shown).toHaveLength(1);
  let clickWork;
  events.notificationclick({ notification: { data: shown[0].options.data, close: () => {} }, action: 'action-0', waitUntil: promise => { clickWork = promise; } });
  await clickWork; expect(opened).toEqual(['https://shop.example.test/products/new']);
  events.notificationclick({ notification: { data: { FCM_MSG: {} }, close: () => { throw new Error('Firebase owns this notification'); } } });
  expect(opened).toHaveLength(1);
});


test('web links accept any domain, query strings and pasted domains while rejecting unsafe schemes', () => {
  const draft = { ...newCampaign('push'), name: 'Push launch' };
  draft.push.title = 'New collection'; draft.push.body = 'Browse now';
  for (const value of ['https://encrypted-tbn0.gstatic.com/images?q=tbn:abc&other=1', 'https://another-store.example/path?utm_source=push', 'example.com/products', '/products']) {
    draft.push.link = value;
    const result = readyCampaign.safeParse(draft); expect(result.success).toBe(true);
    expect(result.data.push.link).toMatch(/^https?:\/\//);
  }
  expect(normalizeCampaignUrl(' example.com/products ')).toBe('https://example.com/products');
  for (const value of ['javascript:alert(1)', 'data:text/html,test', 'https://user:password@example.com', 'not a link']) {
    draft.push.link = value; expect(campaignInput.safeParse(draft).success).toBe(false);
  }
});

test('validation reports exact input names including actions and ignores the inactive editor', () => {
  const draft = newCampaign('push'); draft.push.actions = [{ label: 'Book now', url: 'not a link' }];
  const result = campaignInput.safeParse(draft);
  const issues = campaignValidationDetails(result.error.issues);
  expect(issues).toEqual(expect.arrayContaining([
    expect.objectContaining({ field: 'name', label: 'Campaign name', message: 'Enter a campaign name with at least 2 characters.' }),
    expect.objectContaining({ field: 'push.actions.0.url', label: 'Action 1 URL' }),
  ]));
  draft.name = 'Push campaign'; draft.push.actions = []; draft.email.replyTo = 'invalid hidden email';
  draft.email.blocks[2].url = 'invalid hidden URL';
  expect(campaignInput.safeParse(draft).success).toBe(true);
  const ready = readyCampaign.safeParse(draft);
  expect(campaignValidationDetails(ready.error.issues).map(issue => issue.field)).toEqual(['push.title', 'push.body']);
});
