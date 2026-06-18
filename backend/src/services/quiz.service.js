/**
 * @module services/quiz
 * @description Generates quizzes using Gemini and handles grading/submission.
 */

import Quiz from '../models/Quiz.model.js';
import Note from '../models/Note.model.js';
import embeddingsService from './embeddings.service.js';
import groqService from './groq.service.js';
import { NotFoundError, ValidationError } from '../utils/AppError.js';
import logger from '../utils/logger.js';

const quizService = {
  /**
   * Generate a new quiz from a note using Gemini AI.
   */
  async generateQuiz({ ownerId, noteId, count = 5, difficulty = 'medium' }) {
    // 1. Verify note ownership
    const note = await Note.findOne({ _id: noteId, ownerId });
    if (!note) throw new NotFoundError('Note not found or unauthorized.');

    // 2. Retrieve representative chunks from the note
    const results = await embeddingsService.queryRelevantChunks({
      query: 'Core concepts, definitions, key facts, and important terms',
      ownerId,
      noteIds: [noteId],
      topK: 15,
    });

    const context = results.documents?.[0]?.join('\n\n') || '';
    if (!context) throw new ValidationError(['Note does not have enough indexed content. Please wait for processing to finish.']);

    // 3. Build prompt
    const systemPrompt = `You are an expert educator. Generate a multiple-choice quiz based ONLY on the provided CONTEXT.
Generate exactly ${count} questions at "${difficulty}" difficulty.

CRITICAL RULES:
1. Each question must have exactly 4 unique options.
2. correctAnswer MUST be an exact copy of one of the 4 options.
3. Output ONLY valid JSON — no markdown fences, no extra text.

JSON Schema:
{
  "title": "Descriptive quiz title",
  "questions": [
    {
      "questionText": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option A",
      "explanation": "Brief explanation why Option A is correct."
    }
  ]
}`;

    // 4. Generate the Quiz
    const generatedData = await groqService.generateStructuredData(systemPrompt, context);

    if (!generatedData || !Array.isArray(generatedData.questions)) {
      throw new ValidationError(['AI returned an invalid quiz format. Please try again.']);
    }

    // 5. Validate each question strictly
    const validatedQuestions = generatedData.questions
      .filter(q => q.questionText && Array.isArray(q.options) && q.correctAnswer)
      .map(q => {
        if (q.options.length !== 4) throw new ValidationError(['Each question must have exactly 4 options.']);
        const unique = new Set(q.options.map(o => o.trim()));
        if (unique.size !== 4) throw new ValidationError(['All 4 options must be unique.']);
        if (!q.options.includes(q.correctAnswer)) throw new ValidationError(['correctAnswer must match one of the options exactly.']);
        return {
          questionText: q.questionText.trim(),
          options: q.options.map(o => o.trim()),
          correctAnswer: q.correctAnswer.trim(),
          explanation: (q.explanation || '').trim(),
        };
      });

    if (validatedQuestions.length === 0) throw new ValidationError(['No valid questions were generated. Please try again.']);

    // 6. Save to MongoDB using the correct field names matching Quiz.model.js
    const quiz = await Quiz.create({
      ownerId,
      noteId,
      title: (generatedData.title || `${note.title} Quiz`).substring(0, 150),
      difficulty,
      questions: validatedQuestions,
    });

    logger.info('Quiz generated', { quizId: quiz._id, ownerId, noteId, count: validatedQuestions.length });
    return quiz;
  },

  /**
   * Submit quiz answers and grade them.
   * answers: { [questionId]: selectedOptionId (string — the option TEXT selected) }
   */
  async submitQuiz(quizId, ownerId, answers, timeTakenSeconds) {
    const quiz = await Quiz.findOne({ _id: quizId, ownerId });
    if (!quiz) throw new NotFoundError('Quiz not found or unauthorized.');

    let correctCount = 0;
    const answerResults = quiz.questions.map(q => {
      const userAnswer = answers[q._id.toString()] || null;
      const isCorrect = userAnswer !== null && userAnswer === q.correctAnswer;
      if (isCorrect) correctCount++;
      return {
        questionId: q._id,
        questionText: q.questionText,
        selectedAnswer: userAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation,
      };
    });

    const total = quiz.questions.length;
    const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    quiz.attempts.push({
      score,
      date: new Date(),
    });
    await quiz.save();

    return {
      quizId: quiz._id,
      title: quiz.title,
      score,
      correctCount,
      incorrectCount: total - correctCount,
      totalQuestions: total,
      timeTakenSeconds: timeTakenSeconds || 0,
      answers: answerResults,
    };
  },

  async getQuizzes(ownerId) {
    return Quiz.find({ ownerId }).sort({ createdAt: -1 }).select('-questions.correctAnswer -questions.explanation');
  },

  async getQuizById(quizId, ownerId) {
    const quiz = await Quiz.findOne({ _id: quizId, ownerId });
    if (!quiz) throw new NotFoundError('Quiz not found or unauthorized.');
    // Hide correct answers when fetching for an active attempt
    const safe = quiz.toJSON();
    safe.questions = safe.questions.map(({ correctAnswer, explanation, ...rest }) => rest);
    return safe;
  },

  async getQuizWithAnswers(quizId, ownerId) {
    const quiz = await Quiz.findOne({ _id: quizId, ownerId });
    if (!quiz) throw new NotFoundError('Quiz not found or unauthorized.');
    return quiz;
  },

  async getQuizHistory(ownerId) {
    const quizzes = await Quiz.find({ ownerId }).sort({ createdAt: -1 });
    return quizzes.flatMap(q =>
      q.attempts.map(a => ({
        attemptId: a._id,
        quizId: q._id,
        quizTitle: q.title,
        score: a.score,
        date: a.date,
        difficulty: q.difficulty,
      }))
    ).sort((a, b) => new Date(b.date) - new Date(a.date));
  },
};

export default quizService;
