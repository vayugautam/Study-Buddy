import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import MainLayout from '../components/layout/MainLayout'

import Dashboard from '../pages/Dashboard'
import NotesLibrary from '../pages/NotesLibrary'
import Chat from '../pages/Chat'
import Quizzes from '../pages/Quizzes'
import QuizSession from '../pages/QuizSession'
import Flashcards from '../pages/Flashcards'
import FlashcardSession from '../pages/FlashcardSession'
import Profile from '../pages/Profile'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    element: <MainLayout />,
    children: [
      { path: '/dashboard', element: <Dashboard /> },
      { path: '/notes', element: <NotesLibrary /> },
      { path: '/chat', element: <Chat /> },
      { path: '/chat/:chatId', element: <Chat /> },
      { path: '/quizzes', element: <Quizzes /> },
      { path: '/quizzes/:quizId', element: <QuizSession /> },
      { path: '/flashcards', element: <Flashcards /> },
      { path: '/flashcards/:deckId', element: <FlashcardSession /> },
      { path: '/profile', element: <Profile /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
])

export default function AppRouter() {
  return <RouterProvider router={router} />
}
