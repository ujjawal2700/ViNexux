export const AUDIT_RETENTION_DAYS = 30;
export const SESSION_RETENTION_DAYS = 7;
export const DAY_MS = 24 * 60 * 60 * 1000;
export const retentionCutoff = (days, now = new Date()) => new Date(new Date(now).getTime() - days * DAY_MS);
