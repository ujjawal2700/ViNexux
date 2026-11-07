import { AuditLog } from '../audit/audit.js';
import { Session } from '../models/Session.js';
import { AUDIT_RETENTION_DAYS, SESSION_RETENTION_DAYS } from '../../../shared/dataRetention.js';

// Explicit setup also installs these indexes when automatic model indexing is
// disabled. MongoDB performs cleanup itself, without generating more audit logs.
export async function ensureRetentionIndexes() {
  await AuditLog.collection.createIndex({ createdAt: 1 }, { name: 'audit_retention_30_days', expireAfterSeconds: AUDIT_RETENTION_DAYS * 86400 });
  await Session.collection.createIndex({ createdAt: 1 }, { name: 'session_retention_7_days', expireAfterSeconds: SESSION_RETENTION_DAYS * 86400 });
}
