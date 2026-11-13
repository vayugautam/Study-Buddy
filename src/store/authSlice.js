import guestUser from '../mock/users.json'

const createAuthSlice = (set, get) => ({
  // Local guest profile: no login, signup, token, or server session required.
  user: { ...guestUser[0], id: 'guest', name: 'Guest Student', email: 'guest@studybuddy.local' },
  token: null,
  isAuthenticated: true,
  isAuthLoading: false,
  authError: null,
  rememberMe: false,

  loadSession: async () => {
    set({ isAuthLoading: false, isAuthenticated: true })
  },

  updateProfile: async (data) => {
    set((state) => ({ user: { ...state.user, ...data }, isAuthLoading: false }))
  },

  clearError: () => set({ authError: null }),

  selectUserInitials: () => {
    const name = get().user?.name || 'Guest Student'
    return name.split(' ').slice(0, 2).map((n) => n[0]?.toUpperCase()).join('')
  },
})

export default createAuthSlice
