import { config } from '../config/env.js';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export const getSessionExpiryForRole = (role, issuedAt = new Date()) => {
  const issuedTime = new Date(issuedAt).getTime();
  const lifetimeMs = role === 'customer'
    ? config.customerSessionExpiryHours * HOUR_MS
    : config.jwtRefreshExpiryDays * DAY_MS;
  return new Date(issuedTime + lifetimeMs);
};

// Older customer sessions may have been created with the former 30-day
// expiry. This effective deadline applies the new 24-hour ceiling to them too.
export const getEffectiveSessionExpiry = (session) => {
  const storedExpiry = session?.expiresAt ? new Date(session.expiresAt) : null;
  if (session?.userType !== 'customer') return storedExpiry;

  const issuedAt = session.issuedAt || session.createdAt || new Date();
  const customerDeadline = getSessionExpiryForRole('customer', issuedAt);
  if (!storedExpiry || customerDeadline < storedExpiry) return customerDeadline;
  return storedExpiry;
};

export const isSessionExpired = (session, now = new Date()) => {
  const effectiveExpiry = getEffectiveSessionExpiry(session);
  return !effectiveExpiry || effectiveExpiry <= now;
};
