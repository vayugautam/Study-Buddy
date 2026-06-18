import authService from '../services/authService'

const createAuthSlice = (set, get) => ({
  // State
  user: null,
  token: null,
  isAuthenticated: false,
  isAuthLoading: true,
  authError: null,
  rememberMe: false,

  // Actions
  login: async (email, password, rememberMe = false) => {
    set({ isAuthLoading: true, authError: null })
    try {
      const { user, accessToken } = await authService.login({ email, password })
      if (rememberMe) localStorage.setItem('study_buddy_token', accessToken)
      else sessionStorage.setItem('study_buddy_token', accessToken)
      set({ user, token: accessToken, isAuthenticated: true, isAuthLoading: false, rememberMe })
    } catch (err) {
      let msg = 'Login failed. Please try again.'
      if (err.response?.data?.error) {
        msg = err.response.data.error.message
      } else if (err.message === 'INVALID_CREDENTIALS') {
        msg = 'Invalid email or password. Try jane@example.com / password123'
      }
      set({ authError: msg, isAuthLoading: false })
      throw err
    }
  },

  signup: async (name, email, password) => {
    set({ isAuthLoading: true, authError: null })
    try {
      const { user, accessToken } = await authService.signup({ name, email, password })
      localStorage.setItem('study_buddy_token', accessToken)
      set({ user, token: accessToken, isAuthenticated: true, isLoading: false })
    } catch (err) {
      let msg = 'Signup failed. Please try again.'
      if (err.response?.data?.error) {
        const backendError = err.response.data.error
        msg = backendError.details ? backendError.details[0] : backendError.message
      } else if (err.message === 'EMAIL_EXISTS') {
        msg = 'An account with this email already exists.'
      }
      set({ error: msg, isLoading: false })
      throw err
    }
  },

  logout: () => {
    localStorage.removeItem('study_buddy_token')
    sessionStorage.removeItem('study_buddy_token')
    set({ user: null, token: null, isAuthenticated: false, error: null })
  },

  loadSession: async () => {
    const token = localStorage.getItem('study_buddy_token') || sessionStorage.getItem('study_buddy_token')
    if (!token) { set({ isAuthLoading: false }); return }
    set({ isAuthLoading: true })
    try {
      const { user } = await authService.validateToken(token)
      set({ user, token, isAuthenticated: true, isAuthLoading: false })
    } catch {
      localStorage.removeItem('study_buddy_token')
      sessionStorage.removeItem('study_buddy_token')
      set({ isAuthLoading: false })
    }
  },

  updateProfile: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const { user } = await authService.updateProfile(data)
      set({ user, isLoading: false })
    } catch {
      set({ error: 'Failed to update profile.', isLoading: false })
      throw new Error('Failed to update profile')
    }
  },

  changePassword: async (currentPassword, newPassword) => {
    set({ isLoading: true, error: null })
    try {
      await authService.changePassword({ currentPassword, newPassword })
      set({ isLoading: false })
    } catch (err) {
      const msg = err.message === 'WRONG_PASSWORD'
        ? 'Current password is incorrect.'
        : 'Failed to change password.'
      set({ error: msg, isLoading: false })
      throw new Error(msg)
    }
  },

  deleteAccount: async () => {
    set({ isLoading: true })
    try {
      await authService.deleteAccount()
      get().logout()
    } catch {
      set({ isLoading: false })
      throw new Error('Failed to delete account')
    }
  },

  clearError: () => set({ authError: null }),
  setRememberMe: (val) => set({ rememberMe: val }),

  // Selectors
  selectUserInitials: () => {
    const name = get().user?.name || ''
    return name.split(' ').slice(0, 2).map((n) => n[0]?.toUpperCase()).join('')
  },
})

export default createAuthSlice
