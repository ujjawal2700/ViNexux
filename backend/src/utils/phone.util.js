/**
 * Utility functions for Indian phone number normalization, validation, and E.164 formatting.
 */

/**
 * Normalizes an Indian phone number to a clean 10-digit string.
 * Removes non-numeric characters, handles country code prefixes (+91, 91),
 * and prevents duplicate country code prepending.
 * 
 * @param {string} phone - Raw input phone number
 * @returns {string} 10-digit normalized phone number, or original trimmed string if non-standard
 */
export const normalizePhoneNumber = (phone) => {
  if (!phone || typeof phone !== 'string') return '';

  let cleaned = phone.trim();

  // If starts with + (e.g. +919876543210 or +91+919876543210)
  if (cleaned.startsWith('+')) {
    // Remove repeated +91 or + prefixes
    cleaned = cleaned.replace(/^(\+91|\+)+/g, '');
  }

  // Strip all non-digit characters
  cleaned = cleaned.replace(/\D/g, '');

  // If resulting string is 12 digits and starts with 91 (e.g. 919876543210 or 919198765432), strip leading 91
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.length > 12 && cleaned.startsWith('9191')) {
    // Handle edge case like 91919876543210 (14 digits) -> 9876543210
    cleaned = cleaned.replace(/^(91)+/, '');
    if (cleaned.length === 10) return cleaned;
  }

  return cleaned;
};

/**
 * Formats a phone number into international E.164 format (+91XXXXXXXXXX).
 * 
 * @param {string} phone 
 * @returns {string}
 */
export const formatE164 = (phone) => {
  const digits = normalizePhoneNumber(phone);
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (phone.startsWith('+')) return phone;
  return `+${digits}`;
};

/**
 * Formats a phone number for SMS providers expecting "91XXXXXXXXXX" format without the "+".
 * 
 * @param {string} phone 
 * @returns {string}
 */
export const formatWithCountryCode = (phone) => {
  const digits = normalizePhoneNumber(phone);
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
};

/**
 * Validates if the phone number is a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9).
 * 
 * @param {string} phone 
 * @returns {boolean}
 */
export const isValidIndianPhone = (phone) => {
  const digits = normalizePhoneNumber(phone);
  return /^[6-9]\d{9}$/.test(digits);
};

export default {
  normalizePhoneNumber,
  formatE164,
  formatWithCountryCode,
  isValidIndianPhone,
};
