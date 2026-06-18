import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useFlashcards } from '../store'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import ProgressBar from '../components/ui/ProgressBar'
import { StatCardSkeleton } from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'

export default function Flashcards() {
  const navigate = useNavigate()
  const { decks, fetchDecks, isLoadingDecks } = useFlashcards()

  useEffect(() => {
    fetchDecks()
  }, [fetchDecks])

  return (
    <div className="p-6 lg:p-8 max-w-content mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-h2 text-neutral-900">Flashcards</h1>
        <Button onClick={() => navigate('/')} leftIcon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}>
          Create New Deck
        </Button>
      </div>

      {isLoadingDecks ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCardSkeleton /><StatCardSkeleton />
        </div>
      ) : decks.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {decks.map((deck, i) => (
            <motion.div
              key={deck.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card hoverable className="h-full flex flex-col justify-between group">
                <div>
                  <h3 className="font-semibold text-lg text-neutral-900 mb-1 group-hover:text-primary-600 transition-colors">{deck.title}</h3>
                  <p className="text-sm text-neutral-500 mb-4">{deck.cardCount} cards</p>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-success font-medium">{deck.masteryProgress}% Mastered</span>
                      <span className="text-neutral-400">Review needed</span>
                    </div>
                    <ProgressBar value={deck.masteryProgress} color="success" height="sm" />
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center justify-between">
                  <span className="text-xs text-neutral-400">Last study: {new Date(deck.lastStudiedAt).toLocaleDateString()}</span>
                  <Button size="sm" onClick={() => navigate(`/flashcards/${deck.id}`)}>Study</Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <EmptyState 
          title="No flashcard decks"
          description="Go to your Dashboard, click on a note, and hit 'Flashcards' to generate a deck."
          action={() => navigate('/')}
          actionLabel="Go to Dashboard"
        />
      )}
    </div>
  )
}
