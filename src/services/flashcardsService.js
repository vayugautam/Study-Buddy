import { adapter } from './_adapter'
import decksData from '../mock/flashcardDecks.json'

let mockDecks = [...decksData]

const flashcardsService = {
  fetchDecks: () => {
    return adapter.get(
      () => mockDecks.map(d => ({ ...d, cards: undefined, cardCount: d.cards?.length || d.cardCount })),
      '/flashcards',
      500
    ).then(res => Array.isArray(res) ? res : res.decks || res)
  },

  getDeck: (deckId) => {
    const isReal = typeof import.meta !== 'undefined' && import.meta.env.VITE_USE_MOCK === 'false'
    return adapter.get(
      () => {
        const deck = mockDecks.find(d => d.id === deckId)
        if (!deck) throw new Error('DECK_NOT_FOUND')
        return deck
      },
      `/flashcards/${deckId}`,
      400
    ).then(res => (isReal && res.deck) ? res.deck : res)
  },

  /**
   * Generate flashcards from a note using Gemini AI.
   */
  generateDeck: ({ noteId, count = 20 }) => {
    const isReal = typeof import.meta !== 'undefined' && import.meta.env.VITE_USE_MOCK === 'false'
    return adapter.post(
      () => {
        const existing = mockDecks.find(d => d.noteId === noteId)
        return existing || mockDecks[0]
      },
      '/flashcards/generate',
      { noteId, count },
      3000
    ).then(res => (isReal && res.deck) ? res.deck : res)
  },

  createDeckFromCards: (cards, title, noteId) => {
    const isReal = typeof import.meta !== 'undefined' && import.meta.env.VITE_USE_MOCK === 'false'
    return adapter.post(
      () => {
        const newDeck = {
          id: `deck_${Date.now()}`,
          ownerId: 'user_001',
          noteId,
          title,
          cardCount: cards.length,
          cards: cards.map((c, i) => ({
            id: `card_custom_${i}`,
            front: c.front,
            back: c.back,
            tags: c.tags || [],
            masteryStatus: 'unseen',
          })),
          createdAt: new Date().toISOString(),
          lastStudiedAt: null,
        }
        mockDecks.unshift(newDeck)
        return newDeck
      },
      '/flashcards',
      { cards, title, noteId },
      800
    ).then(res => (isReal && res.deck) ? res.deck : res)
  },

  deleteDeck: (deckId) => {
    return adapter.delete(
      () => {
        mockDecks = mockDecks.filter(d => d.id !== deckId)
        return { success: true }
      },
      `/flashcards/${deckId}`,
      400
    )
  },

  updateCardMastery: (deckId, cardId, masteryStatus) => {
    const isReal = typeof import.meta !== 'undefined' && import.meta.env.VITE_USE_MOCK === 'false'
    return adapter.patch(
      () => {
        const deck = mockDecks.find(d => d.id === deckId)
        if (deck) {
          const card = deck.cards?.find(c => c.id === cardId)
          if (card) card.masteryStatus = masteryStatus
        }
        return { success: true }
      },
      `/flashcards/${deckId}/cards/${cardId}/mastery`,
      { masteryStatus },
      300
    ).then(res => (isReal && res.card) ? res.card : res)
  },
}

export default flashcardsService
