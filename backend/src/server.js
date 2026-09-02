import app from './app.js';
import { config } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';

let server;

const startServer = async () => {
  try {
    // 1. Connect to MongoDB before accepting HTTP traffic
    await connectDB();

    // 2. Start HTTP server
    server = app.listen(config.port, () => {
      console.log(
        `[Server] Vinexus API running in [${config.nodeEnv}] mode on port ${config.port}`
      );
      console.log(`[Server] Health Endpoint: http://localhost:${config.port}${config.apiBaseUrl}/health`);
    });
  } catch (error) {
    console.error(`[Server] Critical failure during startup: ${error.message}`);
    process.exit(1);
  }
};

// Graceful Shutdown Handler
const gracefulShutdown = async (signal) => {
  console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);

  if (server) {
    server.close(async () => {
      console.log('[Server] HTTP server closed');
      try {
        await disconnectDB();
        console.log('[Server] Graceful shutdown complete');
        process.exit(0);
      } catch (err) {
        console.error('[Server] Error during database disconnect:', err);
        process.exit(1);
      }
    });
  } else {
    process.exit(0);
  }
};

// Process Level Exception Listener Handlers
process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled Rejection:', reason);
  if (server) {
    gracefulShutdown('unhandledRejection');
  } else {
    process.exit(1);
  }
});

process.on('uncaughtException', (error) => {
  console.error('[Server] Uncaught Exception:', error);
  process.exit(1);
});

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();
