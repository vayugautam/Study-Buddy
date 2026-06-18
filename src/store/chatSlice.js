import chatService from '../services/chatService'
import { getRecencyGroup } from '../lib/utils'

const createChatSlice = (set, get) => ({
  // State
  sessions: [],
  messages: {},
  activeChatId: null,
  isSending: false,
  isStreaming: false,
  isLoadingSessions: false,
  isLoadingMessages: false,
  error: null,
  searchQuery: '',
  renameTargetId: null,
  streamRef: null,

  // Actions
  fetchSessions: async () => {
    set({ isLoadingSessions: true, error: null })
    try {
      const sessions = await chatService.fetchSessions()
      set({ sessions, isLoadingSessions: false })
    } catch {
      set({ error: 'Failed to load chats.', isLoadingSessions: false })
    }
  },

  loadChat: async (chatId) => {
    set({ activeChatId: chatId, isLoadingMessages: true })
    if (!get().messages[chatId]) {
      try {
        const msgs = await chatService.getMessages(chatId)
        set((s) => ({ messages: { ...s.messages, [chatId]: msgs }, isLoadingMessages: false }))
      } catch {
        set({ isLoadingMessages: false })
      }
    } else {
      set({ isLoadingMessages: false })
    }
  },

  newChat: async (noteIds = []) => {
    try {
      const session = await chatService.createSession(noteIds)
      set((s) => ({
        sessions: [session, ...s.sessions],
        messages: { ...s.messages, [session.id]: [] },
        activeChatId: session.id,
      }))
      return session
    } catch {
      // Fallback: create locally
      const session = {
        id: `chat_${Date.now()}`,
        ownerId: 'user_001',
        title: 'New Chat',
        noteIds,
        messageCount: 0,
        lastMessageSnippet: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      set((s) => ({
        sessions: [session, ...s.sessions],
        messages: { ...s.messages, [session.id]: [] },
        activeChatId: session.id,
      }))
      return session
    }
  },

  sendMessage: async (chatId, text, noteIds = []) => {
    const userMsg = {
      id: `msg_${Date.now()}`,
      chatId,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
      citations: null,
    }

    set((s) => ({
      messages: { ...s.messages, [chatId]: [...(s.messages[chatId] || []), userMsg] },
      isSending: true,
    }))

    // Auto-title if new
    get().autoTitleIfNew(chatId, text)

    try {
      const { reply, citations } = await chatService.sendMessage({ chatId, text, noteIds })

      const aiMsgId = `msg_ai_${Date.now()}`
      const aiMsg = {
        id: aiMsgId,
        chatId,
        role: 'ai',
        content: '',
        createdAt: new Date().toISOString(),
        citations: citations || [],
      }

      set((s) => ({
        messages: { ...s.messages, [chatId]: [...(s.messages[chatId] || []), aiMsg] },
        isSending: false,
        isStreaming: true,
      }))

      // Stream simulation: word-by-word
      const words = reply.split(' ')
      let i = 0
      const interval = setInterval(() => {
        if (i >= words.length) {
          clearInterval(interval)
          set({ isStreaming: false })
          // Update session snippet
          set((s) => ({
            sessions: s.sessions.map((sess) =>
              sess.id === chatId
                ? { ...sess, lastMessageSnippet: reply.replace(/[#*`]/g, '').slice(0, 80), updatedAt: new Date().toISOString() }
                : sess
            ),
          }))
          return
        }
        const chunk = words.slice(0, i + 1).join(' ')
        set((s) => ({
          messages: {
            ...s.messages,
            [chatId]: s.messages[chatId].map((m) =>
              m.id === aiMsgId ? { ...m, content: chunk } : m
            ),
          },
        }))
        i++
      }, 30)
    } catch (err) {
      set((s) => {
        const errorMsg = {
          id: `msg_error_${Date.now()}`,
          chatId,
          role: 'ai',
          content: 'Oops! I encountered an error while trying to generate an answer. Please check your connection or log in again.',
          createdAt: new Date().toISOString(),
          citations: []
        }
        return {
          messages: { ...s.messages, [chatId]: [...(s.messages[chatId] || []), errorMsg] },
          isSending: false,
          isStreaming: false
        }
      })
    }
  },

  autoTitleIfNew: (chatId, text) => {
    set((s) => ({
      sessions: s.sessions.map((sess) =>
        sess.id === chatId && sess.title === 'New Chat'
          ? { ...sess, title: text.slice(0, 50) }
          : sess
      ),
    }))
  },

  renameChat: async (chatId, newTitle) => {
    set((s) => ({
      sessions: s.sessions.map((sess) => sess.id === chatId ? { ...sess, title: newTitle } : sess),
    }))
    try { await chatService.renameSession(chatId, newTitle) } catch {}
    set({ renameTargetId: null })
  },

  deleteChat: async (chatId) => {
    const { sessions, activeChatId } = get()
    const remaining = sessions.filter((s) => s.id !== chatId)
    const newActive = activeChatId === chatId ? (remaining[0]?.id || null) : activeChatId
    set((s) => {
      const msgs = { ...s.messages }
      delete msgs[chatId]
      return { sessions: remaining, messages: msgs, activeChatId: newActive }
    })
    try { await chatService.deleteSession(chatId) } catch {}
  },

  setSearchQuery: (q) => set({ searchQuery: q }),
  setRenameTarget: (id) => set({ renameTargetId: id }),

  // Selectors
  getFilteredSessions: () => {
    const { sessions, searchQuery } = get()
    if (!searchQuery) return sessions
    const q = searchQuery.toLowerCase()
    return sessions.filter((s) => s.title.toLowerCase().includes(q) || s.lastMessageSnippet?.toLowerCase().includes(q))
  },

  getGroupedSessions: () => {
    const sessions = get().getFilteredSessions()
    const groups = {}
    sessions.forEach((s) => {
      const group = getRecencyGroup(s.updatedAt)
      if (!groups[group]) groups[group] = []
      groups[group].push(s)
    })
    return groups
  },

  getActiveMessages: () => {
    const { messages, activeChatId } = get()
    const msgs = activeChatId ? (messages[activeChatId] || []) : []
    // Always filter out error bubbles — no function call needed
    return msgs.filter((m) => !m.id?.startsWith('msg_error_'))
  },
})

export default createChatSlice
