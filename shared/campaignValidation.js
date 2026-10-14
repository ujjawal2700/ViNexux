// Accept links to any web domain. Missing schemes use HTTPS; storefront paths
// are resolved against the site's public URL. Other schemes stay invalid.
export function normalizeCampaignUrl(value, siteUrl = '') {
  const text = String(value ?? '').trim();
  if (!text) return '';
  if (/^[a-z][a-z\d+.-]*:/i.test(text)) return text;
  if (text.startsWith('//')) return `https:${text}`;
  if (text.startsWith('/')) {
    try { return new URL(text, siteUrl).href; } catch { return text; }
  }
  if (/^(?:localhost(?::\d+)?|(?:[^\s/:.]+\.)+[^\s/:.]+)(?::\d+)?(?:[/?#]|$)/i.test(text)) return `https://${text}`;
  return text;
}
export function normalizeCampaignLinks(campaign, siteUrl) {
  return { ...campaign,
    email: { ...campaign.email, blocks: campaign.email.blocks.map(block => ({ ...block, imageUrl: normalizeCampaignUrl(block.imageUrl, siteUrl), url: normalizeCampaignUrl(block.url, siteUrl) })) },
    push: { ...campaign.push, ...Object.fromEntries(['link', 'imageUrl', 'iconUrl', 'badgeUrl'].map(key => [key, normalizeCampaignUrl(campaign.push[key], siteUrl)])), actions: campaign.push.actions.map(action => ({ ...action, url: normalizeCampaignUrl(action.url, siteUrl) })) },
  };
}
const labels = { name: 'Campaign name', 'email.subject': 'Email subject', 'email.preheader': 'Email preheader', 'email.senderName': 'Sender name', 'email.replyTo': 'Reply-to email', 'email.html': 'Email HTML', 'email.blocks': 'Email blocks', 'email.backgroundColor': 'Email background', 'email.surfaceColor': 'Content background', 'email.accentColor': 'Accent color', 'email.fontFamily': 'Font', 'email.contentWidth': 'Content width', 'push.title': 'Notification title', 'push.body': 'Notification message', 'push.link': 'Open this URL on click', 'push.imageUrl': 'Notification image', 'push.iconUrl': 'Notification icon', 'push.badgeUrl': 'Notification badge', 'push.ttl': 'Expiry (seconds)', 'push.tag': 'Notification group / tag', 'push.actions': 'Action buttons', push: 'Push notification', audience: 'Audience', 'audience.segment': 'Audience', 'audience.userIds': 'Selected recipients' };
export function campaignFieldLabel(field) {
  if (labels[field]) return labels[field];
  const action = /^push\.actions\.(\d+)\.(.+)$/.exec(field);
  if (action) return `Action ${Number(action[1]) + 1} ${action[2] === 'url' ? 'URL' : 'label'}`;
  const block = /^email\.blocks\.(\d+)(?:\.(.+))?$/.exec(field);
  if (block) return `Email block ${Number(block[1]) + 1}${block[2] ? ` · ${({ imageUrl: 'image URL', url: 'destination URL', backgroundColor: 'background', fontSize: 'font size' })[block[2]] || block[2]}` : ''}`;
  return field;
}
export const campaignValidationDetails = issues => issues.map(issue => {
  const field = issue.path.join('.');
  return { field, label: campaignFieldLabel(field), message: issue.message };
});
