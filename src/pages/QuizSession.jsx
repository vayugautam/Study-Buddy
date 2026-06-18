import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuiz } from '../store'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import ProgressBar from '../components/ui/ProgressBar'

export default function QuizSession() {
  const { quizId } = useParams()
  const navigate = useNavigate()
  const {
    activeQuiz,
    answers,
    currentIndex,
    status,
    results,
    isLoading,
    error,
    startQuiz,
    setAnswer,
    nextQuestion,
    prevQuestion,
    submitQuiz,
    resetQuiz,
    getCurrentQuestion,
    getAnsweredCount
  } = useQuiz()

  useEffect(() => {
    if (quizId) startQuiz(quizId)
    return () => resetQuiz()
  }, [quizId, startQuiz, resetQuiz])

  if (isLoading && !activeQuiz) {
    return <div className="p-8 text-center text-neutral-500">Loading quiz...</div>
  }

  if (error) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-red-600">{error}</p>
        <Button onClick={() => navigate('/quizzes')}>Back to Quizzes</Button>
      </div>
    )
  }

  if (status === 'submitted' && results) {
    return (
      <div className="max-w-xl mx-auto p-6 space-y-6 mt-10">
        <Card className="text-center p-8">
          <div className="text-6xl mb-4">{results.gradeBandLabel === 'Excellent!' ? '🏆' : '🎯'}</div>
          <h2 className="text-h3 text-neutral-900 mb-2">Quiz Complete!</h2>
          <p className="text-neutral-600 mb-6">You scored {results.score}%</p>
          
          <div className="grid grid-cols-2 gap-4 mb-8 text-left">
            <div className="bg-success/10 rounded-xl p-4 border border-success/20">
              <div className="text-sm text-success font-semibold">Correct</div>
              <div className="text-2xl font-bold text-emerald-700">{results.correctCount}</div>
            </div>
            <div className="bg-error/10 rounded-xl p-4 border border-error/20">
              <div className="text-sm text-error font-semibold">Incorrect</div>
              <div className="text-2xl font-bold text-red-700">{results.incorrectCount}</div>
            </div>
          </div>

          <div className="space-y-3">
            <Button className="w-full" onClick={() => navigate('/quizzes')}>Return to Quizzes</Button>
            <Button variant="secondary" className="w-full" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
          </div>
        </Card>
      </div>
    )
  }

  const question = getCurrentQuestion()
  if (!question) return null

  const totalQuestions = activeQuiz.questions.length
  const progress = Math.round((getAnsweredCount() / totalQuestions) * 100)
  const currentAnswer = answers[question.id || question._id]?.selectedOptionId

  return (
    <div className="max-w-3xl mx-auto p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/quizzes')}>✕ Exit</Button>
        <div className="text-sm font-medium text-neutral-500">
          Question {currentIndex + 1} of {totalQuestions}
        </div>
      </div>
      
      <ProgressBar value={progress} color="primary" height="sm" />

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={question.id || question._id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="space-y-6 mt-8"
        >
          <h2 className="text-xl md:text-2xl font-semibold text-neutral-900 leading-snug">
            {question.questionText || question.text}
          </h2>

          <div className="space-y-3">
            {question.options.map((opt, i) => {
              // Handle both object {id, text} and plain string options
              const isString = typeof opt === 'string'
              const optId = isString ? opt : opt.id
              const optText = isString ? opt : opt.text
              const isSelected = currentAnswer === optId
              const letters = ['A', 'B', 'C', 'D']

              return (
                <button
                  key={optId}
                  onClick={() => setAnswer(question.id || question._id, optId)}
                  className={`w-full flex items-center p-4 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-neutral-200 bg-white hover:border-primary-300 hover:bg-neutral-50'
                  }`}
                >
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 mr-4 transition-colors ${
                    isSelected ? 'bg-primary-500 text-white' : 'bg-neutral-100 text-neutral-500'
                  }`}>
                    {letters[i]}
                  </span>
                  <span className={`font-medium ${isSelected ? 'text-primary-900' : 'text-neutral-700'}`}>
                    {optText}
                  </span>
                </button>
              )
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Footer Nav */}
      <div className="flex justify-between items-center pt-8 border-t border-neutral-200 mt-8">
        <Button
          variant="secondary"
          onClick={prevQuestion}
          disabled={currentIndex === 0}
        >
          ← Previous
        </Button>

        {currentIndex === totalQuestions - 1 ? (
          <Button onClick={submitQuiz} isLoading={status === 'submitted' || isLoading}>
            Submit Quiz
          </Button>
        ) : (
          <Button onClick={nextQuestion}>
            Next →
          </Button>
        )}
      </div>
    </div>
  )
}
