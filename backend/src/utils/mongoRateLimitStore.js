import mongoose from 'mongoose';

const COLLECTION = 'rate_limits';
let ttlIndexReady = null;

const ensureTtlIndex = (collection) => {
  if (!ttlIndexReady) {
    // Expired windows are removed by MongoDB itself.
    ttlIndexReady = collection.createIndex({ resetAt: 1 }, { expireAfterSeconds: 0 }).catch((error) => {
      ttlIndexReady = null;
      throw error;
    });
  }
  return ttlIndexReady;
};

/**
 * express-rate-limit store shared by every server process through MongoDB,
 * so limits hold across PM2 cluster instances instead of per process.
 * Each limiter needs its own instance with a distinct prefix.
 */
export class MongoRateLimitStore {
  constructor({ prefix }) {
    this.prefix = `${prefix}:`;
    this.localKeys = false;
    this.windowMs = 60 * 1000;
  }

  init(options) {
    this.windowMs = options.windowMs;
  }

  get collection() {
    return mongoose.connection.collection(COLLECTION);
  }

  async increment(key) {
    const collection = this.collection;
    await ensureTtlIndex(collection);
    const now = new Date();
    const windowEnd = new Date(now.getTime() + this.windowMs);
    const expired = { $or: [{ $eq: [{ $type: '$resetAt' }, 'missing'] }, { $lte: ['$resetAt', now] }] };
    const update = [
      { $set: { _expired: expired } },
      { $set: {
        hits: { $cond: ['$_expired', 1, { $add: ['$hits', 1] }] },
        resetAt: { $cond: ['$_expired', windowEnd, '$resetAt'] },
      } },
      { $unset: '_expired' },
    ];
    const run = () => collection.findOneAndUpdate({ _id: this.prefix + key }, update, { upsert: true, returnDocument: 'after' });

    let doc;
    try {
      doc = await run();
    } catch (error) {
      // Two processes upserting the same new key at once: the loser retries
      // and increments the document the winner created.
      if (error?.code !== 11000) throw error;
      doc = await run();
    }
    return { totalHits: doc.hits, resetTime: doc.resetAt };
  }

  async decrement(key) {
    await this.collection.updateOne(
      { _id: this.prefix + key, resetAt: { $gt: new Date() }, hits: { $gt: 0 } },
      { $inc: { hits: -1 } }
    );
  }

  async resetKey(key) {
    await this.collection.deleteOne({ _id: this.prefix + key });
  }
}

export default MongoRateLimitStore;
