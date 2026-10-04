import app from './app.js';
import { config, validateProductionConfig } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { backfillProductModels } from './services/productModelBackfill.service.js';
import { refreshCatalogFields } from './models/Product.js';
import { CATALOG_FIELDS_VERSION } from './utils/productCatalogFields.js';

let server;

const startServer = async () => {
  validateProductionConfig();
  const PORT = process.env.PORT || config.port || 5000;
  const HOST = '0.0.0.0';

  try {
    // 1. Immediately bind and listen to the port on 0.0.0.0 so platform port-scanners (Render/Docker) succeed instantly
    server = app.listen(PORT, HOST, () => {
      console.log(
        `[Server] Vinexus API running in [${config.nodeEnv}] mode bound to ${HOST}:${PORT}`
      );
      console.log(`[Server] Health Check: http://${HOST}:${PORT}${config.apiBaseUrl}/health`);
      // Tells PM2 (wait_ready) this instance accepts traffic, so zero-downtime
      // reloads only stop an old instance once its replacement is up.
      if (process.send) process.send('ready');
    });
    // A server that cannot listen (e.g. port taken) must exit so PM2 restarts
    // it, rather than staying "online" without serving anything.
    server.on('error', (error) => {
      console.error(`[Server] HTTP server error: ${error.message}`);
      process.exit(1);
    });
    // Outlive nginx's upstream keep-alive (60s) so nginx never reuses a socket
    // that Node has just closed (which shows up as random 502s).
    server.keepAliveTimeout = 65 * 1000;
    server.headersTimeout = 66 * 1000;

    // 2. Connect to MongoDB asynchronously after port binding
    await connectDB();
    // One-off data maintenance runs on a single instance only; under PM2
    // cluster mode the other instances would race it.
    if (!config.isPrimaryInstance) return;
    const modelBackfill = await backfillProductModels();
    if (modelBackfill.updated > 0) {
      console.log(`[Server] Assigned unique model data to ${modelBackfill.updated} existing products.`);
    }
    // Derive stored catalog search/filter fields for products written before
    // they existed (or before CATALOG_FIELDS_VERSION last changed).
    const catalogRefreshed = await refreshCatalogFields({ catalogFieldsVersion: { $ne: CATALOG_FIELDS_VERSION } });
    if (catalogRefreshed > 0) {
      console.log(`[Server] Derived catalog search fields for ${catalogRefreshed} products.`);
    }
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
    // Idle keep-alive sockets would otherwise hold close() open; in-flight
    // requests still finish. Force exit before PM2's kill_timeout (10s).
    server.closeIdleConnections?.();
    setTimeout(() => {
      console.error('[Server] Shutdown timed out; forcing exit');
      process.exit(1);
    }, 8000).unref();
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
