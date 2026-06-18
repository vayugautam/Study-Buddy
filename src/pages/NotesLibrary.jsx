import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNotes, useUI } from '../store'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import ProgressBar from '../components/ui/ProgressBar'
import { CardSkeleton } from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'

export default function NotesLibrary() {
  const { notes, fetchNotes, isLoading, isUploading, uploadProgress, addNote, deleteNote, getFilteredNotes, getUniqueTags, setSearchTerm, searchTerm } = useNotes()
  const { addToast } = useUI()
  const [isUploadModalOpen, setUploadModalOpen] = useState(false)
  
  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  const filteredNotes = getFilteredNotes()
  const fileInputRef = useRef(null)

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (file.type !== 'application/pdf') {
      addToast('Only PDF files are supported currently.', 'error')
      return
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB
      addToast('File exceeds 10MB limit.', 'error')
      return
    }

    setUploadModalOpen(false)
    try {
      await addNote(file)
      addToast('Document uploaded successfully!', 'success')
    } catch {
      addToast('Upload failed.', 'error')
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-content mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-h2 text-neutral-900">Notes Library</h1>
        <Button onClick={() => setUploadModalOpen(true)} leftIcon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
        }>
          Upload PDF
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Input 
            placeholder="Search notes by title, subject, or tags..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
          />
        </div>
      </div>

      {isUploading && Object.entries(uploadProgress).map(([id, progress]) => (
        <Card key={id} padding="sm" className="bg-primary-50 border-primary-100 flex items-center gap-4">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-primary-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-primary-900">Uploading document...</span>
              <span className="text-primary-700">{progress}%</span>
            </div>
            <ProgressBar value={progress} color="primary" height="sm" />
          </div>
        </Card>
      ))}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : filteredNotes.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {filteredNotes.map((note, i) => (
              <motion.div
                key={note.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Card hoverable className="h-full flex flex-col group overflow-hidden" padding="none">
                  <div className="h-24 w-full relative" style={{ backgroundColor: note.color || '#8b5cf6' }}>
                    <div className="absolute bottom-3 left-4 bg-white/90 backdrop-blur text-xs font-semibold px-2 py-1 rounded-md shadow-sm">
                      {(note.sourceType || 'PDF').toUpperCase()}
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        deleteNote(note.id)
                        addToast('Note deleted.', 'info')
                      }}
                      className="absolute top-3 right-3 p-1.5 bg-black/20 hover:bg-black/40 text-white rounded-lg opacity-80 hover:opacity-100 transition-all backdrop-blur-sm"
                      title="Delete Note"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="font-semibold text-lg text-neutral-900 mb-1 group-hover:text-primary-600 transition-colors line-clamp-2">{note.title}</h3>
                    <p className="text-sm text-neutral-500 line-clamp-2 flex-1 mb-4">{note.excerpt}</p>
                    
                    <div className="flex items-center justify-between mt-auto text-xs text-neutral-400">
                      <span>{note.pageCount ? `${note.pageCount} pages` : 'Document'}</span>
                      <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <EmptyState 
          title={searchTerm ? 'No notes found' : 'Your library is empty'}
          description={searchTerm ? `We couldn't find any notes matching "${searchTerm}"` : 'Upload your first PDF to start chatting and generating quizzes.'}
          icon={<svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
          action={searchTerm ? () => setSearchTerm('') : () => setUploadModalOpen(true)}
          actionLabel={searchTerm ? 'Clear search' : 'Upload PDF'}
        />
      )}

      {/* Upload Modal */}
      <Modal 
        isOpen={isUploadModalOpen} 
        onClose={() => setUploadModalOpen(false)} 
        title="Upload Document"
      >
        <div 
          className="border-2 border-dashed border-neutral-300 rounded-2xl p-10 text-center hover:bg-neutral-50 hover:border-primary-400 transition-colors cursor-pointer group"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-16 h-16 bg-primary-100 text-primary-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 mb-1">Click to browse or drag PDF here</h3>
          <p className="text-sm text-neutral-500">Maximum file size 10MB</p>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="application/pdf"
            onChange={handleFileChange}
          />
        </div>
      </Modal>
    </div>
  )
}
