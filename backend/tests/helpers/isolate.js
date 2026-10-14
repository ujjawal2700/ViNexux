import mongoose from 'mongoose';
import { appendFileSync } from 'node:fs';

if (process.env.NODE_ENV !== 'test' || !/^vinexus_full_test_[a-z0-9_]+$/.test(process.env.TEST_DATABASE_NAME || '')) throw new Error('Run backend tests with the isolated integration runner.');
const connect = mongoose.connect.bind(mongoose);
mongoose.connect = async (_uri, options = {}) => {
  const dbName = options.dbName || process.env.TEST_DATABASE_NAME;
  if (!/^vinexus_[a-z0-9_]*test_[a-z0-9_]+$/.test(dbName)) throw new Error('Integration tests must use a disposable test database.');
  appendFileSync(process.env.TEST_DATABASE_MANIFEST, `${dbName}\n`);
  return connect('mongodb://127.0.0.1:27019/?replicaSet=vinexusAccessTest', { ...options, dbName, serverSelectionTimeoutMS: 5000 });
};
