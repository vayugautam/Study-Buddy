import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Button from '../components/ui/Button'

export default function Landing() {
  return (
    <div className="min-h-screen bg-neutral-50 font-sans text-neutral-900 overflow-hidden">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 lg:px-12 py-6">
        <div className="flex items-center gap-3 text-primary-600 font-bold text-xl">
          <div className="w-10 h-10 rounded-xl bg-gradient-brand text-white flex items-center justify-center shadow-sm">
            SB
          </div>
          AI Study Buddy
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-neutral-600 font-medium hover:text-neutral-900 transition-colors">Log in</Link>
          <Link to="/signup">
            <Button>Get Started Free</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="px-6 lg:px-12 pt-16 pb-24 lg:pt-32 lg:pb-40 text-center max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-50 text-primary-600 text-sm font-medium mb-8 border border-primary-100">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
            </span>
            Now open in public beta
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-neutral-900 mb-6 leading-tight">
            Turn your <span className="text-transparent bg-clip-text bg-gradient-brand">lecture notes</span><br />
            into straight A's.
          </h1>
          
          <p className="text-xl text-neutral-500 mb-10 max-w-2xl mx-auto">
            Upload any PDF and our AI will instantly generate quizzes, flashcards, and let you chat directly with your course materials.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup">
              <Button size="xl" className="w-full sm:w-auto shadow-float">Start Studying Now</Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="xl" className="w-full sm:w-auto bg-white">View Demo</Button>
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
