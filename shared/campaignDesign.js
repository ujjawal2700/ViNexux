export const CAMPAIGN_BLOCKS = ['heading', 'text', 'image', 'button', 'divider', 'spacer'];
export const escapeEmail = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
export const personalize = (value, recipient = {}) => String(value || '').replace(/{{\s*name\s*}}/g, () => recipient.fullName || recipient.name || 'there');
export const newEmailBlock = type => ({ type, text: type === 'heading' ? 'Something worth opening.' : type === 'button' ? 'Explore now' : type === 'text' ? 'Hello {{name}},\nDiscover our latest products and offers.' : '',
  imageUrl: '', url: '', alt: '', align: 'left', color: '#26313d', backgroundColor: '', fontSize: type === 'heading' ? 30 : 16, padding: 20, height: 24 });
export const newCampaign = channel => ({ name: '', channel, audience: { segment: 'all', userIds: [] },
  email: { subject: '', preheader: '', senderName: 'ViNexus', replyTo: '', mode: 'blocks', html: '', backgroundColor: '#f6f2f3', surfaceColor: '#ffffff', accentColor: '#800020', fontFamily: 'Arial, sans-serif', contentWidth: 640,
    blocks: [newEmailBlock('heading'), newEmailBlock('text'), newEmailBlock('button')] },
  push: { title: '', body: '', imageUrl: '', iconUrl: '', badgeUrl: '', link: '', tag: '', ttl: 86400, requireInteraction: false, actions: [] } });

export function renderEmailDesign(email, recipient = {}, unsubscribeUrl = '#preferences') {
  const e = escapeEmail;
  const text = value => e(personalize(value, recipient)).replace(/\r?\n/g, '<br>');
  const blocks = (email.blocks || []).map(block => {
    const style = `padding:${block.padding ?? 20}px;text-align:${block.align || 'left'};color:${block.color || '#26313d'};${block.backgroundColor ? `background-color:${block.backgroundColor};` : ''}`;
    let html = '';
    if (block.type === 'heading') html = `<h2 style="margin:0;font-size:${block.fontSize || 30}px;line-height:1.25;">${text(block.text)}</h2>`;
    if (block.type === 'text') html = `<p style="margin:0;font-size:${block.fontSize || 16}px;line-height:1.7;">${text(block.text)}</p>`;
    if (block.type === 'image') html = `<img src="${e(block.imageUrl)}" alt="${e(block.alt)}" width="${email.contentWidth - (block.padding || 0) * 2}" style="display:block;border:0;max-width:100%;width:100%;height:auto;">`;
    if (block.type === 'button') html = `<a href="${e(block.url)}" style="display:inline-block;padding:14px 24px;border-radius:8px;background-color:${email.accentColor};color:#ffffff;text-decoration:none;font-weight:bold;font-size:${block.fontSize || 16}px;">${text(block.text)}</a>`;
    if (block.type === 'divider') html = '<hr style="border:0;border-top:1px solid #e6dce0;margin:0;">';
    if (block.type === 'spacer') html = `<div style="height:${block.height || 24}px;line-height:${block.height || 24}px;">&nbsp;</div>`;
    return `<tr><td style="${e(style)}">${html}</td></tr>`;
  }).join('');
  const content = email.mode === 'html' ? personalize(email.html, { ...recipient, fullName: e(recipient.fullName || recipient.name || 'there') }) : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${blocks}</table>`;
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="utf-8"></head><body style="margin:0;padding:24px 8px;background-color:${e(email.backgroundColor)};font-family:${e(email.fontFamily)};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${text(email.preheader)}</div>
    <table role="presentation" align="center" width="${email.contentWidth}" cellpadding="0" cellspacing="0" style="width:100%;max-width:${email.contentWidth}px;margin:0 auto;background-color:${e(email.surfaceColor)};"><tr><td>${content}</td></tr>
    <tr><td style="padding:24px;text-align:center;font-size:12px;line-height:1.7;color:#697380;border-top:1px solid #e6dce0;">Sent by ${e(email.senderName || 'ViNexus')}<br><a href="${e(unsubscribeUrl)}" style="color:#800020;">Unsubscribe from promotional emails</a></td></tr></table></body></html>`;
}
