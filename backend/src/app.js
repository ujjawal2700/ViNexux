import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config/env.js';
import { httpLogger } from './utils/logger.js';
import apiRouter from './routes/index.js';
import { notFoundHandler } from './middlewares/notFoundHandler.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { mongoSanitize } from './middlewares/mongoSanitize.js';
import { apiRateLimiter } from './middlewares/rateLimiter.js';

const app = express();

// Behind nginx every connection comes from the proxy; trusting it makes
// req.ip the real client address, which the rate limiters key on.
app.set('trust proxy', config.trustProxy);

// 1. Security HTTP headers
app.use(helmet({
  hsts: { maxAge: 31_536_000, includeSubDomains: false, preload: false },
}));

// 2. Cross-Origin Resource Sharing
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server) or matching allowed origins
      if (
        !origin ||
        config.corsOrigin.includes('*') ||
        config.corsOrigin.includes(origin) ||
        origin.endsWith('.vercel.app')
      ) {
        return callback(null, true);
      }
      return callback(new Error("Origin " + origin + " not allowed by CORS"))
    },
    credentials: true,
  })
);

// 3. Response compression (JSON catalog payloads compress well)
app.use(compression());

// 4. Body Parsing Middlewares (file uploads use multer, not these parsers)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 5. NoSQL Operator Injection Sanitization Middleware
app.use(mongoSanitize);

// 6. Rate Limiter Middleware
app.use(config.apiBaseUrl, apiRateLimiter);

// 7. Request Logging
app.use(httpLogger);

// 8. API Routes
app.use(config.apiBaseUrl, apiRouter);

// Root route: hosting platforms (Render, etc.) commonly health-check the
// bare "/" path. Respond with 200 instead of letting it fall through to a
// 404, which otherwise shows up as a false "error" in the platform logs
// on every health-check ping.
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Vinexus API is running.',
    healthCheck: `${config.apiBaseUrl}/health`,
  });
});

// 9. Resource Not Found (404) Handler
app.use(notFoundHandler);

// 10. Centralized Error Handler Middleware
app.use(errorHandler);

export default app;

