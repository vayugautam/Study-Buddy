const createUiSlice = (set, get) => ({
  // State
  theme: localStorage.getItem('study_buddy_theme') || 'system',
  sidebarOpen: true,
  toasts: [],
  modalStack: [],

  // Theme
  setTheme: (theme) => {
    localStorage.setItem('study_buddy_theme', theme)
    set({ theme })
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.classList.toggle('dark', isDark)
  },

  initTheme: () => {
    const theme = localStorage.getItem('study_buddy_theme') || 'system'
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.classList.toggle('dark', isDark)
    set({ theme })
  },

  // Sidebar
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Toasts
  addToast: (message, type = 'info', duration = 3000) => {
    const id = `toast_${Date.now()}`
    set((s) => ({ toasts: [...s.toasts, { id, message, type, duration }] }))
    if (duration > 0) {
      setTimeout(() => get().removeToast(id), duration)
    }
    return id
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
})

export default createUiSlice
