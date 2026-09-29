import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import config from './config/env.config.js';
import { mountRoutes } from './routes/index.js';
import { globalLimiter } from './middlewares/rateLimiter.middleware.js';
import globalErrorHandler from './middlewares/error.middleware.js';
import { NotFoundError } from './utils/AppError.js';

/* ------------------------------------------------------------------ */
/*  Create Express Application                                        */
/* ------------------------------------------------------------------ */

const app = express();

/* ------------------------------------------------------------------ */
/*  Global Middleware                                                  */
/* ------------------------------------------------------------------ */

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disabled to prevent blocking React's inline styles/scripts in production
}));

// CORS
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
  }),
);

// Body parsers
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Cookie parser
app.use(cookieParser());

// Sanitise MongoDB query injections
app.use(mongoSanitize());

// HTTP request logging (development only)
if (config.env === 'development') {
  app.use(morgan('dev'));
}

// Global rate limiter


app.use(globalLimiter);

/* ------------------------------------------------------------------ */
/*  Frontend Serving (Production) - static assets BEFORE routes      */
/* ------------------------------------------------------------------ */

if (config.env === 'production') {
  const frontendDistPath = path.join(__dirname, '../../dist');
  // Serve static assets (JS, CSS, images) FIRST so they are never
  // intercepted by the API router or the catch-all below.
  app.use(express.static(frontendDistPath, { index: false }));
}

/* ------------------------------------------------------------------ */
/*  Routes                                                            */
/* ------------------------------------------------------------------ */

mountRoutes(app);

/* ------------------------------------------------------------------ */
/*  Catch-all: SPA fallback & 404 Handler                             */
/* ------------------------------------------------------------------ */

if (config.env === 'production') {
  const frontendDistPath = path.join(__dirname, '../../dist');
  // All non-API, non-asset requests get the React shell
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
} else {
  // Development 404 handler for API routes
  app.all('*', (req, _res, next) => {
    next(new NotFoundError(`Route ${req.originalUrl}`));
  });
}

/* ------------------------------------------------------------------ */
/*  Global Error Handler (must be last)                               */
/* ------------------------------------------------------------------ */

app.use(globalErrorHandler);

export default app;
