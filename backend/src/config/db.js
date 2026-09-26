import dns from 'dns';
import mongoose from 'mongoose';
import { config } from './env.js';

// Ensure Node.js resolves MongoDB Atlas SRV records via reliable public DNS
// This resolves 'querySrv ECONNREFUSED' common on Windows & ISP/router firewalls
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (dnsErr) {
  console.warn('[Database] Could not override default DNS servers:', dnsErr.message);
}

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[Database] MongoDB connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    
    mongoose.connection.on('error', (err) => {
      console.error('[Database] MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[Database] MongoDB connection disconnected');
    });

    return conn;
  } catch (error) {
    console.error(`[Database] Initial MongoDB connection failed: ${error.message}`);
    throw error;
  }
};

export const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('[Database] MongoDB connection closed');
  }
};
