/**
 * @module services/auth
 * @description Authentication service — handles registration, login, and
 * current-user retrieval. Token generation is co-located here because auth
 * tokens are an intrinsic part of the auth domain.
 */

import jwt from 'jsonwebtoken';
import config from '../config/env.config.js';
import User from '../models/User.model.js';
import { ConflictError, NotFoundError, UnauthorizedError } from '../utils/AppError.js';
import logger from '../utils/logger.js';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/**
 * Generate an access + refresh token pair for a given user ID.
 * @param {import('mongoose').Types.ObjectId} userId
 * @returns {{ accessToken: string, refreshToken: string }}
 */
const generateTokenPair = (userId) => {
  const accessToken = jwt.sign(
    { id: userId },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn },
  );

  const refreshToken = jwt.sign(
    { id: userId },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn },
  );

  return { accessToken, refreshToken };
};

/**
 * Shape a User document into the safe, public-facing user object
 * returned by auth endpoints.
 * @param {import('mongoose').Document} user
 * @returns {{ id: string, name: string, email: string, preferences: object }}
 */
const sanitiseUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  preferences: user.preferences,
});

/* ------------------------------------------------------------------ */
/*  Service                                                           */
/* ------------------------------------------------------------------ */

const authService = {
  /**
   * Register a new user account.
   * @param {{ name: string, email: string, password: string }} params
   * @returns {Promise<{ user: object, accessToken: string, refreshToken: string }>}
   * @throws {ConflictError} If the email is already registered.
   */
  async register({ name, email, password }) {
    const existing = await User.findOne({ email });
    if (existing) {
      throw new ConflictError('An account with this email already exists.');
    }

    // The User model's pre-save hook hashes passwordHash automatically.
    const user = await User.create({ name, email, passwordHash: password });

    const { accessToken, refreshToken } = generateTokenPair(user._id);

    logger.info('User registered', { userId: user._id, email });

    return {
      user: sanitiseUser(user),
      accessToken,
      refreshToken,
    };
  },

  /**
   * Authenticate an existing user with email + password.
   * @param {{ email: string, password: string }} params
   * @returns {Promise<{ user: object, accessToken: string, refreshToken: string }>}
   * @throws {UnauthorizedError} If credentials are invalid.
   */
  async login({ email, password }) {
    // passwordHash is excluded by default — explicitly select it.
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    const { accessToken, refreshToken } = generateTokenPair(user._id);

    logger.info('User logged in', { userId: user._id, email });

    return {
      user: sanitiseUser(user),
      accessToken,
      refreshToken,
    };
  },

  /**
   * Retrieve the currently authenticated user's profile.
   * @param {string} userId - The authenticated user's ID.
   * @returns {Promise<object>} The user document (without passwordHash).
   * @throws {NotFoundError} If the user no longer exists.
   */
  async getMe(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }
    return user;
  },

  /**
   * Update the user's profile.
   */
  async updateProfile(userId, { name, email, preferences }) {
    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (preferences) updates.preferences = preferences;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!user) throw new NotFoundError('User');
    return sanitiseUser(user);
  },

  /**
   * Change the user's password.
   */
  async changePassword(userId, { oldPassword, newPassword }) {
    const user = await User.findById(userId).select('+passwordHash');
    if (!user) throw new NotFoundError('User');
    
    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) throw new UnauthorizedError('Incorrect old password.');

    user.passwordHash = newPassword;
    await user.save();
  },

  /**
   * Delete the user's account.
   */
  async deleteAccount(userId) {
    const user = await User.findByIdAndDelete(userId);
    if (!user) throw new NotFoundError('User');
  },
};

export default authService;
