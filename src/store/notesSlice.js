import notesService from '../services/notesService'

const createNotesSlice = (set, get) => ({
  // State
  notes: [],
  selectedNoteId: null,
  isNotesLoading: false,
  isUploading: false,
  uploadProgress: {},
  notesError: null,
  searchTerm: '',
  filters: { tags: [], sourceType: 'all', sortBy: 'recent' },
  viewMode: localStorage.getItem('notes_view_preference') || 'grid',
  pendingDeleteId: null,
  pendingDeleteTimer: null,

  // Actions
  fetchNotes: async () => {
    set({ isNotesLoading: true, notesError: null })
    try {
      const notes = await notesService.fetchList()
      set({ notes, isNotesLoading: false })
    } catch {
      set({ notesError: 'Failed to load notes.', isNotesLoading: false })
    }
  },

  addNote: async (file) => {
    const fileId = `upload_${Date.now()}`
    set((s) => ({ isUploading: true, uploadProgress: { ...s.uploadProgress, [fileId]: 0 } }))

    // Simulate progress
    const interval = setInterval(() => {
      const current = get().uploadProgress[fileId] || 0
      if (current >= 90) { clearInterval(interval); return }
      set((s) => ({ uploadProgress: { ...s.uploadProgress, [fileId]: current + 10 } }))
    }, 150)

    try {
      const note = await notesService.upload(file)
      clearInterval(interval)
      set((s) => ({ notes: [note, ...s.notes], uploadProgress: { ...s.uploadProgress, [fileId]: 100 }, isUploading: false }))
      return { note, fileId }
    } catch {
      clearInterval(interval)
      set((s) => {
        const p = { ...s.uploadProgress }
        delete p[fileId]
        return { error: 'Upload failed.', isUploading: false, uploadProgress: p }
      })
      throw new Error('Upload failed')
    }
  },

  deleteNote: (noteId) => {
    const timer = setTimeout(() => { get().commitDelete(noteId) }, 5000)
    set((s) => {
      if (s.pendingDeleteTimer) clearTimeout(s.pendingDeleteTimer)
      return { pendingDeleteId: noteId, pendingDeleteTimer: timer }
    })
  },

  commitDelete: async (noteId) => {
    try { await notesService.delete(noteId) } catch {}
    set((s) => ({
      notes: s.notes.filter((n) => n.id !== noteId),
      pendingDeleteId: null,
      pendingDeleteTimer: null,
    }))
  },

  undoDelete: () => {
    set((s) => {
      if (s.pendingDeleteTimer) clearTimeout(s.pendingDeleteTimer)
      return { pendingDeleteId: null, pendingDeleteTimer: null }
    })
  },

  selectNote: (noteId) => set({ selectedNoteId: noteId }),
  setSearchTerm: (term) => set({ searchTerm: term }),
  setFilter: (key, value) => set((s) => ({ filters: { ...s.filters, [key]: value } })),
  resetFilters: () => set({ searchTerm: '', filters: { tags: [], sourceType: 'all', sortBy: 'recent' } }),
  setViewMode: (mode) => {
    localStorage.setItem('notes_view_preference', mode)
    set({ viewMode: mode })
  },

  // Selectors (computed)
  getFilteredNotes: () => {
    const { notes, searchTerm, filters, pendingDeleteId } = get()
    let result = notes.filter((n) => n.id !== pendingDeleteId)

    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      result = result.filter((n) =>
        n.title.toLowerCase().includes(q) ||
        (n.tags || []).some((t) => t.toLowerCase().includes(q)) ||
        (n.subject || '').toLowerCase().includes(q)
      )
    }

    if (filters.sourceType !== 'all') {
      result = result.filter((n) => n.sourceType === filters.sourceType)
    }

    if (filters.tags.length > 0) {
      result = result.filter((n) => filters.tags.every((t) => (n.tags || []).includes(t)))
    }

    switch (filters.sortBy) {
      case 'az':     return result.sort((a, b) => a.title.localeCompare(b.title))
      case 'studied': return result.sort((a, b) => (b.studyCount || 0) - (a.studyCount || 0))
      default:        return result.sort((a, b) => new Date(b.lastOpenedAt) - new Date(a.lastOpenedAt))
    }
  },

  getUniqueTags: () => {
    const tags = new Set()
    get().notes.forEach((n) => (n.tags || []).forEach((t) => tags.add(t)))
    return Array.from(tags).sort()
  },
})

export default createNotesSlice
