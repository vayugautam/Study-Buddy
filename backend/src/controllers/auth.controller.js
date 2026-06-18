/**
 * @module controllers/auth
 * @description Thin controller layer for authentication endpoints.
 * Extracts request data, delegates to authService, and sends responses.
 */

import authService from '../services/auth.service.js';
import catchAsync from '../utils/catchAsync.js';
import { successResponse } from '../utils/apiResponse.js';
import config from '../config/env.config.js';

/**
 * Registers a new user account.
 * Sets a refresh-token HttpOnly cookie and returns the user + access token.
 * @type {import('express').RequestHandler}
 */
const register = catchAsync(async (req, res) => {
  const { name, email, password } = req.body;
  const result = await authService.register({ name, email, password });

  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  successResponse(res, { user: result.user, accessToken: result.accessToken }, 201);
});

/**
 * Authenticates an existing user with email and password.
 * Sets a refresh-token HttpOnly cookie and returns the user + access token.
 * @type {import('express').RequestHandler}
 */
const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login({ email, password });

  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  successResponse(res, { user: result.user, accessToken: result.accessToken });
});

/**
 * Returns the currently authenticated user's profile.
 * Requires a valid access token (auth middleware must run first).
 * @type {import('express').RequestHandler}
 */
const getMe = catchAsync(async (req, res) => {
  const user = await authService.getMe(req.user._id);
  successResponse(res, { user });
});

/**
 * Logs out the current user by clearing the refresh-token cookie.
 * @type {import('express').RequestHandler}
 */
const logout = catchAsync(async (req, res) => {
  res.cookie('refreshToken', '', {
    httpOnly: true,
    expires: new Date(0),
  });

  successResponse(res, { message: 'Successfully logged out.' });
});

const updateProfile = catchAsync(async (req, res) => {
  const user = await authService.updateProfile(req.user._id, req.body);
  successResponse(res, { user });
});

const changePassword = catchAsync(async (req, res) => {
  await authService.changePassword(req.user._id, req.body);
  successResponse(res, { message: 'Password updated successfully.' });
});

const deleteAccount = catchAsync(async (req, res) => {
  await authService.deleteAccount(req.user._id);
  res.cookie('refreshToken', '', {
    httpOnly: true,
    expires: new Date(0),
  });
  successResponse(res, { message: 'Account deleted successfully.' });
});

export { register, login, getMe, logout, updateProfile, changePassword, deleteAccount };
