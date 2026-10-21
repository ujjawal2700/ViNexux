export const normalizeEnquiryPhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
};

export const validateEnquiryContact = (contact) => {
  const errors = {};
  const name = contact.fullName.trim();
  if (name.length < 2) errors.contactName = 'Please enter at least 2 characters for your full name.';
  else if (name.length > 100) errors.contactName = 'Full name cannot exceed 100 characters.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim()) || contact.email.trim().length > 254) errors.contactEmail = 'Please enter a valid email address.';
  if (!/^[6-9]\d{9}$/.test(normalizeEnquiryPhone(contact.phone))) errors.contactPhone = 'Please enter a valid 10-digit Indian mobile number.';
  return errors;
};
