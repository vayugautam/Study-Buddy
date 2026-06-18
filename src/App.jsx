import { useEffect } from 'react'
import { useAuth, useUI } from './store'
import AppRouter from './routes'
import ToastContainer from './components/ui/Toast'

export default function App() {
  const { loadSession } = useAuth()
  const { initTheme } = useUI()

  useEffect(() => {
    initTheme()
    loadSession()
  }, [initTheme, loadSession])

  return (
    <>
      <AppRouter />
      <ToastContainer />
    </>
  )
}
