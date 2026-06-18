import { Router } from 'express';
import {
  ask,
  getChats,
  getChat,
  deleteChat,
  updateChat,
  createChatSession,
} from '../controllers/chat.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { llmLimiter } from '../middlewares/rateLimiter.middleware.js';
import { z } from 'zod';

/* ------------------------------------------------------------------ */
/*  Zod Schemas                                                       */
/* ------------------------------------------------------------------ */

const askSchema = z.object({
  body: z.object({
    query: z
      .string({ required_error: 'Query is required' })
      .min(1, 'Query cannot be empty'),
    chatId: z.string().optional(),
    noteIds: z.array(z.string()).optional(),
  }),
});

const updateChatSchema = z.object({
  body: z.object({
    title: z
      .string({ required_error: 'Title is required' })
      .min(1, 'Title cannot be empty')
      .max(100, 'Title must be at most 100 characters'),
  }),
});

/* ------------------------------------------------------------------ */
/*  Router                                                            */
/* ------------------------------------------------------------------ */

const router = Router();

// All chat routes require authentication
router.use(protect);

router.post('/ask', llmLimiter, validate(askSchema), ask);
router.post('/', createChatSession);
router.get('/', getChats);
router.get('/:id', getChat);
router.patch('/:id', validate(updateChatSchema), updateChat);
router.delete('/:id', deleteChat);

export default router;
