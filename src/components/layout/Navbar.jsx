import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth, useUI } from '../../store'
import Avatar from '../ui/Avatar'

export default function Navbar() {
  const { user } = useAuth()
  const { sidebarOpen, toggleSidebar } = useUI()
  const location = useLocation()

  const pageTitle = {
    '/dashboard': 'Dashboard',
    '/notes': 'Notes Library',
    '/chat': 'Study Chat',
    '/quizzes': 'Quizzes',
    '/flashcards': 'Flashcards',
    '/profile': 'Profile',
  }[location.pathname] || 'AI Study Buddy'

  return (
    <header className="h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 transition-colors lg:hidden"
          aria-label="Toggle sidebar"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-neutral-900">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-4">
        <button className="p-2 text-neutral-400 hover:text-neutral-600 rounded-full hover:bg-neutral-100 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>
        <Link to="/profile" className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-full">
          <Avatar user={user} size="sm" />
        </Link>
      </div>
    </header>
  )
}
