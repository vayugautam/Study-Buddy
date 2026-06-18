import { adapter } from './_adapter'
import quizzesData from '../mock/quizzes.json'
import { getGradeBand } from '../lib/utils'

let mockQuizzes = [...quizzesData]

const quizService = {
  getQuizzes: () => {
    return adapter.get(
      () => mockQuizzes.map(q => ({ ...q, questions: undefined })),
      '/quizzes',
      600
    ).then(res => Array.isArray(res) ? res : res.quizzes || res)
  },

  getQuiz: (quizId) => {
    return adapter.get(
      () => {
        const quiz = mockQuizzes.find(q => q.id === quizId)
        if (!quiz) throw new Error('QUIZ_NOT_FOUND')
        return quiz
      },
      `/quizzes/${quizId}`,
      600
    ).then(res => res.quiz || res)
  },

  generateQuiz: ({ noteId, count = 5, difficulty = 'medium' }) => {
    return adapter.post(
      () => {
        const existing = mockQuizzes.find(q => q.noteId === noteId)
        return existing || mockQuizzes[0]
      },
      '/quizzes/generate',
      { noteId, count, difficulty },
      3000
    ).then(res => res.quiz || res)
  },

  submitQuiz: ({ quizId, answers, timeTakenSeconds }) => {
    const isReal = typeof import.meta !== 'undefined' && import.meta.env.VITE_USE_MOCK === 'false'

    // For real backend: answers map is { [questionId]: selectedAnswerText }
    const backendAnswers = isReal
      ? Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, v?.selectedOptionId || v || null]))
      : answers

    return adapter.post(
      () => {
        const quiz = mockQuizzes.find(q => q.id === quizId)
        if (!quiz) throw new Error('QUIZ_NOT_FOUND')
        let correctCount = 0
        const answerResults = quiz.questions.map(q => {
          const userAnswer = answers[q.id]
          const isCorrect = userAnswer?.selectedOptionId === q.correctOptionId
          if (isCorrect) correctCount++
          const correctOption = q.options.find(o => o.id === q.correctOptionId)
          const userOption = q.options.find(o => o.id === userAnswer?.selectedOptionId)
          return {
            questionId: q.id,
            questionText: q.text,
            topic: q.topic,
            selectedOptionId: userAnswer?.selectedOptionId || null,
            correctOptionId: q.correctOptionId,
            isCorrect,
            flagged: userAnswer?.flagged || false,
            userAnswerText: userOption?.text || 'Not answered',
            correctAnswerText: correctOption?.text,
            explanation: q.explanation,
          }
        })
        const score = Math.round((correctCount / quiz.questions.length) * 100)
        const { label: gradeBandLabel, band: gradeBand } = getGradeBand(score)
        return {
          id: `attempt_${Date.now()}`,
          quizId,
          submittedAt: new Date().toISOString(),
          timeTakenSeconds: timeTakenSeconds || 300,
          score,
          correctCount,
          incorrectCount: quiz.questions.length - correctCount,
          totalQuestions: quiz.questions.length,
          gradeBand,
          gradeBandLabel,
          answers: answerResults,
        }
      },
      `/quizzes/${quizId}/submit`,
      { quizId, answers: backendAnswers, timeTakenSeconds },
      800
    ).then(res => {
      // Return the result wrapper from the backend
      return res.attempt || res
    }).then(res => res)
  },

  getHistory: () => {
    return adapter.get(
      () => mockQuizzes.flatMap(q => q.attempts || []).sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)),
      '/quizzes/history',
      500
    ).then(res => Array.isArray(res) ? res : res.history || res)
  },
}

export default quizService
