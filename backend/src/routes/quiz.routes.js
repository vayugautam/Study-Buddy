import { Router } from 'express';
import {
  generate,
  submit,
  history,
  getQuizzes,
  getQuiz,
} from '../controllers/quiz.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { llmLimiter } from '../middlewares/rateLimiter.middleware.js';
import { z } from 'zod';

/* ------------------------------------------------------------------ */
/*  Zod Schemas                                                       */
/* ------------------------------------------------------------------ */

const generateSchema = z.object({
  body: z.object({
    noteId: z.string({ required_error: 'noteId is required' }),
    count: z
      .number()
      .int()
      .min(3, 'Count must be at least 3')
      .max(20, 'Count must be at most 20')
      .optional()
      .default(5),
    difficulty: z
      .enum(['easy', 'medium', 'hard'], {
        invalid_type_error: 'Difficulty must be easy, medium, or hard',
      })
      .optional()
      .default('medium'),
  }),
});

const submitSchema = z.object({
  body: z.object({
    answers: z.record(z.string(), z.string().nullable(), {
      required_error: 'Answers are required',
    }),
  }),
});

/* ------------------------------------------------------------------ */
/*  Router                                                            */
/* ------------------------------------------------------------------ */

const router = Router();

// All quiz routes require authentication
router.use(protect);

router.post('/generate', llmLimiter, validate(generateSchema), generate);
router.post('/:id/submit', validate(submitSchema), submit);
router.get('/history', history);
router.get('/', getQuizzes);
router.get('/:id', getQuiz);

export default router;
