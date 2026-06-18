import jwt from 'jsonwebtoken';
import config from '../config/env.config.js';
import User from '../models/User.model.js';
import { UnauthorizedError } from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';

/**
 * Authentication middleware that protects routes by verifying JWT tokens.
 *
 * Extracts the Bearer token from the Authorization header, verifies it
 * against the configured secret, loads the associated user from the
 * database, and attaches the user object to `req.user`.
 *
 * @type {import('express').RequestHandler}
 * @throws {UnauthorizedError} When the token is missing, invalid, expired,
 *   or the user no longer exists.
 */
export const protect = catchAsync(async (req, _res, next) => {
  // 1. Extract token from the Authorization header
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new UnauthorizedError('No token provided. Please log in.');
  }

  // 2. Verify the token
  let decoded;
  try {
    decoded = jwt.verify(token, config.jwt.secret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Your session has expired. Please log in again.');
    }
    throw new UnauthorizedError('Invalid token. Please log in again.');
  }

  // 3. Check if the user still exists
  const user = await User.findById(decoded.id).select('-password');

  if (!user) {
    throw new UnauthorizedError('User no longer exists.');
  }

  // 4. Attach the user to the request and proceed
  req.user = user;
  next();
});
