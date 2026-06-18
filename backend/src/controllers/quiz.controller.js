/**
 * @module controllers/quiz
 * @description Thin controller layer for quiz endpoints.
 * Extracts request data, delegates to quizService, and sends responses.
 */

import quizService from '../services/quiz.service.js';
import catchAsync from '../utils/catchAsync.js';
import { successResponse } from '../utils/apiResponse.js';

/**
 * Generates a new quiz from a note's content using the AI.
 * @type {import('express').RequestHandler}
 */
const generate = catchAsync(async (req, res) => {
  const quiz = await quizService.generateQuiz({
    noteId: req.body.noteId,
    ownerId: req.user._id,
    count: req.body.count,
    difficulty: req.body.difficulty,
  });

  successResponse(res, { quiz }, 201);
});

/**
 * Submits answers for a quiz and returns graded results.
 * Enforces tenant isolation via ownerId.
 * @type {import('express').RequestHandler}
 */
const submit = catchAsync(async (req, res) => {
  const result = await quizService.submitQuiz(
    req.params.id,
    req.user._id,
    req.body.answers,
  );

  successResponse(res, result);
});

/**
 * Retrieves the authenticated user's quiz history.
 * Supports pagination and filtering via query parameters.
 * @type {import('express').RequestHandler}
 */
const history = catchAsync(async (req, res) => {
  const result = await quizService.getQuizHistory(req.user._id, req.query);
  successResponse(res, result);
});

const getQuizzes = catchAsync(async (req, res) => {
  const quizzes = await quizService.getQuizzes(req.user._id);
  successResponse(res, { quizzes });
});

const getQuiz = catchAsync(async (req, res) => {
  const quiz = await quizService.getQuizById(req.params.id, req.user._id);
  successResponse(res, { quiz });
});

export { generate, submit, history, getQuizzes, getQuiz };
