import { clsx } from 'clsx'

// Classname utility
export function cn(...inputs) {
  return clsx(inputs)
}

// Format relative time
export function formatRelativeTime(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Format date for display
export function formatDate(dateString, opts = {}) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...opts,
  })
}

// Format seconds to MM:SS
export function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

// Get initials from name
export function getInitials(name = '') {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('')
}

// Get recency group label
export function getRecencyGroup(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays <= 7) return 'Previous 7 Days'
  return 'Older'
}

// Fisher-Yates shuffle
export function shuffleArray(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// Password strength scorer (0-4)
export function scorePassword(password) {
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  return score
}

// Deep clone
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

// Truncate text
export function truncate(text, maxLength) {
  if (!text || text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

// Get grade band info
export function getGradeBand(score) {
  if (score >= 90) return { label: 'Excellent!', emoji: '🏆', color: 'success', band: 'excellent' }
  if (score >= 75) return { label: 'Great job!', emoji: '⭐', color: 'primary', band: 'great' }
  if (score >= 60) return { label: 'Good effort', emoji: '👍', color: 'info', band: 'good' }
  if (score >= 50) return { label: 'Keep studying', emoji: '📚', color: 'warning', band: 'fair' }
  return { label: 'Needs work', emoji: '💪', color: 'error', band: 'poor' }
}
