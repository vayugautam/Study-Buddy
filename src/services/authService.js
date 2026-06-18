import { adapter } from './_adapter'
import usersData from '../mock/users.json'

// In-memory store for mock auth
let mockUsers = [...usersData]
const TEST_EMAIL = 'jane@example.com'
const TEST_PASSWORD = 'password123'

const authService = {
  login: ({ email, password }) => {
    return adapter.post(
      () => {
        if (email === TEST_EMAIL && password === TEST_PASSWORD) {
          const user = mockUsers.find((u) => u.email === email)
          return { user, token: 'mock-jwt-token-xyz-123' }
        }
        throw new Error('INVALID_CREDENTIALS')
      },
      '/auth/login',
      { email, password },
      1200
    )
  },

  signup: ({ name, email, password }) => {
    return adapter.post(
      () => {
        const exists = mockUsers.find((u) => u.email === email)
        if (exists) throw new Error('EMAIL_EXISTS')
        const newUser = {
          id: `user_${Date.now()}`,
          name,
          email,
          avatarUrl: null,
          joinedAt: new Date().toISOString(),
          bio: '',
          preferences: {
            theme: 'system',
            defaultQuizLength: 10,
            defaultDifficulty: 'medium',
            language: 'en',
            notifications: { studyReminders: true, quizResults: false, weeklySummary: true },
          },
          stats: { notesCount: 0, quizzesTaken: 0, avgQuizScore: 0, flashcardsMastered: 0, studyStreakDays: 0, totalStudyMinutes: 0, lastActiveAt: new Date().toISOString() },
        }
        mockUsers.push(newUser)
        return { user: newUser, token: 'mock-jwt-token-new-user-456' }
      },
      '/auth/register',
      { name, email, password },
      1200
    )
  },

  validateToken: (token) => {
    return adapter.get(
      () => {
        if (token && token.startsWith('mock-jwt-token')) {
          return { user: mockUsers[0] }
        }
        throw new Error('INVALID_TOKEN')
      },
      '/auth/me',
      300
    )
  },

  updateProfile: (data) => {
    return adapter.patch(
      () => {
        const user = mockUsers[0]
        Object.assign(user, data)
        return { user }
      },
      '/auth/profile',
      data,
      600
    )
  },

  changePassword: ({ currentPassword, newPassword }) => {
    return adapter.post(
      () => {
        if (currentPassword !== TEST_PASSWORD) throw new Error('WRONG_PASSWORD')
        return { success: true }
      },
      '/auth/password',
      { oldPassword: currentPassword, newPassword },
      800
    )
  },

  deleteAccount: () => {
    return adapter.delete(
      () => ({ success: true }),
      '/auth/account',
      1500
    )
  },
}

export default authService
