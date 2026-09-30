import authService from '../services/authService'

const createAuthSlice = (set, get) => ({
  // State
  user: null,
  token: null,
  isAuthenticated: false,
  isAuthLoading: true,
  authError: null,
  rememberMe: false,

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
      set({ user, token: accessToken, isAuthenticated: true, isAuthLoading: false, rememberMe: true })
    } catch (err) {
      let msg = 'Signup failed. Please try again.'
      if (err.response?.data?.error) {
        const backendError = err.response.data.error
        msg = backendError.details ? backendError.details[0] : backendError.message
      } else if (err.message === 'EMAIL_EXISTS') {
        msg = 'An account with this email already exists.'
      }
      set({ authError: msg, isAuthLoading: false })
      throw err
    }
  },

  logout: () => {
    localStorage.removeItem('study_buddy_token')
    sessionStorage.removeItem('study_buddy_token')
    set({ user: null, token: null, isAuthenticated: false, authError: null, isAuthLoading: false, rememberMe: false })
  },

  loadSession: async () => {
    const token = localStorage.getItem('study_buddy_token') || sessionStorage.getItem('study_buddy_token')
    if (!token) { set({ isAuthLoading: false }); return }
    set({ isAuthLoading: true, authError: null })
    try {
      const { user } = await authService.validateToken(token)
      set({ user, token, isAuthenticated: true, isAuthLoading: false })
    } catch {
      localStorage.removeItem('study_buddy_token')
      sessionStorage.removeItem('study_buddy_token')
      set({ user: null, token: null, isAuthenticated: false, isAuthLoading: false })
    }
  },

  updateProfile: async (data) => {
    set({ isAuthLoading: true, authError: null })
    try {
      const { user } = await authService.updateProfile(data)
      set({ user, isAuthLoading: false })
    } catch {
      set({ authError: 'Failed to update profile.', isAuthLoading: false })
      throw new Error('Failed to update profile')
    }
  },

  changePassword: async (currentPassword, newPassword) => {
    set({ isAuthLoading: true, authError: null })
    try {
      await authService.changePassword({ currentPassword, newPassword })
      set({ isAuthLoading: false })
    } catch (err) {
      const msg = err.message === 'WRONG_PASSWORD'
        ? 'Current password is incorrect.'
        : 'Failed to change password.'
      set({ authError: msg, isAuthLoading: false })
      throw new Error(msg)
    }
  },

  deleteAccount: async () => {
    set({ isAuthLoading: true, authError: null })
    try {
      await authService.deleteAccount()
      get().logout()
    } catch {
      set({ isAuthLoading: false, authError: 'Failed to delete account.' })
      throw new Error('Failed to delete account')
    }
  },

  clearError: () => set({ authError: null }),
  setRememberMe: (val) => set({ rememberMe: val }),

  selectUserInitials: () => {
    const name = get().user?.name || ''
    return name.split(' ').slice(0, 2).map((n) => n[0]?.toUpperCase()).join('')
  },
})

export default createAuthSlice
