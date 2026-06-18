/**
 * @module utils/catchAsync
 * @description Wraps async Express route handlers so rejected promises
 * are automatically forwarded to the global error-handling middleware.
 */

/**
 * Wraps an async Express handler to catch rejected promises.
 * @param {Function} fn - Async route handler (req, res, next) => Promise<void>.
 * @returns {Function} Express-compatible middleware that forwards errors to `next`.
 */
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default catchAsync;
