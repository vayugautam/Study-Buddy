import { adapter } from './_adapter'
import chatsData from '../mock/chats.json'
import messagesData from '../mock/messages.json'

let mockChats = [...chatsData]
let mockMessages = { ...messagesData }

const MOCK_AI_RESPONSES = [
  "That's a great question! Based on your notes, here is what I found:\n\n**Key Points:**\n- The main concept revolves around the fundamental principles outlined in your document.\n- There are several important factors to consider when studying this topic.\n- Practice questions can help reinforce your understanding.\n\n> Would you like me to generate some practice questions on this topic?",
  "## Summary\n\nBased on your uploaded notes, here's a concise explanation:\n\nThe topic covers several important areas that are commonly tested in examinations. The key is to understand the **underlying mechanisms** rather than just memorizing facts.\n\n```\nKey Formula: Understanding = Study + Practice + Review\n```",
  "Great question! Here's what your notes say about this:\n\n### Main Points\n1. **First principle** — The foundational concept you need to understand.\n2. **Second principle** — How it applies in practice.\n3. **Third principle** — Common misconceptions to avoid.\n\nWould you like me to create flashcards from these points?",
]

const chatService = {
  fetchSessions: () => {
    const isReal = typeof import.meta !== 'undefined' && import.meta.env.VITE_USE_MOCK === 'false'
    return adapter.get(() => mockChats, isReal ? '/chat' : '/chats', 600)
  },

  getMessages: (chatId) => {
    const isReal = typeof import.meta !== 'undefined' && import.meta.env.VITE_USE_MOCK === 'false'
    return adapter.get(
      () => mockMessages[chatId] || [],
      isReal ? `/chat/${chatId}` : `/chats/${chatId}/messages`,
      400
    ).then(res => (isReal && !Array.isArray(res)) ? res.messages : res)
  },

  sendMessage: ({ chatId, text, noteIds }) => {
    const isReal = typeof import.meta !== 'undefined' && import.meta.env.VITE_USE_MOCK === 'false'
    return adapter.post(
      () => {
        const randomResponse = MOCK_AI_RESPONSES[Math.floor(Math.random() * MOCK_AI_RESPONSES.length)]
        return {
          reply: randomResponse,
          citations: noteIds?.length
            ? [{ noteId: noteIds[0], noteTitle: 'Your Note', pageRef: null }]
            : [],
        }
      },
      isReal ? '/chat/ask' : `/chats/${chatId}/messages`,
      isReal ? { query: text, chatId, noteIds } : { text, noteIds },
      1200
    ).then(res => {
      if (isReal && res.message && res.message.aiMessage) {
        return {
          reply: res.message.aiMessage.content,
          citations: res.message.aiMessage.citations,
        }
      }
      return res
    })
  },

  createSession: (noteIds = []) => {
    const isReal = typeof import.meta !== 'undefined' && import.meta.env.VITE_USE_MOCK === 'false'
    return adapter.post(
      () => {
        const newChat = {
          id: `chat_${Date.now()}`,
          ownerId: 'user_001',
          title: 'New Chat',
          noteIds,
          messageCount: 0,
          lastMessageSnippet: '',
          lastMessageRole: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        mockChats.unshift(newChat)
        mockMessages[newChat.id] = []
        return newChat
      },
      isReal ? '/chat' : '/chats',
      { noteIds },
      300
    ).then(res => (isReal && res.chat) ? res.chat : res)
  },

  renameSession: (chatId, title) => {
    const isReal = typeof import.meta !== 'undefined' && import.meta.env.VITE_USE_MOCK === 'false'
    return adapter.patch(
      () => {
        const idx = mockChats.findIndex((c) => c.id === chatId)
        if (idx !== -1) mockChats[idx].title = title
        return { success: true }
      },
      isReal ? `/chat/${chatId}` : `/chats/${chatId}`,
      { title },
      300
    )
  },

  deleteSession: (chatId) => {
    const isReal = typeof import.meta !== 'undefined' && import.meta.env.VITE_USE_MOCK === 'false'
    return adapter.delete(
      () => {
        mockChats = mockChats.filter((c) => c.id !== chatId)
        delete mockMessages[chatId]
        return { success: true }
      },
      isReal ? `/chat/${chatId}` : `/chats/${chatId}`,
      400
    )
  },
}

export default chatService
