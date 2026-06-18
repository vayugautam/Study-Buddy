/**
 * @module controllers/dashboard
 * @description Thin controller layer for the dashboard endpoint.
 * Returns aggregated study statistics for the authenticated user.
 */

import dashboardService from '../services/dashboard.service.js';
import catchAsync from '../utils/catchAsync.js';
import { successResponse } from '../utils/apiResponse.js';

/**
 * Retrieves aggregated dashboard data for the authenticated user,
 * including note counts, quiz scores, flashcard mastery, and recent activity.
 * @type {import('express').RequestHandler}
 */
const getDashboard = catchAsync(async (req, res) => {
  const dashboard = await dashboardService.getDashboard(req.user._id);
  successResponse(res, { dashboard });
});

export { getDashboard };
