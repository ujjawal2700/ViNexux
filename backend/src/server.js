import app from './app.js';
import { config } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';

let server;

const startServer = async () => {
  const PORT = process.env.PORT || config.port || 5000;
  const HOST = '0.0.0.0';

  try {
    // 1. Immediately bind and listen to the port on 0.0.0.0 so platform port-scanners (Render/Docker) succeed instantly
    server = app.listen(PORT, HOST, () => {
      console.log(
        `[Server] Vinexus API running in [${config.nodeEnv}] mode bound to ${HOST}:${PORT}`
      );
      console.log(`[Server] Health Check: http://${HOST}:${PORT}${config.apiBaseUrl}/health`);
    });

    // 2. Connect to MongoDB asynchronously after port binding
    await connectDB();
  } catch (error) {
    console.error(`[Server] Startup warning/failure: ${error.message}`);
    // If database connection fails, keep process running so port scanner receives health response
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
});

process.on('uncaughtException', (error) => {
  console.error('[Server] Uncaught Exception:', error);
});

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();
