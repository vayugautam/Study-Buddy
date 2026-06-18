import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useFlashcards } from '../store'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import ProgressBar from '../components/ui/ProgressBar'

export default function FlashcardSession() {
  const { deckId } = useParams()
  const navigate = useNavigate()
  const {
    activeDeck,
    currentIndex,
    isFlipped,
    sessionComplete,
    isLoadingDeck,
    error,
    loadDeck,
    flip,
    markMastered,
    markReview,
    restart,
    getCurrentCard,
    getEffectiveCards,
    getMasteredCount,
    getReviewCount,
  } = useFlashcards()

  useEffect(() => {
    if (deckId) loadDeck(deckId)
  }, [deckId, loadDeck])

  if (isLoadingDeck && !activeDeck) {
    return <div className="p-8 text-center text-neutral-500">Loading deck...</div>
  }

  if (error) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-red-600">{error}</p>
        <Button onClick={() => navigate('/flashcards')}>Back to Flashcards</Button>
      </div>
    )
  }

  if (sessionComplete && activeDeck) {
    const total = activeDeck.cards?.length || 0
    return (
      <div className="max-w-xl mx-auto p-6 space-y-6 mt-10">
        <Card className="text-center p-8">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-h3 text-neutral-900 mb-2">Session Complete!</h2>
          <p className="text-neutral-600 mb-6">You've gone through all the cards.</p>
          
          <div className="grid grid-cols-2 gap-4 mb-8 text-left">
            <div className="bg-success/10 rounded-xl p-4 border border-success/20">
              <div className="text-sm text-success font-semibold">Mastered</div>
              <div className="text-2xl font-bold text-emerald-700">{getMasteredCount()} / {total}</div>
            </div>
            <div className="bg-warning/10 rounded-xl p-4 border border-warning/20">
              <div className="text-sm text-warning font-semibold">Needs Review</div>
              <div className="text-2xl font-bold text-yellow-700">{getReviewCount()} / {total}</div>
            </div>
          </div>

          <div className="space-y-3">
            <Button className="w-full" onClick={() => restart()}>Review Again</Button>
            <Button variant="secondary" className="w-full" onClick={() => navigate('/flashcards')}>Back to Decks</Button>
          </div>
        </Card>
      </div>
    )
  }

  const currentCard = getCurrentCard()
  const effectiveCards = getEffectiveCards()
  if (!currentCard || !effectiveCards) return null

  const progress = Math.round((currentIndex / effectiveCards.length) * 100)

  return (
    <div className="max-w-3xl mx-auto p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/flashcards')}>✕ Exit</Button>
        <div className="text-sm font-medium text-neutral-500">
          Card {currentIndex + 1} of {effectiveCards.length}
        </div>
      </div>
      
      <ProgressBar value={progress} color="primary" height="sm" />

      {/* Flashcard */}
      <div className="mt-8 flex justify-center perspective-1000">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentCard.id + (isFlipped ? '-back' : '-front')}
            initial={{ opacity: 0, rotateY: isFlipped ? -90 : 90 }}
            animate={{ opacity: 1, rotateY: 0 }}
            exit={{ opacity: 0, rotateY: isFlipped ? 90 : -90 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-2xl cursor-pointer"
            onClick={flip}
            style={{ transformStyle: 'preserve-3d' }}
          >
            <Card className="min-h-[300px] flex flex-col items-center justify-center p-8 text-center bg-white shadow-lg border-2 border-primary-100 hover:border-primary-300 transition-colors">
              {!isFlipped ? (
                <>
                  <span className="text-primary-500 text-sm font-semibold uppercase tracking-wider mb-6">Question</span>
                  <h2 className="text-2xl md:text-3xl font-medium text-neutral-900 leading-snug">
                    {currentCard.front}
                  </h2>
                  <div className="mt-8 text-neutral-400 text-sm">Click to flip</div>
                </>
              ) : (
                <>
                  <span className="text-success text-sm font-semibold uppercase tracking-wider mb-6">Answer</span>
                  <h2 className="text-xl md:text-2xl text-neutral-900 leading-relaxed">
                    {currentCard.back}
                  </h2>
                  {currentCard.explanation && (
                    <p className="mt-6 text-neutral-500 text-sm p-4 bg-neutral-50 rounded-xl">
                      {currentCard.explanation}
                    </p>
                  )}
                </>
              )}
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls */}
      {isFlipped && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center gap-4 mt-8"
        >
          <Button
            variant="secondary"
            className="flex-1 max-w-[200px] border-warning text-warning-700 hover:bg-warning-50"
            onClick={() => markReview(currentCard.id)}
          >
            Needs Review
          </Button>
          <Button
            className="flex-1 max-w-[200px] bg-success hover:bg-success-600 border-success"
            onClick={() => markMastered(currentCard.id)}
          >
            Got It!
          </Button>
        </motion.div>
      )}
    </div>
  )
}
