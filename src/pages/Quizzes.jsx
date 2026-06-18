import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuiz } from '../store'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import EmptyState from '../components/ui/EmptyState'
import { StatCardSkeleton } from '../components/ui/Skeleton'

export default function Quizzes() {
  const navigate = useNavigate()
  const { quizzes, fetchQuizzes, isLoading } = useQuiz()

  useEffect(() => {
    fetchQuizzes()
  }, [fetchQuizzes])

  return (
    <div className="p-6 lg:p-8 max-w-content mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-h2 text-neutral-900">Quizzes</h1>
        <Button onClick={() => navigate('/')} leftIcon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}>
          Generate New Quiz
        </Button>
      </div>

      <div className="bg-primary-50 border border-primary-100 rounded-2xl p-6 flex items-center justify-between">
        <div>
          <h3 className="text-primary-900 font-semibold mb-1">Test your knowledge</h3>
          <p className="text-primary-700 text-sm">Generate quizzes directly from your notes to identify knowledge gaps.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCardSkeleton /><StatCardSkeleton />
        </div>
      ) : quizzes?.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz, i) => {
            const attemptCount = quiz.attempts?.length || 0;
            const lastAttempt = attemptCount > 0 ? quiz.attempts[quiz.attempts.length - 1] : null;

            return (
              <motion.div
                key={quiz.id || quiz._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card hoverable className="h-full flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <Badge variant={quiz.difficulty === 'hard' ? 'error' : quiz.difficulty === 'easy' ? 'success' : 'warning'}>
                        {quiz.difficulty}
                      </Badge>
                      <span className="text-xs font-medium text-neutral-500 bg-neutral-100 px-2 py-1 rounded-md">
                        {quiz.questions?.length || quiz.questionCount || 0} Qs
                      </span>
                    </div>
                    <h3 className="font-semibold text-lg text-neutral-900 mb-1">{quiz.title}</h3>
                    <p className="text-sm text-neutral-500">{quiz.subject || 'Generated Quiz'}</p>
                    
                    {attemptCount > 0 && (
                      <div className="mt-3 text-sm">
                        <span className="text-neutral-500">Last score: </span>
                        <span className={`font-semibold ${lastAttempt.score >= 80 ? 'text-success' : lastAttempt.score >= 60 ? 'text-warning' : 'text-error'}`}>
                          {lastAttempt.score}%
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center justify-between">
                    <span className="text-xs text-neutral-400">Attempts: {attemptCount}</span>
                    <Button size="sm" onClick={() => navigate(`/quizzes/${quiz.id || quiz._id}`)}>
                      {attemptCount > 0 ? 'Retake' : 'Start Quiz'}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>
      ) : (
        <EmptyState 
          title="No quizzes yet"
          description="Go to your Dashboard, click on a note, and hit 'Generate Quiz' to start."
          action={() => navigate('/')}
          actionLabel="Go to Dashboard"
        />
      )}
    </div>
  )
}
