import { useEffect } from 'react'
import { useUI } from './store'
import AppRouter from './routes'
import ToastContainer from './components/ui/Toast'

export default function App() {
  const { initTheme } = useUI()

  useEffect(() => {
    initTheme()
  }, [initTheme])

  return (
    <>
      <AppRouter />
      <ToastContainer />
    </>
  )
}
