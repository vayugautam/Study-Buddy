/**
 * @module controllers/flashcard
 * @description Thin controller layer for flashcard deck endpoints.
 * Extracts request data, delegates to flashcardService, and sends responses.
 */

import flashcardService from '../services/flashcard.service.js';
import catchAsync from '../utils/catchAsync.js';
import { successResponse } from '../utils/apiResponse.js';

/**
 * Generates a new flashcard deck from a note's content using the AI.
 * @type {import('express').RequestHandler}
 */
const generate = catchAsync(async (req, res) => {
  const deck = await flashcardService.generateFlashcards({
    noteId: req.body.noteId,
    ownerId: req.user._id,
    count: req.body.count,
  });

  successResponse(res, { deck }, 201);
});

/**
 * Lists all flashcard decks belonging to the authenticated user.
 * Supports pagination and filtering via query parameters.
 * @type {import('express').RequestHandler}
 */
const getFlashcards = catchAsync(async (req, res) => {
  const result = await flashcardService.getUserFlashcards(req.user._id, req.query);
  successResponse(res, result);
});

/**
 * Deletes a flashcard deck and all its cards.
 * Enforces tenant isolation via ownerId.
 * @type {import('express').RequestHandler}
 */
const deleteDeck = catchAsync(async (req, res) => {
  await flashcardService.deleteDeck(req.params.id, req.user._id);
  successResponse(res, { message: 'Flashcard deck successfully deleted.' });
});

/**
 * Updates the mastery status of a specific card within a deck.
 * Enforces tenant isolation via ownerId.
 * @type {import('express').RequestHandler}
 */
const updateCardMastery = catchAsync(async (req, res) => {
  const deck = await flashcardService.updateCardMastery(
    req.params.deckId,
    req.params.cardId,
    req.user._id,
    req.body.masteryStatus,
  );

  successResponse(res, { deck });
});

const getDeck = catchAsync(async (req, res) => {
  const deck = await flashcardService.getDeckById(req.params.id, req.user._id);
  successResponse(res, { deck });
});

const createCustomDeck = catchAsync(async (req, res) => {
  const deck = await flashcardService.createCustomDeck(req.user._id, req.body);
  successResponse(res, { deck }, 201);
});

export { generate, getFlashcards, getDeck, deleteDeck, updateCardMastery, createCustomDeck };
