import authRoutes from './auth.routes.js';
import noteRoutes from './note.routes.js';
import chatRoutes from './chat.routes.js';
import quizRoutes from './quiz.routes.js';
import flashcardRoutes from './flashcard.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import {
  authLimiter,
  llmLimiter,
} from '../middlewares/rateLimiter.middleware.js';

/**
 * Mount all API routes onto the Express application.
 * @param {import('express').Application} app - Express application instance
 */
export function mountRoutes(app) {
  app.use('/api/auth', authRoutes);
  app.use('/api/notes', noteRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/quizzes', quizRoutes);
  app.use('/api/flashcards', flashcardRoutes);
  app.use('/api/dashboard', dashboardRoutes);
}
