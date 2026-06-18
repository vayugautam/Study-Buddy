import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth, useNotes, useUI, useQuiz } from '../store'
import StatCard from '../components/ui/StatCard'
import Card from '../components/ui/Card'
import ProgressBar from '../components/ui/ProgressBar'
import NoteActionModal from '../components/ui/NoteActionModal'

export default function Dashboard() {
  const { user } = useAuth()
  const { notes, isLoading: isLoadingNotes, isUploading, uploadProgress, fetchNotes, addNote } = useNotes()
  const { quizzes, fetchQuizzes } = useQuiz()
  const { addToast } = useUI()

  const [selectedNote, setSelectedNote] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => { 
    fetchNotes()
    fetchQuizzes()
  }, [fetchNotes, fetchQuizzes])

  const stats = user?.stats || {}

  const allAttempts = quizzes.flatMap(q => q.attempts || [])
  const quizzesTaken = allAttempts.length
  const avgQuizScore = quizzesTaken > 0 
    ? Math.round(allAttempts.reduce((sum, a) => sum + a.score, 0) / quizzesTaken)
    : 0

  /* ── Upload helpers ─────────────────────────────────────────────── */
  const handleFile = async (file) => {
    if (!file) return
    if (file.type !== 'application/pdf') { addToast('Only PDF files are supported.', 'error'); return }
    if (file.size > 10 * 1024 * 1024) { addToast('File exceeds 10 MB limit.', 'error'); return }
    try {
      await addNote(file)
      addToast('PDF uploaded! AI is processing it in the background.', 'success')
    } catch {
      addToast('Upload failed. Please try again.', 'error')
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    handleFile(e.dataTransfer.files?.[0])
  }

  return (
    <div className="p-6 lg:p-8 max-w-content mx-auto space-y-8">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-h2 text-neutral-900 mb-1">
            Welcome back, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-neutral-500">Upload a PDF and start studying smarter.</p>
        </div>
        <Link
          to="/notes"
          className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
        >
          View full library →
        </Link>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Documents"     value={notes.length || stats.notesCount || 0}    icon="📄" accentColor="primary" isLoading={!user} />
        <StatCard label="Quizzes Taken" value={quizzesTaken}                             icon="🎯" accentColor="success" isLoading={!user} />
        <StatCard label="Avg Score"     value={`${avgQuizScore}%`}                       icon="⭐" accentColor="warning" isLoading={!user} />
      </div>

      {/* ── Upload Drop Zone ───────────────────────────────────────── */}
      <div>
        <h2 className="text-h4 text-neutral-900 mb-4">Upload a PDF</h2>
        <motion.div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          animate={{ borderColor: isDragging ? '#6d28d9' : '#d1d5db', scale: isDragging ? 1.01 : 1 }}
          transition={{ duration: 0.15 }}
          className="relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer group transition-colors hover:border-primary-400 hover:bg-primary-50"
          style={{ borderColor: isDragging ? '#6d28d9' : undefined }}
        >
          {isDragging && (
            <div className="absolute inset-0 bg-primary-50 rounded-2xl flex items-center justify-center pointer-events-none">
              <p className="text-primary-600 font-semibold text-lg">Drop to upload</p>
            </div>
          )}
          <div className="w-16 h-16 bg-primary-100 text-primary-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-neutral-800 mb-1">Drag & drop your PDF here</h3>
          <p className="text-sm text-neutral-500">or click to browse — max 10 MB</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </motion.div>

        {/* Upload Progress */}
        <AnimatePresence>
          {isUploading && Object.entries(uploadProgress).map(([id, progress]) => (
            <motion.div
              key={id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 bg-primary-50 border border-primary-100 rounded-xl p-4 flex items-center gap-4"
            >
              <svg className="w-5 h-5 text-primary-500 animate-pulse shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-primary-900">Uploading…</span>
                  <span className="text-primary-700">{progress}%</span>
                </div>
                <ProgressBar value={progress} color="primary" height="sm" />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── Note Cards ─────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-h4 text-neutral-900">Your Notes</h2>
          <Link to="/notes" className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors">
            View all
          </Link>
        </div>

        {isLoadingNotes ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-52 bg-neutral-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-neutral-200 rounded-2xl">
            <p className="text-4xl mb-3">📂</p>
            <p className="font-medium text-neutral-700 mb-1">No notes yet</p>
            <p className="text-sm text-neutral-500">Upload a PDF above to get started</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            <AnimatePresence>
              {notes.map((note, i) => (
                <motion.div
                  key={note.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2, delay: i < 8 ? i * 0.04 : 0 }}
                >
                  <NoteCard note={note} onClick={() => setSelectedNote(note)} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Note Action Modal ───────────────────────────────────────── */}
      <NoteActionModal
        note={selectedNote}
        isOpen={!!selectedNote}
        onClose={() => setSelectedNote(null)}
      />
    </div>
  )
}

/* ── Note Card ──────────────────────────────────────────────────────── */
function NoteCard({ note, onClick }) {
  const isProcessing = note.status && note.status !== 'ready'

  return (
    <button
      onClick={onClick}
      className="w-full text-left group focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 rounded-2xl"
    >
      <Card
        hoverable
        className="h-full flex flex-col overflow-hidden"
        padding="none"
      >
        {/* Coloured banner */}
        <div
          className="h-20 w-full relative flex items-end p-3 shrink-0"
          style={{ backgroundColor: note.color || '#8b5cf6' }}
        >
          <span className="bg-white/90 backdrop-blur text-xs font-semibold px-2 py-0.5 rounded-md shadow-sm uppercase tracking-wide">
            {note.sourceType || 'PDF'}
          </span>
          {isProcessing && (
            <span className="absolute top-2 right-2 bg-amber-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide animate-pulse">
              Processing
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex-1 flex flex-col">
          <h3 className="font-semibold text-neutral-900 group-hover:text-primary-600 transition-colors line-clamp-2 mb-1 text-sm leading-snug">
            {note.title}
          </h3>
          <p className="text-xs text-neutral-500 line-clamp-2 flex-1 mb-3">
            {note.excerpt || 'No preview available.'}
          </p>

          {/* Tags */}
          {note.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {note.tags.slice(0, 2).map(tag => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-neutral-100 text-neutral-600 rounded-md font-medium">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-3 border-t border-neutral-100">
            <span>{note.pageCount ? `${note.pageCount} pages` : '—'}</span>
            <span className="inline-flex items-center gap-1 text-primary-600 font-medium group-hover:gap-2 transition-all text-xs">
              Open <span className="text-sm">→</span>
            </span>
          </div>
        </div>
      </Card>
    </button>
  )
}
