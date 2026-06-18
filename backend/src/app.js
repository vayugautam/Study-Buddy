import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import cookieParser from 'cookie-parser';

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
app.use(helmet());

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
/*  Routes                                                            */
/* ------------------------------------------------------------------ */

mountRoutes(app);

/* ------------------------------------------------------------------ */
/*  404 Handler                                                       */
/* ------------------------------------------------------------------ */

app.all('*', (req, _res, next) => {
  next(new NotFoundError(`Route ${req.originalUrl}`));
});

/* ------------------------------------------------------------------ */
/*  Global Error Handler (must be last)                               */
/* ------------------------------------------------------------------ */

app.use(globalErrorHandler);

export default app;
