import mongoose from 'mongoose';

export const getHealthStatus = async () => {
  const dbStateMap = {
    0: 'DISCONNECTED',
    1: 'CONNECTED',
    2: 'CONNECTING',
    3: 'DISCONNECTING',
  };

  const dbState = mongoose.connection.readyState;
  const isDbConnected = dbState === 1;

  return {
    status: 'UP',
    database: dbStateMap[dbState] || 'UNKNOWN',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
  };
};
