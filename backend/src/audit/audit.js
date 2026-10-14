import mongoose from 'mongoose';
import { AppError } from '../utils/AppError.js';
import { AsyncLocalStorage } from 'node:async_hooks';

export const auditContext = new AsyncLocalStorage();
const schema = new mongoose.Schema({
  requestId: { type: String, index: true }, actor: { type: Object, required: true },
  section: String, method: String, path: String, ip: String, userAgent: String,
  location: Object, entity: String, operation: String,
  status: { type: String, enum: ['pending', 'applied', 'failed'], default: 'pending' },
  attempted: mongoose.Schema.Types.Mixed, documents: [mongoose.Schema.Types.Mixed],
  createdAt: { type: Date, default: Date.now }, completedAt: Date,
}, { versionKey: false });
schema.index({ createdAt: -1, _id: -1 });
schema.index({ 'actor.id': 1, createdAt: -1 });
export const AuditLog = mongoose.model('AuditLog', schema);

const secret = /password|token|secret|credential|otp|privatekey|authorization|cookie/i;
export const redactAudit = value => {
  if (Array.isArray(value)) return value.map(redactAudit);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, entry]) =>
    [key, secret.test(key) ? '[REDACTED]' : redactAudit(entry)]));
  return value;
};
const plain = value => value == null ? null : JSON.parse(JSON.stringify(value));
export const auditChanges = (before, after, path = '') => {
  if (JSON.stringify(before) === JSON.stringify(after)) return [];
  if (before && after && typeof before === 'object' && typeof after === 'object' && !Array.isArray(before) && !Array.isArray(after)) {
    return [...new Set([...Object.keys(before), ...Object.keys(after)])].flatMap(key => auditChanges(before[key], after[key], path ? `${path}.${key}` : key));
  }
  const sensitive = path.split('.').some(key => secret.test(key));
  return [{ field: path || '$document', before: sensitive ? '[REDACTED]' : redactAudit(before ?? null), after: sensitive ? '[REDACTED]' : redactAudit(after ?? null) }];
};

export const readAuditLocation = headers => {
  try {
    const value = JSON.parse(headers['x-admin-location'] || '{}');
    const timestamp = Number(value.timestamp);
    if (value.status === 'available' && Number.isFinite(value.latitude) && Math.abs(value.latitude) <= 90 &&
      Number.isFinite(value.longitude) && Math.abs(value.longitude) <= 180 && Number.isFinite(value.accuracy) && value.accuracy >= 0 &&
      Number.isFinite(timestamp) && Math.abs(Date.now() - timestamp) <= 5 * 60 * 1000) {
      return { status: 'available', latitude: value.latitude, longitude: value.longitude, accuracy: value.accuracy,
        capturedAt: new Date(timestamp), source: 'browser-reported' };
    }
    return { status: ['denied', 'unavailable', 'timeout'].includes(value.status) ? value.status : 'unavailable' };
  } catch { return { status: 'unavailable' }; }
};

// Wrap native collection writes after Mongoose casting. Both snapshots and the
// journal insert share the write transaction, so concurrent edits cannot be
// misattributed and an unavailable journal prevents an unlogged change.
export const installAuditCollection = (model) => {
  const collection = model.collection;
  if (collection.$auditInstalled || model.modelName === 'AuditLog') return;
  collection.$auditInstalled = true;
  const methods = ['insertOne', 'insertMany', 'updateOne', 'updateMany', 'replaceOne',
    'findOneAndUpdate', 'findOneAndReplace', 'deleteOne', 'deleteMany', 'findOneAndDelete', 'bulkWrite'];
  for (const operation of methods) {
    const original = collection[operation];
    if (typeof original !== 'function') continue;
    collection[operation] = async function (...args) {
      const context = auditContext.getStore();
      if (!context?.actor) return original.apply(this, args);
      const optionsIndex = ['updateOne', 'updateMany', 'replaceOne', 'findOneAndUpdate', 'findOneAndReplace'].includes(operation) ? 2 : 1;
      const options = args[optionsIndex] || {};
      const externalSession = options.session;
      const session = externalSession || await model.db.startSession();
      const perform = async () => {
        const writeArgs = [...args]; writeArgs[optionsIndex] = { ...options, session };
        const before = [], inserted = [];
        const read = async (filter, one = false) => {
          const cursor = await collection.find(filter, { session, ...(options.sort ? { sort: options.sort } : {}),
            ...(options.collation ? { collation: options.collation } : {}) });
          return (one ? cursor.limit(1) : cursor).toArray();
        };
        if (operation === 'bulkWrite') {
          for (const item of args[0]) {
            if (item.insertOne) { item.insertOne.document._id ||= new mongoose.Types.ObjectId(); inserted.push(item.insertOne.document._id); }
            for (const key of ['updateOne', 'updateMany', 'replaceOne', 'deleteOne', 'deleteMany']) {
              if (item[key]) before.push(...await read(item[key].filter, !key.endsWith('Many')));
            }
          }
        } else if (operation.startsWith('insert')) {
          for (const doc of operation === 'insertOne' ? [args[0]] : args[0]) { doc._id ||= new mongoose.Types.ObjectId(); inserted.push(doc._id); }
        } else before.push(...await read(args[0], !operation.endsWith('Many')));
        const findAndModify = operation.startsWith('findOneAnd');
        if (findAndModify) writeArgs[optionsIndex].includeResultMetadata = true;
        const result = await original.apply(this, writeArgs);
        const ids = [...before.map(doc => doc._id), ...inserted];
        if (result?.lastErrorObject?.upserted) ids.push(result.lastErrorObject.upserted);
        if (result?.upsertedId) ids.push(result.upsertedId);
        if (result?.upsertedIds) ids.push(...Object.values(result.upsertedIds));
        const returned = result?.value || result;
        if (returned?._id) ids.push(returned._id);
        const after = ids.length ? await read({ _id: { $in: ids } }) : [];
        const beforeMap = new Map(plain(before).map(doc => [String(doc._id), doc]));
        const afterMap = new Map(plain(after).map(doc => [String(doc._id), doc]));
        const documents = [...new Set([...beforeMap.keys(), ...afterMap.keys()])].flatMap(id => {
          const old = beforeMap.get(id) || null, current = afterMap.get(id) || null;
          const changes = auditChanges(old, current);
          return changes.length ? [{ id, before: redactAudit(old), after: redactAudit(current), changes }] : [];
        });
        if (documents.length) await AuditLog.collection.insertOne({ ...context, entity: model.modelName, operation,
          status: 'applied', attempted: redactAudit(plain(args.slice(0, optionsIndex))), documents,
          createdAt: new Date(), completedAt: new Date() }, { session });
        return findAndModify && !options.includeResultMetadata ? result?.value ?? null : result;
      };
      try {
        if (session.inTransaction()) return await perform();
        let result;
        await session.withTransaction(async () => { result = await perform(); });
        return result;
      } catch (error) {
        if (error.code === 20) throw new AppError('Audit logging requires a MongoDB replica set. No changes were saved.', 503, 'AUDIT_UNAVAILABLE');
        throw error;
      } finally { if (!externalSession) await session.endSession(); }
    };
  }
};
mongoose.plugin(modelSchema => {
  if (modelSchema !== schema) modelSchema.on('init', installAuditCollection);
});
