import { adapter } from './_adapter'
import notesData from '../mock/notes.json'

let mockNotes = [...notesData]

const notesService = {
  fetchList: async () => {
    const res = await adapter.get(() => mockNotes, '/notes', 750)
    // The real backend returns { notes: [...], pagination: {...} }
    // The mock returns an array directly.
    return Array.isArray(res) ? res : res.notes || []
  },

  getById: (noteId) => {
    return adapter.get(
      () => {
        const note = mockNotes.find((n) => n.id === noteId)
        if (!note) throw new Error('NOTE_NOT_FOUND')
        return note
      },
      `/notes/${noteId}`,
      350
    )
  },

  upload: (fileData) => {
    return adapter.post(
      () => {
        const newNote = {
          id: `note_${Date.now()}`,
          ownerId: 'user_001',
          title: fileData.name?.replace('.pdf', '') || 'Untitled Document',
          sourceType: 'pdf',
          subject: 'General',
          tags: ['General'],
          pageCount: Math.floor(Math.random() * 30) + 5,
          wordCount: null,
          fileSizeKb: Math.floor((fileData.size || 1024000) / 1024),
          color: '#8b5cf6',
          excerpt: 'Document uploaded successfully. AI analysis in progress...',
          createdAt: new Date().toISOString(),
          lastOpenedAt: new Date().toISOString(),
          studyCount: 0,
        }
        mockNotes.unshift(newNote)
        return newNote
      },
      '/notes/upload',
      (() => {
        const formData = new FormData()
        formData.append('pdf', fileData)
        return formData
      })(),
      1200
    ).then(res => {
      const isReal = typeof import.meta !== 'undefined' && import.meta.env.VITE_USE_MOCK === 'false'
      return (isReal && res.note) ? res.note : res
    })
  },

  delete: (noteId) => {
    return adapter.delete(
      () => {
        mockNotes = mockNotes.filter((n) => n.id !== noteId)
        return { success: true }
      },
      `/notes/${noteId}`,
      400
    )
  },

  update: (noteId, data) => {
    return adapter.patch(
      () => {
        const idx = mockNotes.findIndex((n) => n.id === noteId)
        if (idx !== -1) mockNotes[idx] = { ...mockNotes[idx], ...data }
        return mockNotes[idx]
      },
      `/notes/${noteId}`,
      data,
      400
    )
  },
}

export default notesService
