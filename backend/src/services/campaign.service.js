import { campaignValidationError } from '../utils/campaignValidationError.js';
import { createHash } from 'node:crypto';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import sanitizeHtml from 'sanitize-html';
import { Campaign, CampaignDelivery } from '../models/Campaign.js';
import { User } from '../models/User.js';
import { DealerProfile } from '../models/DealerProfile.js';
import { config } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { getEmailProvider } from '../integrations/email/index.js';
import { getPushProvider } from '../integrations/push/index.js';
import { readyCampaign } from '../validators/campaign.validator.js';
import { personalize, renderEmailDesign } from '../../../shared/campaignDesign.js';

const fail = (message, status = 400) => { throw new AppError(message, status, 'CAMPAIGN_ERROR'); };
export const MAX_CAMPAIGN_RECIPIENTS = 10000;
export const publicSiteUrl = () => (process.env.PUBLIC_SITE_URL || (config.nodeEnv !== 'production' ? config.corsOrigin[0] : '') || '').replace(/\/$/, '');
export const unsubscribeToken = userId => jwt.sign({ sub: String(userId), purpose: 'marketing-unsubscribe' }, config.jwtSecret, { algorithm: 'HS256' });
export const verifyUnsubscribeToken = token => {
  try { const payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] }); if (payload.purpose !== 'marketing-unsubscribe' || !mongoose.isValidObjectId(payload.sub)) throw new Error(); return payload.sub; }
  catch { fail('This unsubscribe link is invalid. You can also update preferences from your account.'); }
};
export const sanitizeCampaignHtml = (html, document = false) => sanitizeHtml(html, {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(document ? ['img', 'html', 'body'] : ['img']),
  allowedAttributes: { '*': ['style', 'align', 'width', 'height', 'bgcolor', 'role', 'dir'], a: ['href', 'title', 'target', 'rel', 'style'], img: ['src', 'alt', 'width', 'height', 'style'], table: ['role', 'width', 'align', 'cellpadding', 'cellspacing', 'border', 'style'], td: ['colspan', 'rowspan', 'valign', 'width', 'align', 'style'] },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'], allowedSchemesByTag: { img: ['http', 'https'] }, allowProtocolRelative: false,
  allowedStyles: { '*': {
    'color': [/^(#[\da-f]{3,8}|[a-z]+|rgba?\([\d\s,.%]+\))$/i], 'background-color': [/^(#[\da-f]{3,8}|[a-z]+|rgba?\([\d\s,.%]+\))$/i],
    'font-family': [/^[\w\s,\-'"]+$/], 'font-size': [/^\d+(\.\d+)?(px|em|rem|%)$/], 'font-weight': [/^(normal|bold|[1-9]00)$/], 'font-style': [/^(normal|italic)$/],
    'text-align': [/^(left|right|center|justify)$/], 'text-decoration': [/^(none|underline|line-through)$/],
    'line-height': [/^[\d.]+(px|em|%)?$/], 'letter-spacing': [/^-?[\d.]+px$/], 'white-space': [/^(normal|pre-wrap)$/],
    'padding': [/^[\d.\s]+(px|em|%)?(\s+[\d.]+(px|em|%)){0,3}$/], 'padding-top': [/^[\d.]+px$/], 'padding-bottom': [/^[\d.]+px$/],
    'margin': [/^(0|auto|[\d.]+(px|em|%))(\s+(0|auto|[\d.]+(px|em|%))){0,3}$/],
    'width': [/^[\d.]+(px|%)$/], 'max-width': [/^[\d.]+(px|%)$/], 'height': [/^(auto|[\d.]+(px|%))$/], 'max-height': [/^[\d.]+(px|%)?$/],
    'border': [/^(0|none|[\d.]+px (solid|dashed) #[\da-f]{3,8})$/i], 'border-top': [/^\d+px (solid|dashed) #[\da-f]{3,8}$/i], 'border-radius': [/^[\d.]+px$/],
    'display': [/^(none|block|inline|inline-block|table|table-cell)$/], 'overflow': [/^hidden$/], 'opacity': [/^(0|1|0?\.\d+)$/],
  } },
  transformTags: { a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }) },
});
export const renderCampaignEmail = (campaign, recipient = { fullName: 'Preview reader' }) => {
  const unsubscribeUrl = `${publicSiteUrl()}/email-preferences?token=${unsubscribeToken(recipient._id || new mongoose.Types.ObjectId())}`;
  const email = { ...campaign.email };
  if (email.mode === 'html') email.html = sanitizeCampaignHtml(email.html);
  const raw = renderEmailDesign(email, recipient, unsubscribeUrl);
  // Sanitize the custom content before adding the mandatory, independent footer.
  // The final sanitizer also prevents raw HTML from executing in email clients.
  const html = sanitizeCampaignHtml(raw, true);
  const text = sanitizeHtml(html.replace(/<br\s*\/?>|<\/p>|<\/h[1-6]>|<\/tr>/gi, '\n'), { allowedTags: [], allowedAttributes: {} });
  const apiUrl = (process.env.PUBLIC_API_URL || '').replace(/\/$/, '');
  const oneClickUrl = /^https:\/\//i.test(apiUrl) ? `${apiUrl}/communications/unsubscribe/${unsubscribeToken(recipient._id || new mongoose.Types.ObjectId())}` : undefined;
  return { html, text, oneClickUrl, subject: personalize(campaign.email.subject, recipient).replace(/[\r\n]/g, ' '), unsubscribeUrl };
};
export const campaignProviderStatus = () => ({
  email: { mode: ['development', 'dev'].includes(config.emailProvider) ? 'simulation' : 'live', ready: ['development', 'dev'].includes(config.emailProvider) || Boolean(config.emailHost && config.emailUser && config.emailPassword && config.emailFrom) },
  push: { mode: config.pushProvider === 'firebase' ? 'live' : 'simulation', ready: config.pushProvider !== 'firebase' || Boolean(config.firebaseProjectId && config.firebaseClientEmail && config.firebasePrivateKey) },
  siteReady: /^https:\/\//i.test(publicSiteUrl()) || config.nodeEnv !== 'production' && /^http:\/\//i.test(publicSiteUrl()),
});
export async function campaignRecipients(campaign, session = null) {
  const filter = { role: { $in: ['customer', 'dealer'] }, accountStatus: 'active', status: { $ne: 'blocked' }, [`marketingPreferences.${campaign.channel}`]: true };
  if (campaign.channel === 'email') filter.email = { $type: 'string', $regex: /\S+@\S+\.\S+/ };
  else filter['fcmTokens.0'] = { $exists: true };
  const audience = campaign.audience;
  if (audience.segment === 'customers') filter.role = 'customer';
  if (['dealers', 'approved-dealers'].includes(audience.segment)) filter.role = 'dealer';
  if (audience.segment === 'selected') filter._id = { $in: audience.userIds };
  if (audience.segment === 'approved-dealers') filter.dealerProfileId = { $in: (await DealerProfile.find({ status: 'approved' }).select('_id').session(session).lean()).map(profile => profile._id) };
  const users = await User.find(filter).select('fullName email role').sort({ _id: 1 }).limit(MAX_CAMPAIGN_RECIPIENTS + 1).session(session).lean();
  if (users.length > MAX_CAMPAIGN_RECIPIENTS) fail(`Choose a smaller audience. Each campaign supports up to ${MAX_CAMPAIGN_RECIPIENTS} recipients.`);
  const seen = new Set();
  return users.flatMap(user => {
    const key = campaign.channel === 'email' ? user.email.toLowerCase().trim() : String(user._id);
    if (seen.has(key)) return []; seen.add(key); return [{ ...user, recipientKey: key }];
  });
}
export const audienceFingerprint = (campaign, users) => createHash('sha256').update(JSON.stringify([String(campaign._id), campaign.revision, users.map(user => [String(user._id), user.recipientKey])])).digest('hex');
export async function reviewCampaign(campaign) {
  const validated = readyCampaign.safeParse({ name: campaign.name, channel: campaign.channel, audience: campaign.audience, email: campaign.email, push: campaign.push });
  if (!validated.success) throw campaignValidationError(validated.error.issues);
  const users = await campaignRecipients(campaign);
  return { count: users.length, fingerprint: audienceFingerprint(campaign, users), revision: campaign.revision, providers: campaignProviderStatus() };
}
export async function queueCampaign(id, revision, fingerprint, actorId) {
  return mongoose.connection.transaction(async session => {
    const campaign = await Campaign.findOneAndUpdate({ _id: id, status: 'draft', revision }, { $set: { status: 'queued', queuedBy: actorId, queuedAt: new Date() }, $inc: { revision: 1 } }, { new: false, session });
    if (!campaign) fail('This campaign was changed or already queued. Refresh it before sending.', 409);
    const review = await reviewCampaign(campaign);
    if (!review.providers[campaign.channel].ready || !review.providers.siteReady) fail('Configure the delivery provider and PUBLIC_SITE_URL before sending.', 409);
    const users = await campaignRecipients(campaign, session);
    if (!users.length) fail('There are no subscribed recipients in this audience.', 409);
    if (audienceFingerprint(campaign, users) !== fingerprint) fail('The audience changed. Review the updated recipient count before sending.', 409);
    await CampaignDelivery.insertMany(users.map(user => ({ campaignId: id, userId: user._id, recipientKey: user.recipientKey })), { session });
    await Campaign.updateOne({ _id: id }, { $set: { totalRecipients: users.length, deliveryMode: review.providers[campaign.channel].mode } }, { session });
    return { queued: users.length, mode: review.providers[campaign.channel].mode };
  });
}
export async function deliverCampaignMessage(campaign, user) {
  if (campaign.channel === 'email') {
    const rendered = renderCampaignEmail(campaign, user);
    const result = await getEmailProvider().sendEmail({ to: user.email, ...rendered,
      from: { name: campaign.email.senderName, address: config.emailFrom }, replyTo: campaign.email.replyTo || undefined });
    if (!result.success) fail('Email provider rejected this message.', 502);
    return { status: result.provider === 'development' ? 'simulated' : 'accepted', provider: result.provider, messageId: result.messageId };
  }
  const push = campaign.push;
  const data = { title: personalize(push.title, user).slice(0, 100), body: personalize(push.body, user).slice(0, 500), link: push.link || publicSiteUrl(),
    imageUrl: push.imageUrl, iconUrl: push.iconUrl, badgeUrl: push.badgeUrl, tag: push.tag || String(campaign._id),
    requireInteraction: String(push.requireInteraction), actions: JSON.stringify(push.actions), expiresAt: String(Date.now() + push.ttl * 1000) };
  if (Buffer.byteLength(JSON.stringify(data), 'utf8') > 3900) fail('The personalized push message exceeds the Firebase payload size.');
  const tokens = [...new Set(user.fcmTokens || [])];
  let acceptedDevices = 0, failedDevices = 0, provider;
  for (let i = 0; i < tokens.length; i += 500) {
    const batch = tokens.slice(i, i + 500);
    const result = await getPushProvider().sendToTokens({ tokens: batch, title: data.title, body: data.body, data, campaign: true, ttl: push.ttl });
    provider = result.provider;
    acceptedDevices += result.successCount ?? (result.success ? batch.length - (result.invalidTokens?.length || 0) : 0);
    failedDevices += result.failureCount ?? (result.invalidTokens?.length || 0);
    if (result.invalidTokens?.length) await User.updateOne({ _id: user._id }, { $pull: { fcmTokens: { $in: result.invalidTokens } } });
  }
  return { status: provider === 'development' ? 'simulated' : acceptedDevices ? 'accepted' : 'failed', provider, acceptedDevices, failedDevices,
    reason: !acceptedDevices ? 'No device accepted this push notification.' : undefined };
}

export async function processCampaignDelivery() {
  // A crash after an external provider accepted a message is ambiguous. Never
  // resend these jobs automatically and risk duplicate promotional messages.
  await CampaignDelivery.updateMany({ status: 'processing', startedAt: { $lt: new Date(Date.now() - 10 * 60 * 1000) } }, { $set: { status: 'uncertain', reason: 'Delivery was interrupted; provider acceptance could not be confirmed.', finishedAt: new Date() } });
  const job = await CampaignDelivery.findOneAndUpdate({ status: 'pending' }, { $set: { status: 'processing', startedAt: new Date() } }, { sort: { createdAt: 1 }, new: true });
  if (!job) return false;
  const campaign = await Campaign.findById(job.campaignId).lean();
  let outcome;
  try {
    if (!campaign || campaign.status === 'cancelled') outcome = { status: 'skipped', reason: 'Campaign cancelled.' };
    else {
      await Campaign.updateOne({ _id: campaign._id, status: 'queued' }, { $set: { status: 'sending' } });
      const user = await User.findById(job.userId).lean();
      if (!user || !['customer', 'dealer'].includes(user.role) || user.accountStatus !== 'active' || user.status === 'blocked' || !user.marketingPreferences?.[campaign.channel]) outcome = { status: 'skipped', reason: 'Recipient is no longer subscribed or active.' };
      else if (campaign.channel === 'email' && user.email?.toLowerCase().trim() !== job.recipientKey) outcome = { status: 'skipped', reason: 'Recipient email changed after audience review.' };
      else if (campaign.channel === 'push' && !user.fcmTokens?.length) outcome = { status: 'skipped', reason: 'No registered notification device.' };
      else outcome = await deliverCampaignMessage(campaign, user);
    }
  } catch { outcome = { status: 'failed', reason: 'The delivery provider could not confirm acceptance.' }; }
  await CampaignDelivery.updateOne({ _id: job._id, status: 'processing' }, { $set: { ...outcome, finishedAt: new Date() } });
  await completeCampaign(job.campaignId);
  return true;
}
export async function completeCampaign(campaignId) {
  if (!await CampaignDelivery.exists({ campaignId, status: { $in: ['pending', 'processing'] } })) await Campaign.updateOne({ _id: campaignId, status: { $in: ['queued', 'sending'] } }, { $set: { status: 'completed', completedAt: new Date() } });
}
export function startCampaignWorker() {
  let stopped = false, running = false, timer;
  const tick = async () => {
    if (stopped || running) return;
    running = true;
    try {
      let processed = 0;
      while (!stopped && processed++ < 20 && await processCampaignDelivery()) { /* bounded work per tick */ }
      for (const campaign of await Campaign.find({ status: { $in: ['queued', 'sending'] } }).select('_id').limit(100).lean()) await completeCampaign(campaign._id);
    } catch (error) { console.error('[Campaign worker] Processing paused:', error.message); }
    finally { running = false; if (!stopped) { timer = setTimeout(tick, 2000); timer.unref(); } }
  };
  timer = setTimeout(tick, 2000); timer.unref();
  return () => { stopped = true; clearTimeout(timer); };
}
