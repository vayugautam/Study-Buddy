/**
 * @module utils/apiResponse
 * @description Standardised API response envelope helpers.
 */

import { AppError } from './AppError.js';

/**
 * Sends a success response with the standard envelope.
 * @param {import('express').Response} res - Express response object.
 * @param {*} data - Payload to include under the `data` key.
 * @param {number} [statusCode=200] - HTTP status code.
 */
export const successResponse = (res, data, statusCode = 200) => {
  res.status(statusCode).json({
    status: 'success',
    data,
  });
};

/**
 * Sends an error response with the standard envelope.
 * Handles {@link AppError} instances with their specific codes;
 * falls back to a generic 500 for unexpected errors.
 * @param {import('express').Response} res - Express response object.
 * @param {Error|AppError} error - The error to serialise.
 */
export const errorResponse = (res, error) => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      status: 'error',
      error: {
        code: error.errorCode,
        message: error.message,
        details: error.details || undefined,
      },
    });
    return;
  }

  // Unexpected / non-operational error — hide internals in production
  res.status(500).json({
    status: 'error',
    error: {
      code: 'INTERNAL_ERROR',
      message:
        process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred'
          : error.message,
    },
  });
};
