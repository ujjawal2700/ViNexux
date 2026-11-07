import { AUDIT_RETENTION_DAYS, retentionCutoff } from '../../../shared/dataRetention.js';
import mongoose from 'mongoose';
import { z } from 'zod';
import { AuditLog, redactAudit } from '../audit/audit.js';
import { ADMIN_SECTIONS } from '../../../shared/adminAccess.js';
import { presentAuditLog, auditRecordLabel } from '../../../shared/auditPresentation.js';

export const logQuery = z.object({
  page: z.coerce.number().int().min(1).default(1), actorId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  section: z.enum(ADMIN_SECTIONS.map(s => s.key).concat(['access', 'profile', 'auth', 'enquiries'])).optional(),
  from: z.string().datetime().optional(), to: z.string().datetime().optional(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(), endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  status: z.enum(['pending', 'applied', 'failed']).optional(), search: z.string().trim().max(100).default(''),
}).refine(q => !q.from || !q.to || new Date(q.from) <= new Date(q.to), { message: 'From date must be before the to date.' });
export function buildAuditFilter(query, now = new Date()) {
  const cutoff = retentionCutoff(AUDIT_RETENTION_DAYS, now);
  const filter = { createdAt: { $gte: cutoff } };
  if (query.search) {
    const regex = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = ['actor.name', 'actor.email', 'entity', 'documents.id', 'documents.label', ...['name', 'fullName', 'companyName', 'modelNumber', 'sku', 'invoiceNumber', 'enquiryNumber'].flatMap(field => [`documents.before.${field}`, `documents.after.${field}`])].map(key => ({ [key]: regex }));
  }
  if (query.actorId) filter['actor.id'] = query.actorId;
  if (query.section) filter.section = query.section;
  if (query.status) filter.status = query.status;
  if (query.from) filter.createdAt.$gte = new Date(Math.max(cutoff.getTime(), new Date(query.from).getTime()));
  if (query.to) filter.createdAt.$lte = new Date(query.to);
  if (query.startTime || query.endTime) {
    const time = { $dateToString: { date: '$createdAt', format: '%H:%M', timezone: 'Asia/Kolkata' } };
    const conditions = [...(query.startTime ? [{ $gte: [time, query.startTime] }] : []), ...(query.endTime ? [{ $lte: [time, query.endTime] }] : [])];
    filter.$expr = { [query.startTime && query.endTime && query.startTime > query.endTime ? '$or' : '$and']: conditions };
  }
  return filter;
}
// Resolve account/product references for readable labels, using stored snapshots
// first so renames/deletions do not erase the name recorded at the time.
export async function readableAuditLogs(logs, { compact = false } = {}) {
  const references = {}, pending = new Map();
  for (const log of logs) for (const doc of log.documents || []) {
    references[String(doc.id)] ||= auditRecordLabel(doc, log.entity);
    const schema = mongoose.models[log.entity]?.schema;
    if (!schema) continue;
    const scan = (value, schema) => {
      if (!value || typeof value !== 'object') return;
      schema.eachPath((path, type) => {
        const entry = path.split('.').reduce((a, key) => a?.[key], value);
        const model = type.options?.ref;
        if (model && entry) {
          if (!pending.has(model)) pending.set(model, new Set());
          for (const item of Array.isArray(entry) ? entry : [entry]) if (mongoose.isValidObjectId(item)) pending.get(model).add(String(item));
        }
        if (type.schema && entry) for (const item of Array.isArray(entry) ? entry : [entry]) scan(item, type.schema);
      });
    };
    scan(doc.before, schema); scan(doc.after, schema);
  }
  for (const [model, ids] of pending) {
    const missing = [...ids].filter(id => !references[id]);
    if (!missing.length || !mongoose.models[model]) continue;
    const rows = await mongoose.models[model].find({ _id: { $in: missing } }).select('name fullName companyName email modelNumber sku invoiceNumber enquiryNumber').lean();
    for (const row of rows) references[String(row._id)] = auditRecordLabel({ id: row._id, after: row }, model);
  }
  return logs.map(raw => {
    const log = redactAudit(raw);
    return { _id: log._id, actor: log.actor, createdAt: log.createdAt, section: log.section, status: log.status, location: log.location,
      display: (() => { const view = presentAuditLog(log, references); return compact ? { ...view, records: view.records.slice(0, 2).map(record => ({ ...record, changes: [] })) } : view; })() };
  });
}
export const auditLogsQuery = filter => AuditLog.find(filter).select('-attempted').sort({ createdAt: -1, _id: -1 });

export const auditSummaryQuery = filter => AuditLog.find(filter).select('actor section entity operation status createdAt location documents.id documents.label ' + ['name', 'fullName', 'companyName', 'modelNumber', 'sku', 'invoiceNumber', 'enquiryNumber', 'productId', 'userId', 'categoryId', 'brandId'].flatMap(field => [`documents.before.${field}`, `documents.after.${field}`]).join(' ')).sort({ createdAt: -1, _id: -1 });
