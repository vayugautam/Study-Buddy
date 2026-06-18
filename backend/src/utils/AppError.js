/**
 * @module utils/AppError
 * @description Custom error class hierarchy for structured, operational error handling.
 */

/**
 * Base application error class. All operational errors should extend this.
 * @extends Error
 */
class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message.
   * @param {number} statusCode - HTTP status code.
   * @param {string} errorCode - Machine-readable error code for API consumers.
   */
  constructor(message, statusCode, errorCode) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when request payload fails validation.
 * @extends AppError
 */
class ValidationError extends AppError {
  /**
   * @param {string[]} details - Array of field-level error strings.
   */
  constructor(details) {
    super('Validation failed', 400, 'VALIDATION_FAILED');
    this.details = details;
  }
}

/**
 * Thrown when a request lacks valid authentication credentials.
 * @extends AppError
 */
class UnauthorizedError extends AppError {
  /**
   * @param {string} [message='Authentication required'] - Error message.
   */
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHENTICATED');
  }
}

/**
 * Thrown when an authenticated user lacks permission for the requested action.
 * @extends AppError
 */
class ForbiddenError extends AppError {
  /**
   * @param {string} [message='Insufficient permissions'] - Error message.
   */
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'INSUFFICIENT_PERMS');
  }
}

/**
 * Thrown when the requested resource does not exist.
 * @extends AppError
 */
class NotFoundError extends AppError {
  /**
   * @param {string} [resource='Resource'] - Name of the resource that was not found.
   */
  constructor(resource = 'Resource') {
    super(`${resource} not found.`, 404, 'RESOURCE_NOT_FOUND');
  }
}

/**
 * Thrown when a request conflicts with the current state of a resource.
 * @extends AppError
 */
class ConflictError extends AppError {
  /**
   * @param {string} message - Description of the conflict.
   */
  constructor(message) {
    super(message, 409, 'RESOURCE_CONFLICT');
  }
}

/**
 * Thrown when a client exceeds the allowed request rate.
 * @extends AppError
 */
class RateLimitError extends AppError {
  constructor() {
    super('Too many requests. Please try again later.', 429, 'RATE_LIMIT_EXCEEDED');
  }
}

/**
 * Thrown when an upstream call to the Gemini LLM API fails.
 * @extends AppError
 */
class GeminiApiError extends AppError {
  /**
   * @param {string} message - Description of the upstream failure.
   * @param {number} [statusCode=502] - HTTP status code (defaults to 502 Bad Gateway).
   */
  constructor(message, statusCode = 502) {
    super(message, statusCode, 'LLM_UPSTREAM_FAIL');
  }
}

/**
 * Thrown when the LLM provider quota is exceeded.
 * @extends AppError
 */
class LlmQuotaExceededError extends AppError {
  constructor(message = 'LLM Quota Exceeded') {
    super(message, 429, 'LLM_QUOTA_EXCEEDED');
  }
}

export {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  GeminiApiError,
  LlmQuotaExceededError,
};
