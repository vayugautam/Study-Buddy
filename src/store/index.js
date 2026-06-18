import { create } from 'zustand'
import createAuthSlice from './authSlice'
import createNotesSlice from './notesSlice'
import createChatSlice from './chatSlice'
import createQuizSlice from './quizSlice'
import createFlashcardsSlice from './flashcardsSlice'
import createUiSlice from './uiSlice'

const useStore = create((set, get) => ({
  ...createAuthSlice(set, get),
  ...createNotesSlice(set, get),
  ...createChatSlice(set, get),
  ...createQuizSlice(set, get),
  ...createFlashcardsSlice(set, get),
  ...createUiSlice(set, get),
}))

export default useStore

// Named selectors for convenient usage
export const useAuth = () => useStore((s) => ({
  user: s.user,
  isAuthenticated: s.isAuthenticated,
  isLoading: s.isAuthLoading,
  error: s.authError,
  login: s.login,
  signup: s.signup,
  logout: s.logout,
  loadSession: s.loadSession,
  updateProfile: s.updateProfile,
  changePassword: s.changePassword,
  deleteAccount: s.deleteAccount,
  clearError: s.clearError,
}))

export const useNotes = () => useStore((s) => ({
  notes: s.notes,
  isLoading: s.isNotesLoading,
  isUploading: s.isUploading,
  uploadProgress: s.uploadProgress,
  error: s.notesError,
  searchTerm: s.searchTerm,
  filters: s.filters,
  viewMode: s.viewMode,
  pendingDeleteId: s.pendingDeleteId,
  fetchNotes: s.fetchNotes,
  addNote: s.addNote,
  deleteNote: s.deleteNote,
  undoDelete: s.undoDelete,
  selectNote: s.selectNote,
  setSearchTerm: s.setSearchTerm,
  setFilter: s.setFilter,
  resetFilters: s.resetFilters,
  setViewMode: s.setViewMode,
  getFilteredNotes: s.getFilteredNotes,
  getUniqueTags: s.getUniqueTags,
}))

export const useChat = () => useStore((s) => ({
  sessions: s.sessions,
  activeChatId: s.activeChatId,
  isSending: s.isSending,
  isStreaming: s.isStreaming,
  isLoadingSessions: s.isLoadingSessions,
  isLoadingMessages: s.isLoadingMessages,
  searchQuery: s.searchQuery,
  renameTargetId: s.renameTargetId,
  fetchSessions: s.fetchSessions,
  loadChat: s.loadChat,
  newChat: s.newChat,
  sendMessage: s.sendMessage,
  renameChat: s.renameChat,
  deleteChat: s.deleteChat,
  setSearchQuery: s.setSearchQuery,
  setRenameTarget: s.setRenameTarget,
  getFilteredSessions: s.getFilteredSessions,
  getGroupedSessions: s.getGroupedSessions,
  getActiveMessages: s.getActiveMessages,
}))

export const useQuiz = () => useStore((s) => ({
  quizzes: s.quizzes,
  activeQuiz: s.activeQuiz,
  answers: s.answers,
  currentIndex: s.currentIndex,
  timeRemaining: s.timeRemaining,
  status: s.status,
  results: s.results,
  isLoading: s.isQuizLoading,
  error: s.quizError,
  transitionDirection: s.transitionDirection,
  fetchQuizzes: s.fetchQuizzes,
  startQuiz: s.startQuiz,
  setAnswer: s.setAnswer,
  toggleFlag: s.toggleFlag,
  goToQuestion: s.goToQuestion,
  nextQuestion: s.nextQuestion,
  prevQuestion: s.prevQuestion,
  tickTimer: s.tickTimer,
  submitQuiz: s.submitQuiz,
  resetQuiz: s.resetQuiz,
  getCurrentQuestion: s.getCurrentQuestion,
  getAnsweredCount: s.getAnsweredCount,
  getFlaggedCount: s.getFlaggedCount,
  getTimerWarningLevel: s.getTimerWarningLevel,
}))

export const useFlashcards = () => useStore((s) => ({
  decks: s.decks,
  activeDeck: s.activeDeck,
  currentIndex: s.currentIndex,
  isFlipped: s.isFlipped,
  isShuffled: s.isShuffled,
  filterUnmastered: s.filterUnmastered,
  mastery: s.mastery,
  isLoadingDecks: s.isLoadingDecks,
  isLoadingDeck: s.isLoadingDeck,
  sessionComplete: s.sessionComplete,
  transitionDirection: s.transitionDirection,
  fetchDecks: s.fetchDecks,
  generateDeck: s.generateDeck,
  loadDeck: s.loadDeck,
  updateCardMastery: s.updateCardMastery,
  flip: s.flip,
  nextCard: s.nextCard,
  prevCard: s.prevCard,
  markMastered: s.markMastered,
  markReview: s.markReview,
  shuffle: s.shuffle,
  unshuffle: s.unshuffle,
  restart: s.restart,
  toggleFilterUnmastered: s.toggleFilterUnmastered,
  getEffectiveCards: s.getEffectiveCards,
  getCurrentCard: s.getCurrentCard,
  getMasteredCount: s.getMasteredCount,
  getReviewCount: s.getReviewCount,
  getUnseenCount: s.getUnseenCount,
  getMasteryPercent: s.getMasteryPercent,
}))

export const useUI = () => useStore((s) => ({
  theme: s.theme,
  sidebarOpen: s.sidebarOpen,
  toasts: s.toasts,
  setTheme: s.setTheme,
  initTheme: s.initTheme,
  toggleSidebar: s.toggleSidebar,
  setSidebarOpen: s.setSidebarOpen,
  addToast: s.addToast,
  removeToast: s.removeToast,
}))
