import { SESSION_RETENTION_DAYS } from '../../../shared/dataRetention.js';
import { config } from '../config/env.js';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export const getSessionExpiryForRole = (role, issuedAt = new Date()) => {
  const issuedTime = new Date(issuedAt).getTime();
  const lifetimeMs = role === 'customer'
    ? config.customerSessionExpiryHours * HOUR_MS
    : config.jwtRefreshExpiryDays * DAY_MS;
  return new Date(issuedTime + Math.min(lifetimeMs, SESSION_RETENTION_DAYS * DAY_MS));
};

// Apply the same limits to older sessions before MongoDB's TTL monitor runs.
export const getEffectiveSessionExpiry = (session) => {
  if (!session?.expiresAt) return null;
  const issuedAt = session.issuedAt || session.createdAt || new Date();
  const roleDeadline = getSessionExpiryForRole(session.userType, issuedAt);
  const retentionDeadline = new Date(new Date(session.createdAt || issuedAt).getTime() + SESSION_RETENTION_DAYS * DAY_MS);
  const deadlines = [session.expiresAt ? new Date(session.expiresAt) : null, roleDeadline, retentionDeadline].filter(Boolean);
  if (deadlines.some(date => Number.isNaN(date.getTime()))) return null;
  return new Date(Math.min(...deadlines.map(date => date.getTime())));
};

export const isSessionExpired = (session, now = new Date()) => {
  const effectiveExpiry = getEffectiveSessionExpiry(session);
  return !effectiveExpiry || effectiveExpiry <= now;
};
