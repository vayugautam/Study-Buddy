import multer from 'multer';
import config from '../config/env.config.js';
import { AppError } from '../utils/AppError.js';
import logger from '../utils/logger.js';

// ---------------------------------------------------------------------------
// Mongoose-error helpers
// ---------------------------------------------------------------------------

/**
 * Converts a Mongoose CastError (invalid ObjectId, etc.) into an
 * operational {@link AppError}.
 *
 * @param {Error & { path?: string; value?: unknown }} err
 * @returns {AppError}
 */
const handleCastError = (err) =>
  new AppError(
    `Invalid ID format: "${err.value}" is not a valid value for "${err.path}".`,
    404,
    'INVALID_ID'
  );

/**
 * Converts a MongoDB duplicate-key error (code 11000) into an operational
 * {@link AppError}.
 *
 * @param {Error & { keyValue?: Record<string, unknown> }} err
 * @returns {AppError}
 */
const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue || {})[0] || 'field';
  const value = err.keyValue?.[field];
  return new AppError(
    `Duplicate value for "${field}": "${value}". Please use a different value.`,
    409,
    'DUPLICATE_ENTRY'
  );
};

/**
 * Converts a Mongoose ValidationError into an operational {@link AppError}.
 *
 * @param {Error & { errors?: Record<string, { message: string }> }} err
 * @returns {AppError}
 */
const handleMongooseValidationError = (err) => {
  const messages = Object.values(err.errors || {}).map((e) => e.message);
  const appError = new AppError(
    `Validation failed: ${messages.join('. ')}`,
    400,
    'VALIDATION_FAILED'
  );
  appError.details = messages;
  return appError;
};

// ---------------------------------------------------------------------------
// JWT-error helpers
// ---------------------------------------------------------------------------

/**
 * Converts a JsonWebTokenError into an operational {@link AppError}.
 *
 * @returns {AppError}
 */
const handleJwtError = () =>
  new AppError(
    'Invalid token. Please log in again.',
    401,
    'INVALID_TOKEN'
  );

/**
 * Converts a TokenExpiredError into an operational {@link AppError}.
 *
 * @returns {AppError}
 */
const handleJwtExpiredError = () =>
  new AppError(
    'Your session has expired. Please log in again.',
    401,
    'TOKEN_EXPIRED'
  );

// ---------------------------------------------------------------------------
// Multer-error helper
// ---------------------------------------------------------------------------

/**
 * Converts a Multer MulterError into an operational {@link AppError}.
 *
 * @param {import('multer').MulterError} err
 * @returns {AppError}
 */
const handleMulterError = (err) => {
  const messages = {
    LIMIT_FILE_SIZE: 'File size exceeds the allowed limit.',
    LIMIT_FILE_COUNT: 'Too many files uploaded.',
    LIMIT_FIELD_KEY: 'Field name is too long.',
    LIMIT_FIELD_VALUE: 'Field value is too long.',
    LIMIT_FIELD_COUNT: 'Too many fields in the request.',
    LIMIT_UNEXPECTED_FILE: `Unexpected file field: "${err.field}".`,
  };

  return new AppError(
    messages[err.code] || 'File upload error.',
    400,
    'UPLOAD_ERROR'
  );
};

// ---------------------------------------------------------------------------
// Send helpers
// ---------------------------------------------------------------------------

/**
 * Sends an operational (expected) error response in the standard envelope.
 *
 * @param {AppError} err
 * @param {import('express').Response} res
 */
const sendOperationalError = (err, res) => {
  const payload = {
    status: 'error',
    error: {
      code: err.errorCode,
      message: err.message,
    },
  };

  if (err.details) {
    payload.error.details = err.details;
  }

  res.status(err.statusCode).json(payload);
};

/**
 * Sends the full error (including stack trace) during development.
 *
 * @param {Error & { statusCode?: number; errorCode?: string; details?: unknown }} err
 * @param {import('express').Response} res
 */
const sendDevError = (err, res) => {
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    status: 'error',
    error: {
      code: err.errorCode || 'INTERNAL_ERROR',
      message: err.message,
      details: err.details || null,
      stack: err.stack,
    },
  });
};

/**
 * Sends a generic 500 response in production when the error is not
 * operational (programmer bug, unexpected crash, etc.).
 *
 * @param {Error} err
 * @param {import('express').Response} res
 */
const sendProdError = (err, res) => {
  // Log full error for debugging on the server
  logger.error('Unexpected error:', {
    message: err.message,
    stack: err.stack,
    name: err.name,
  });

  res.status(500).json({
    status: 'error',
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong on our end.',
    },
  });
};

// ---------------------------------------------------------------------------
// Global error-handling middleware (4-param signature)
// ---------------------------------------------------------------------------

/**
 * Global Express error-handling middleware.
 *
 * Normalises known third-party / library errors (Mongoose, JWT, Multer) into
 * operational {@link AppError} instances, then responds with the standard
 * API error envelope.
 *
 * @param {Error} err   - The error thrown or passed to `next(err)`.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
// eslint-disable-next-line no-unused-vars
const globalErrorHandler = (err, req, res, _next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  try {
    import('fs').then(fs => fs.appendFileSync('errors.log', JSON.stringify({
      timestamp: new Date().toISOString(),
      message: err.message,
      stack: err.stack,
      body: req.body,
      query: req.query,
      path: req.path,
      headers: req.headers
    }, null, 2) + '\n\n'));
  } catch (e) {}

  // ---- Development mode: send everything ----------------------------------
  if (config.env === 'development') {
    // Still normalise known errors so the response shape is consistent
    let devErr = err;

    if (err.name === 'CastError') devErr = handleCastError(err);
    else if (err.code === 11000) devErr = handleDuplicateKeyError(err);
    else if (err.name === 'ValidationError' && !err.isOperational)
      devErr = handleMongooseValidationError(err);
    else if (err instanceof multer.MulterError) devErr = handleMulterError(err);
    else if (err.name === 'JsonWebTokenError') devErr = handleJwtError();
    else if (err.name === 'TokenExpiredError') devErr = handleJwtExpiredError();

    return sendDevError(devErr, res);
  }

  // ---- Production mode: normalise then decide -----------------------------
  let error = err;

  if (err.name === 'CastError') error = handleCastError(err);
  else if (err.code === 11000) error = handleDuplicateKeyError(err);
  else if (err.name === 'ValidationError' && !err.isOperational)
    error = handleMongooseValidationError(err);
  else if (err instanceof multer.MulterError) error = handleMulterError(err);
  else if (err.name === 'JsonWebTokenError') error = handleJwtError();
  else if (err.name === 'TokenExpiredError') error = handleJwtExpiredError();

  if (error.isOperational) {
    return sendOperationalError(error, res);
  }

  return sendProdError(error, res);
};

export default globalErrorHandler;
