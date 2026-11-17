// Build the WhatsApp draft from the saved, server-priced order snapshot.
export const buildWhatsAppOrderLink = (lead, phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  const recipient = digits.length === 10 ? `91${digits}` : digits;
  const address = lead.deliveryAddress || {};
  const addressText = [address.line1, address.line2, address.city, address.state, address.pincode].filter(Boolean).join(', ');
  let text = `VI Nexus — Order Summary\nReference: ${lead.enquiryNumber}\nCustomer: ${lead.contactName}\nPhone: ${lead.contactPhone}\nWhatsApp: ${lead.whatsappNumber}\nAddress: ${addressText}\n\n`;
  let total = 0;
  (lead.items || []).forEach((item, index) => {
    const amount = item.quantity * item.priceShown;
    total += amount;
    text += `${index + 1}. ${item.productName}\n`;
    if (item.modelNumber) text += `Model Number: ${item.modelNumber}\n`;
    const model = [item.modelName, item.variantName].filter(Boolean).join(' / ');
    if (model) text += `Model Name / Variant: ${model}\n`;
    text += `Qty: ${item.quantity} | Unit: ₹${item.priceShown} | Total: ₹${amount}\n\n`;
  });
  text += `Estimated Total: ₹${total}\n${lead.message || 'Please confirm stock availability and delivery timeline.'}`;
  return `https://api.whatsapp.com/send?phone=${recipient}&text=${encodeURIComponent(text)}`;
};
