import { afterEach, expect, jest, test } from '@jest/globals';
import { AuditLog } from '../../backend/src/audit/audit.js';
import { Session } from '../../backend/src/models/Session.js';
import { ensureRetentionIndexes } from '../../backend/src/services/dataRetention.service.js';
import { buildAuditFilter } from '../../backend/src/services/auditReport.service.js';
import { getEffectiveSessionExpiry, isSessionExpired } from '../../backend/src/utils/session.util.js';
import { retentionCutoff } from '../../shared/dataRetention.js';

afterEach(() => jest.restoreAllMocks());
test('MongoDB TTL indexes expire audit logs at 30 days and session records at 7 days', () => {
  expect(AuditLog.schema.indexes()).toContainEqual([{ createdAt: 1 }, expect.objectContaining({ name: 'audit_retention_30_days', expireAfterSeconds: 2592000 })]);
  expect(Session.schema.indexes()).toContainEqual([{ createdAt: 1 }, expect.objectContaining({ name: 'session_retention_7_days', expireAfterSeconds: 604800 })]);
});
test('startup installs the retention indexes explicitly without an application delete loop', async () => {
  const audit = jest.spyOn(AuditLog.collection, 'createIndex').mockResolvedValue('audit_retention_30_days');
  const session = jest.spyOn(Session.collection, 'createIndex').mockResolvedValue('session_retention_7_days');
  await ensureRetentionIndexes();
  expect(audit).toHaveBeenCalledWith({ createdAt: 1 }, { name: 'audit_retention_30_days', expireAfterSeconds: 2592000 });
  expect(session).toHaveBeenCalledWith({ createdAt: 1 }, { name: 'session_retention_7_days', expireAfterSeconds: 604800 });
});
test('reports cannot request logs older than 30 days while waiting for the database TTL sweep', () => {
  const now = new Date('2026-11-07T12:00:00Z');
  expect(buildAuditFilter({}, now).createdAt.$gte).toEqual(new Date('2026-10-08T12:00:00Z'));
  expect(buildAuditFilter({ from: '2026-01-01T00:00:00Z' }, now).createdAt.$gte).toEqual(retentionCutoff(30, now));
  expect(buildAuditFilter({ from: '2026-11-01T00:00:00Z' }, now).createdAt.$gte).toEqual(new Date('2026-11-01T00:00:00Z'));
});
test('legacy admin/dealer sessions expire at 7 days and activity cannot extend that boundary', () => {
  for (const userType of ['admin', 'dealer']) {
    const session = { userType, issuedAt: new Date('2026-11-01T12:00:00Z'), createdAt: new Date('2026-11-01T12:00:00Z'), lastActiveAt: new Date('2026-11-07T12:00:00Z'), expiresAt: new Date('2026-12-01T12:00:00Z') };
    expect(getEffectiveSessionExpiry(session)).toEqual(new Date('2026-11-08T12:00:00Z'));
    expect(isSessionExpired(session, new Date('2026-11-08T11:59:59Z'))).toBe(false);
    expect(isSessionExpired(session, new Date('2026-11-08T12:00:00Z'))).toBe(true);
  }
});
test('earlier explicit expiry and the creation-time retention deadline are never extended', () => {
  expect(getEffectiveSessionExpiry({ userType: 'dealer', issuedAt: '2026-11-03T00:00:00Z', createdAt: '2026-11-01T00:00:00Z', expiresAt: '2026-12-01T00:00:00Z' })).toEqual(new Date('2026-11-08T00:00:00Z'));
  expect(getEffectiveSessionExpiry({ userType: 'dealer', issuedAt: '2026-11-03T00:00:00Z', expiresAt: '2026-11-04T00:00:00Z' })).toEqual(new Date('2026-11-04T00:00:00Z'));
  expect(isSessionExpired({ userType: 'admin' })).toBe(true);
});
