import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env.js';
import { httpLogger } from './utils/logger.js';
import apiRouter from './routes/index.js';
import { notFoundHandler } from './middlewares/notFoundHandler.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { mongoSanitize } from './middlewares/mongoSanitize.js';
import { apiRateLimiter } from './middlewares/rateLimiter.js';

const app = express();

// 1. Security HTTP headers
app.use(helmet());

// 2. Cross-Origin Resource Sharing
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman) or matching allowed origins
      if (!origin || config.corsOrigin.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('CORS Policy violation: Origin not allowed'));
    },
    credentials: true,
  })
);

// 3. Body Parsing Middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 4. NoSQL Operator Injection Sanitization Middleware
app.use(mongoSanitize);

// 5. Rate Limiter Middleware
app.use(config.apiBaseUrl, apiRateLimiter);

// 6. Request Logging
app.use(httpLogger);

// 7. API Routes
app.use(config.apiBaseUrl, apiRouter);

// 8. Resource Not Found (404) Handler
app.use(notFoundHandler);

// 9. Centralized Error Handler Middleware
app.use(errorHandler);

export default app;

