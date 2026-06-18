import quizService from '../services/quizService'
import { getGradeBand } from '../lib/utils'

const createQuizSlice = (set, get) => ({
  // State
  quizzes: [],
  activeQuiz: null,
  answers: {},
  currentIndex: 0,
  timeRemaining: 0,
  status: 'idle',
  results: null,
  isQuizLoading: false,
  quizError: null,
  transitionDirection: 'forward',

  // Actions
  fetchQuizzes: async () => {
    set({ isQuizLoading: true, quizError: null })
    try {
      const quizzes = await quizService.getQuizzes()
      set({ quizzes, isQuizLoading: false })
    } catch {
      set({ quizError: 'Failed to load quizzes.', isQuizLoading: false })
    }
  },
  startQuiz: async (quizId) => {
    set({ isQuizLoading: true, quizError: null, status: 'idle', answers: {}, currentIndex: 0, results: null })
    try {
      const quiz = await quizService.getQuiz(quizId)
      const initialAnswers = {}
      quiz.questions.forEach((q) => { initialAnswers[q.id || q._id] = { selectedOptionId: null, flagged: false } })
      set({
        activeQuiz: quiz,
        answers: initialAnswers,
        timeRemaining: quiz.timeLimitSeconds || 600,
        status: 'in_progress',
        isQuizLoading: false,
        currentIndex: 0,
      })
    } catch {
      set({ quizError: 'Failed to load quiz.', isQuizLoading: false })
    }
  },

  setAnswer: (questionId, optionId) => {
    set((s) => ({ answers: { ...s.answers, [questionId]: { ...s.answers[questionId], selectedOptionId: optionId } } }))
  },

  toggleFlag: (questionId) => {
    set((s) => ({
      answers: {
        ...s.answers,
        [questionId]: { ...s.answers[questionId], flagged: !s.answers[questionId]?.flagged },
      },
    }))
  },

  goToQuestion: (index) => {
    const { currentIndex } = get()
    set({ transitionDirection: index > currentIndex ? 'forward' : 'backward', currentIndex: index })
  },

  nextQuestion: () => {
    const { currentIndex, activeQuiz } = get()
    if (currentIndex < activeQuiz.questions.length - 1) {
      set({ currentIndex: currentIndex + 1, transitionDirection: 'forward' })
    }
  },

  prevQuestion: () => {
    const { currentIndex } = get()
    if (currentIndex > 0) {
      set({ currentIndex: currentIndex - 1, transitionDirection: 'backward' })
    }
  },

  tickTimer: () => {
    const { timeRemaining } = get()
    if (timeRemaining <= 1) {
      get().submitQuiz()
    } else {
      set({ timeRemaining: timeRemaining - 1 })
    }
  },

  submitQuiz: async () => {
    const { activeQuiz, answers, timeRemaining } = get()
    if (!activeQuiz) return
    const timeTaken = (activeQuiz.timeLimitSeconds || 600) - timeRemaining
    set({ isQuizLoading: true, status: 'submitted' })
    try {
      const results = await quizService.submitQuiz({ quizId: activeQuiz.id || activeQuiz._id, answers, timeTakenSeconds: timeTaken })
      set({ results, isQuizLoading: false })
    } catch {
      set({ isQuizLoading: false, quizError: 'Failed to submit quiz.' })
    }
  },

  resetQuiz: () => set({ activeQuiz: null, answers: {}, currentIndex: 0, timeRemaining: 0, status: 'idle', results: null, quizError: null }),
  clearError: () => set({ quizError: null }),

  // Selectors
  getCurrentQuestion: () => {
    const { activeQuiz, currentIndex } = get()
    return activeQuiz?.questions?.[currentIndex] || null
  },
  getAnsweredCount: () => Object.values(get().answers).filter((a) => a.selectedOptionId !== null).length,
  getFlaggedCount: () => Object.values(get().answers).filter((a) => a.flagged).length,
  getTimerWarningLevel: () => {
    const t = get().timeRemaining
    if (t < 10) return 'critical'
    if (t < 60) return 'urgent'
    if (t < 120) return 'warning'
    return 'normal'
  },
})

export default createQuizSlice
