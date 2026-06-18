import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Modal from './Modal'
import Button from './Button'

const DIFFICULTIES = ['easy', 'medium', 'hard']
const QUESTION_COUNTS = [5, 10, 15, 20]

export default function NoteActionModal({ note, isOpen, onClose }) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(null) // null | 'quiz' | 'flashcards'
  const [difficulty, setDifficulty] = useState('medium')
  const [questionCount, setQuestionCount] = useState(5)
  const [cardCount, setCardCount] = useState(20)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState(null)

  if (!note) return null

  const handleClose = () => {
    setActiveTab(null)
    setError(null)
    setIsGenerating(false)
    onClose()
  }

  const handleChat = () => {
    handleClose()
    navigate('/chat', { state: { noteIds: [note.id] } })
  }

  const handleGenerateQuiz = async () => {
    setIsGenerating(true)
    setError(null)
    try {
      const { default: quizService } = await import('../../services/quizService')
      const quiz = await quizService.generateQuiz({ noteId: note.id, count: questionCount, difficulty })
      const quizId = quiz?.id || quiz?._id
      handleClose()
      if (quizId) navigate(`/quizzes/${quizId}`)
      else navigate('/quizzes')
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to generate quiz. Make sure the note is fully processed and try again.'
      setError(msg)
      setIsGenerating(false)
    }
  }

  const handleGenerateFlashcards = async () => {
    setIsGenerating(true)
    setError(null)
    try {
      const { default: flashcardsService } = await import('../../services/flashcardsService')
      const deck = await flashcardsService.generateDeck({ noteId: note.id, count: cardCount })
      const deckId = deck?.id || deck?._id
      handleClose()
      if (deckId) navigate(`/flashcards/${deckId}`)
      else navigate('/flashcards')
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to generate flashcards. Make sure the note is fully processed and try again.'
      setError(msg)
      setIsGenerating(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <div className="space-y-6">
        {/* Note Info Header */}
        <div className="flex gap-4 items-start">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl font-bold shrink-0"
            style={{ backgroundColor: note.color || '#8b5cf6' }}
          >
            📄
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-neutral-900 leading-snug line-clamp-2">{note.title}</h2>
            <div className="flex gap-3 mt-1 text-xs text-neutral-500">
              {note.pageCount && <span>{note.pageCount} pages</span>}
              {note.fileSizeKb && <span>{Math.round(note.fileSizeKb / 1024 * 10) / 10} MB</span>}
              <span>{new Date(note.createdAt).toLocaleDateString()}</span>
              {note.status && note.status !== 'ready' && (
                <span className="text-amber-600 font-medium capitalize">⏳ {note.status}</span>
              )}
            </div>
            {note.excerpt && (
              <p className="text-sm text-neutral-500 mt-2 line-clamp-2">{note.excerpt}</p>
            )}
          </div>
        </div>

        {/* Action Buttons (no tab selected) */}
        <AnimatePresence mode="wait">
          {!activeTab && (
            <motion.div
              key="actions"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="grid grid-cols-3 gap-3"
            >
              <ActionTile
                emoji="💬"
                label="Start Chat"
                description="Ask anything about this note"
                color="bg-primary-50 hover:bg-primary-100 border-primary-200"
                textColor="text-primary-700"
                onClick={handleChat}
              />
              <ActionTile
                emoji="🎯"
                label="Generate Quiz"
                description="Test your knowledge"
                color="bg-emerald-50 hover:bg-emerald-100 border-emerald-200"
                textColor="text-emerald-700"
                onClick={() => setActiveTab('quiz')}
              />
              <ActionTile
                emoji="🗂️"
                label="Flashcards"
                description="Create study cards"
                color="bg-amber-50 hover:bg-amber-100 border-amber-200"
                textColor="text-amber-700"
                onClick={() => setActiveTab('flashcards')}
              />
            </motion.div>
          )}

          {/* Quiz Config */}
          {activeTab === 'quiz' && (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="space-y-5"
            >
              <button
                onClick={() => { setActiveTab(null); setError(null) }}
                className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Back
              </button>

              <div>
                <label className="text-sm font-medium text-neutral-700 block mb-2">Difficulty</label>
                <div className="flex gap-2">
                  {DIFFICULTIES.map(d => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border capitalize transition-all ${
                        difficulty === d
                          ? d === 'easy' ? 'bg-emerald-500 text-white border-emerald-500'
                            : d === 'medium' ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-red-500 text-white border-red-500'
                          : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-neutral-700 block mb-2">Number of Questions</label>
                <div className="flex gap-2">
                  {QUESTION_COUNTS.map(n => (
                    <button
                      key={n}
                      onClick={() => setQuestionCount(n)}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                        questionCount === n
                          ? 'bg-primary-500 text-white border-primary-500'
                          : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <Button
                onClick={handleGenerateQuiz}
                isLoading={isGenerating}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? 'Generating Quiz…' : `Generate ${questionCount}-Question Quiz`}
              </Button>
            </motion.div>
          )}

          {/* Flashcards Config */}
          {activeTab === 'flashcards' && (
            <motion.div
              key="flashcards"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="space-y-5"
            >
              <button
                onClick={() => { setActiveTab(null); setError(null) }}
                className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Back
              </button>

              <div>
                <label className="text-sm font-medium text-neutral-700 block mb-2">Number of Cards</label>
                <div className="flex gap-2">
                  {[10, 20, 30, 50].map(n => (
                    <button
                      key={n}
                      onClick={() => setCardCount(n)}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                        cardCount === n
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <Button
                onClick={handleGenerateFlashcards}
                isLoading={isGenerating}
                disabled={isGenerating}
                variant="secondary"
                className="w-full"
              >
                {isGenerating ? 'Generating Flashcards…' : `Generate ${cardCount} Flashcards`}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  )
}

function ActionTile({ emoji, label, description, color, textColor, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center text-center p-4 rounded-2xl border transition-all hover:scale-[1.02] active:scale-[0.98] ${color}`}
    >
      <span className="text-2xl mb-2">{emoji}</span>
      <span className={`text-sm font-semibold ${textColor}`}>{label}</span>
      <span className="text-xs text-neutral-500 mt-1 leading-tight">{description}</span>
    </button>
  )
}
