import { describe, expect, test } from '@jest/globals';
import { getEffectiveSessionExpiry, getSessionExpiryForRole, isSessionExpired } from '../../backend/src/utils/session.util.js';

describe('role-based session expiry', () => {
  const issuedAt = new Date('2026-10-04T00:00:00.000Z');

  test('customer sessions expire after exactly 24 hours', () => {
    expect(getSessionExpiryForRole('customer', issuedAt).toISOString()).toBe('2026-10-05T00:00:00.000Z');
  });

  test('dealer and admin sessions retain the configured refresh lifetime', () => {
    expect(getSessionExpiryForRole('dealer', issuedAt).toISOString()).toBe('2026-11-03T00:00:00.000Z');
    expect(getSessionExpiryForRole('admin', issuedAt).toISOString()).toBe('2026-11-03T00:00:00.000Z');
  });

  test('legacy 30-day customer sessions are capped at 24 hours', () => {
    const legacy = { userType: 'customer', issuedAt, expiresAt: new Date('2026-11-03T00:00:00.000Z') };
    expect(getEffectiveSessionExpiry(legacy).toISOString()).toBe('2026-10-05T00:00:00.000Z');
    expect(isSessionExpired(legacy, new Date('2026-10-05T00:00:01.000Z'))).toBe(true);
  });
});
