import { Router } from 'express';
import {
  generate,
  getFlashcards,
  getDeck,
  deleteDeck,
  updateCardMastery,
  createCustomDeck,
} from '../controllers/flashcard.controller.js';
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
      .max(50, 'Count must be at most 50')
      .optional()
      .default(20),
  }),
});

const updateMasterySchema = z.object({
  body: z.object({
    masteryStatus: z.enum(['unseen', 'review', 'mastered'], {
      required_error: 'masteryStatus is required',
      invalid_type_error: 'masteryStatus must be unseen, review, or mastered',
    }),
  }),
});

/* ------------------------------------------------------------------ */
/*  Router                                                            */
/* ------------------------------------------------------------------ */

const router = Router();

// All flashcard routes require authentication
router.use(protect);

router.post('/generate', llmLimiter, validate(generateSchema), generate);
router.post('/', createCustomDeck);
router.get('/', getFlashcards);
router.get('/:id', getDeck);
router.delete('/:id', deleteDeck);
router.patch('/:deckId/cards/:cardId/mastery', validate(updateMasterySchema), updateCardMastery);

export default router;
