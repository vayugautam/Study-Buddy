import flashcardsService from '../services/flashcardsService'
import { shuffleArray } from '../lib/utils'

const createFlashcardsSlice = (set, get) => ({
  // State
  decks: [],
  activeDeck: null,
  currentIndex: 0,
  isFlipped: false,
  isShuffled: false,
  shuffledOrder: [],
  filterUnmastered: false,
  mastery: {},
  isLoadingDecks: false,
  isLoadingDeck: false,
  error: null,
  transitionDirection: 'forward',
  sessionComplete: false,

  // Actions
  fetchDecks: async () => {
    set({ isLoadingDecks: true, error: null })
    try {
      const decks = await flashcardsService.fetchDecks()
      set({ decks, isLoadingDecks: false })
    } catch {
      set({ error: 'Failed to load decks.', isLoadingDecks: false })
    }
  },

  generateDeck: async ({ noteId, count = 20 }) => {
    set({ isLoadingDecks: true, error: null })
    try {
      const deck = await flashcardsService.generateDeck({ noteId, count })
      set((s) => ({ decks: [deck, ...s.decks], isLoadingDecks: false }))
      return deck
    } catch {
      set({ error: 'Failed to generate deck.', isLoadingDecks: false })
      return null
    }
  },

  loadDeck: async (deckId) => {
    set({ isLoadingDeck: true, error: null })
    try {
      const deck = await flashcardsService.getDeck(deckId)
      const mastery = {}
      deck.cards.forEach((c) => { mastery[c.id] = c.masteryStatus || 'unseen' })
      set({
        activeDeck: deck,
        mastery,
        currentIndex: 0,
        isFlipped: false,
        isShuffled: false,
        shuffledOrder: [],
        filterUnmastered: false,
        sessionComplete: false,
        isLoadingDeck: false,
      })
    } catch {
      set({ error: 'Failed to load deck.', isLoadingDeck: false })
    }
  },

  flip: () => set((s) => ({ isFlipped: !s.isFlipped })),

  nextCard: () => {
    const { currentIndex, getEffectiveCards } = get()
    const cards = getEffectiveCards()
    if (currentIndex >= cards.length - 1) {
      set({ sessionComplete: true })
    } else {
      set({ currentIndex: currentIndex + 1, isFlipped: false, transitionDirection: 'forward' })
    }
  },

  prevCard: () => {
    const { currentIndex } = get()
    if (currentIndex > 0) {
      set({ currentIndex: currentIndex - 1, isFlipped: false, transitionDirection: 'backward' })
    }
  },

  markMastered: (cardId) => {
    const { activeDeck } = get()
    set((s) => ({ mastery: { ...s.mastery, [cardId]: 'mastered' } }))
    if (activeDeck) flashcardsService.updateCardMastery(activeDeck.id, cardId, 'mastered').catch(() => {})
    get().nextCard()
  },

  markReview: (cardId) => {
    const { activeDeck } = get()
    set((s) => ({ mastery: { ...s.mastery, [cardId]: 'review' } }))
    if (activeDeck) flashcardsService.updateCardMastery(activeDeck.id, cardId, 'review').catch(() => {})
    get().nextCard()
  },

  updateCardMastery: async (deckId, cardId, masteryStatus) => {
    set((s) => ({ mastery: { ...s.mastery, [cardId]: masteryStatus } }))
    try {
      await flashcardsService.updateCardMastery(deckId, cardId, masteryStatus)
    } catch {
      // silently ignore persistence failures
    }
  },

  shuffle: () => {
    const { activeDeck } = get()
    if (!activeDeck) return
    const indices = activeDeck.cards.map((_, i) => i)
    const shuffled = shuffleArray(indices)
    set({ isShuffled: true, shuffledOrder: shuffled, currentIndex: 0, isFlipped: false })
  },

  unshuffle: () => set({ isShuffled: false, shuffledOrder: [], currentIndex: 0, isFlipped: false }),

  restart: (reshuffle = false) => {
    const { activeDeck, isShuffled } = get()
    if (!activeDeck) return
    const mastery = {}
    activeDeck.cards.forEach((c) => { mastery[c.id] = 'unseen' })
    const newState = { mastery, currentIndex: 0, isFlipped: false, sessionComplete: false, filterUnmastered: false }
    if (reshuffle || isShuffled) {
      const indices = activeDeck.cards.map((_, i) => i)
      newState.shuffledOrder = shuffleArray(indices)
      newState.isShuffled = true
    }
    set(newState)
  },

  toggleFilterUnmastered: () => {
    set((s) => ({ filterUnmastered: !s.filterUnmastered, currentIndex: 0, isFlipped: false }))
  },

  // Selectors
  getEffectiveCards: () => {
    const { activeDeck, isShuffled, shuffledOrder, filterUnmastered, mastery } = get()
    if (!activeDeck) return []
    let cards = isShuffled
      ? shuffledOrder.map((i) => activeDeck.cards[i])
      : [...activeDeck.cards]
    if (filterUnmastered) cards = cards.filter((c) => mastery[c.id] !== 'mastered')
    return cards
  },

  getCurrentCard: () => {
    const cards = get().getEffectiveCards()
    return cards[get().currentIndex] || null
  },

  getMasteredCount: () => Object.values(get().mastery).filter((s) => s === 'mastered').length,
  getReviewCount: () => Object.values(get().mastery).filter((s) => s === 'review').length,
  getUnseenCount: () => Object.values(get().mastery).filter((s) => s === 'unseen').length,
  getMasteryPercent: () => {
    const total = Object.keys(get().mastery).length
    if (!total) return 0
    return Math.round((get().getMasteredCount() / total) * 100)
  },
})

export default createFlashcardsSlice
