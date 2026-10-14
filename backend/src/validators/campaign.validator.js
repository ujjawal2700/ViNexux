import { z } from 'zod';
import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { normalizeCampaignUrl } from '../../../shared/campaignValidation.js';
import { CAMPAIGN_BLOCKS, newCampaign } from '../../../shared/campaignDesign.js';

export const campaignUrl = z.string().trim().max(2000, 'Keep the link under 2,000 characters.').transform(value => normalizeCampaignUrl(value, process.env.PUBLIC_SITE_URL || config.corsOrigin[0])).refine(value => !value || /^https?:\/\//i.test(value) && (() => {
  try { const url = new URL(value); return !url.username && !url.password; } catch { return false; }
})(), 'Enter a valid web link, such as example.com/page or https://example.com/page.');
const color = z.string().regex(/^#[a-f\d]{6}$/i, 'Use a six-digit hex color.');
const block = z.object({ type: z.enum(CAMPAIGN_BLOCKS), text: z.string().max(10000).default(''),
  imageUrl: campaignUrl.default(''), url: campaignUrl.default(''), alt: z.string().max(300).default(''),
  align: z.enum(['left', 'center', 'right']).default('left'), color: color.default('#26313d'),
  backgroundColor: z.union([color, z.literal('')]).default(''), fontSize: z.number().int().min(10).max(64).default(16),
  padding: z.number().int().min(0).max(80).default(20), height: z.number().int().min(4).max(200).default(24),
});
const campaignBase = z.object({ name: z.string().trim().min(2, 'Enter a campaign name with at least 2 characters.').max(120, 'Keep the campaign name under 120 characters.'), channel: z.enum(['email', 'push']),
  audience: z.object({ segment: z.enum(['all', 'customers', 'dealers', 'approved-dealers', 'selected']),
    userIds: z.array(z.string().refine(mongoose.isValidObjectId, 'Invalid recipient ID.')).max(1000).default([]) }),
  email: z.object({ subject: z.string().trim().max(200).regex(/^[^\r\n]*$/, 'Subject must be one line.'), preheader: z.string().max(300).default(''),
    senderName: z.string().trim().min(1).max(100).regex(/^[^\r\n<>]*$/), replyTo: z.union([z.string().trim().email(), z.literal('')]).default(''),
    mode: z.enum(['blocks', 'html']), html: z.string().max(100000).default(''), blocks: z.array(block).max(50),
    backgroundColor: color, surfaceColor: color, accentColor: color,
    fontFamily: z.enum(['Arial, sans-serif', 'Georgia, serif', 'Verdana, sans-serif', 'Tahoma, sans-serif']), contentWidth: z.number().int().min(480).max(800),
  }),
  push: z.object({ title: z.string().trim().max(100), body: z.string().trim().max(500), imageUrl: campaignUrl.default(''),
    iconUrl: campaignUrl.default(''), badgeUrl: campaignUrl.default(''), link: campaignUrl.default(''), tag: z.string().trim().max(100).default(''),
    ttl: z.number().int().min(60).max(604800).default(86400), requireInteraction: z.boolean().default(false),
    actions: z.array(z.object({ label: z.string().trim().min(1).max(40), url: campaignUrl.refine(Boolean, 'Action URL is required.') })).max(2).default([]),
  }),
}).strict();
// Inactive editor fields cannot block a campaign in the other channel.
export const campaignInput = z.preprocess(value => {
  if (!value || typeof value !== 'object' || !['email', 'push'].includes(value.channel)) return value;
  const defaults = newCampaign(value.channel);
  return value.channel === 'push' ? { ...value, email: defaults.email } : { ...value, push: defaults.push };
}, campaignBase);
export const readyCampaign = campaignInput.superRefine((campaign, ctx) => {
  const issue = (path, message) => ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
  if (campaign.audience.segment === 'selected' && !campaign.audience.userIds.length) issue(['audience'], 'Select at least one recipient.');
  if (campaign.channel === 'email') {
    if (!campaign.email.subject) issue(['email', 'subject'], 'Email subject is required.');
    if (campaign.email.mode === 'html' && !campaign.email.html.trim()) issue(['email', 'html'], 'Add your email HTML.');
    if (campaign.email.mode === 'blocks' && !campaign.email.blocks.length) issue(['email', 'blocks'], 'Add at least one email block.');
    if (campaign.email.mode === 'blocks') campaign.email.blocks.forEach((block, index) => {
      if (block.type === 'image' && !block.imageUrl) issue(['email', 'blocks', index, 'imageUrl'], 'Add an image URL or upload an image.');
      if (block.type === 'button') {
        if (!block.url) issue(['email', 'blocks', index, 'url'], 'Add a destination link for this button.');
        if (!block.text.trim()) issue(['email', 'blocks', index, 'text'], 'Add a label for this button.');
      }
    });
  } else {
    if (!campaign.push.title) issue(['push', 'title'], 'Enter a notification title.');
    if (!campaign.push.body) issue(['push', 'body'], 'Enter a notification message.');
    if (Buffer.byteLength(JSON.stringify(campaign.push), 'utf8') > 3000) issue(['push'], 'Push content is too large. Shorten text, URLs or action labels.');
  }
});
