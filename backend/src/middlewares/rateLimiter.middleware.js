import rateLimit from 'express-rate-limit';
import config from '../config/env.config.js';

// ---------------------------------------------------------------------------
// Shared error-response builder
// ---------------------------------------------------------------------------

/**
 * Builds a standardised rate-limit error payload that conforms to the
 * application's API response envelope.
 *
 * @param {string} message - Human-readable error message.
 * @returns {{ status: string; error: { code: string; message: string } }}
 */
const rateLimitResponse = (message) => ({
  status: 'error',
  error: {
    code: 'RATE_LIMIT_EXCEEDED',
    message,
  },
});

// ---------------------------------------------------------------------------
// Global limiter – applied to every request
// ---------------------------------------------------------------------------

/**
 * General-purpose rate limiter applied to all API routes.
 *
 * Reads `windowMs` and `max` from the application config so the values can
 * be tuned per environment without code changes.
 *
 * @type {import('express').RequestHandler}
 */
export const globalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxReqs,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitResponse(
    'Too many requests. Please slow down and try again later.'
  ),
  skip: () => config.env === 'development',
});

// ---------------------------------------------------------------------------
// Auth limiter – login / signup / password-reset routes
// ---------------------------------------------------------------------------

/**
 * Stricter rate limiter for authentication endpoints (login, register,
 * forgot-password, etc.) to mitigate brute-force attacks.
 *
 * Allows a maximum of **5 requests per 15-minute window**.
 *
 * @type {import('express').RequestHandler}
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.env === 'development' ? 50 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitResponse(
    'Too many authentication attempts. Please try again after 15 minutes.'
  ),
  skip: () => config.env === 'development',
});

// ---------------------------------------------------------------------------
// LLM limiter – AI / generation endpoints
// ---------------------------------------------------------------------------

/**
 * Rate limiter for LLM-powered endpoints (quiz generation, flashcard
 * generation, chat, etc.) to control cost and prevent abuse.
 *
 * Allows a maximum of **10 requests per 1-minute window**.
 *
 * @type {import('express').RequestHandler}
 */
export const llmLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitResponse(
    'Too many AI requests. Please wait a moment and try again.'
  ),
});
