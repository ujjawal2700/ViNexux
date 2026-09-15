/**
 * wa.me deep-link helper for admin-to-customer WhatsApp follow-up.
 *
 * There's no WhatsApp Business API integration configured, so instead of an
 * automated server-side send, admins click a button that opens WhatsApp
 * (web or app) with the customer's number and a prefilled message already
 * loaded - they just review and hit send themselves.
 */

/** Builds the prefilled follow-up message for one enquiry. */
export const buildEnquiryWhatsAppMessage = (enquiry) => {
  const contactName = enquiry?.contactName || 'there';
  const enquiryNumber = enquiry?.enquiryNumber || '';
  const items = Array.isArray(enquiry?.items) ? enquiry.items : [];

  let text = `Hello ${contactName},\n\n`;
  text += `This is Vinexus Security Systems regarding your enquiry${enquiryNumber ? ` #${enquiryNumber}` : ''}.\n\n`;

  if (items.length > 0) {
    text += `Items requested:\n`;
    items.forEach((item, idx) => {
      const name = item.productName || item.productId?.name || 'Product';
      text += `${idx + 1}. ${name} - Qty: ${item.quantity || 1}\n`;
    });
    text += `\n`;
  }

  text += `We'll get back to you shortly with pricing and availability. Thank you for choosing Vinexus!`;

  return text;
};

/**
 * Builds the full wa.me URL for an enquiry, or null if it has no
 * WhatsApp number on file (older enquiries predate this field).
 */
export const buildEnquiryWhatsAppLink = (enquiry) => {
  const rawNumber = (enquiry?.whatsappNumber || '').replace(/\D/g, '');
  if (!rawNumber) return null;

  const withCountryCode = rawNumber.length === 10 ? `91${rawNumber}` : rawNumber;
  const encodedText = encodeURIComponent(buildEnquiryWhatsAppMessage(enquiry));
  return `https://wa.me/${withCountryCode}?text=${encodedText}`;
};

export default { buildEnquiryWhatsAppMessage, buildEnquiryWhatsAppLink };
