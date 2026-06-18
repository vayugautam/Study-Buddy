import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useChat, useNotes } from '../store'
import Button from '../components/ui/Button'
import { MessageSkeleton } from '../components/ui/Skeleton'
import ReactMarkdown from 'react-markdown'
import { cn } from '../lib/utils'

export default function Chat() {
  const { chatId } = useParams()
  const navigate = useNavigate()
  const { 
    sessions, fetchSessions, loadChat, getActiveMessages, 
    sendMessage, isSending, isStreaming, newChat, activeChatId,
    deleteChat
  } = useChat()
  const { notes, fetchNotes } = useNotes()
  
  const [input, setInput] = useState('')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    fetchSessions()
    fetchNotes()
  }, [fetchSessions, fetchNotes])

  useEffect(() => {
    if (chatId) {
      loadChat(chatId)
    } else if (sessions.length > 0 && !activeChatId) {
      // Default to first chat if none selected
      navigate(`/chat/${sessions[0].id}`, { replace: true })
    }
  }, [chatId, sessions, loadChat, navigate, activeChatId])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [getActiveMessages(), isStreaming])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() || isSending) return
    const text = input.trim()
    setInput('')
    
    let targetChatId = chatId
    if (!targetChatId) {
      const session = await newChat()
      targetChatId = session.id
      navigate(`/chat/${targetChatId}`, { replace: true })
    }
    
    // Send all real note IDs so the RAG engine can search across all uploaded notes
    const noteIds = notes.map(n => n.id).filter(Boolean)
    await sendMessage(targetChatId, text, noteIds)
  }

  const messages = getActiveMessages()
  const activeSession = sessions.find(s => s.id === chatId)

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar - Chat History (simplified for now, ideally extracted to a component) */}
      <div className="w-80 border-r border-neutral-200 bg-neutral-50 flex flex-col hidden md:flex">
        <div className="p-4 border-b border-neutral-200">
          <Button 
            fullWidth 
            onClick={() => navigate('/chat')}
            leftIcon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}
          >
            New Chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {sessions.map(s => (
            <div key={s.id} className="relative group">
              <button
                onClick={() => navigate(`/chat/${s.id}`)}
                className={cn(
                  "w-full text-left p-3 rounded-xl transition-colors",
                  s.id === chatId ? "bg-primary-100 text-primary-900" : "hover:bg-neutral-200 text-neutral-700"
                )}
              >
                <div className="font-medium truncate pr-6">{s.title || 'New Chat'}</div>
                <div className="text-xs opacity-70 truncate mt-1">{s.lastMessageSnippet || 'No messages yet'}</div>
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  deleteChat(s.id)
                  if (s.id === chatId) {
                    navigate('/chat', { replace: true })
                  }
                }}
                className="absolute top-3 right-2 p-1 text-neutral-400 hover:text-red-500 opacity-80 hover:opacity-100 transition-opacity"
                title="Delete Chat"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Header */}
        <div className="h-14 border-b border-neutral-100 flex items-center px-6 shrink-0">
          <h2 className="font-semibold text-neutral-800">{activeSession?.title || 'New Chat'}</h2>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto">
              <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">How can I help you study?</h3>
              <p className="text-neutral-500 text-sm">Ask questions about your uploaded notes, request summaries, or have me test your knowledge.</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("flex gap-4 max-w-3xl mx-auto", msg.role === 'user' && "flex-row-reverse")}
              >
                {/* Avatar */}
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1",
                  msg.role === 'user' ? "bg-neutral-200" : "bg-gradient-brand text-white"
                )}>
                  {msg.role === 'user' ? (
                    <svg className="w-5 h-5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  ) : 'AI'}
                </div>
                
                {/* Bubble */}
                <div className={cn(
                  "px-5 py-3.5 rounded-2xl max-w-[85%]",
                  msg.role === 'user' 
                    ? "bg-primary-500 text-white rounded-tr-sm" 
                    : "bg-neutral-100 text-neutral-900 rounded-tl-sm prose prose-sm prose-primary max-w-none"
                )}>
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  ) : (
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  )}
                  
                  {/* Citations */}
                  {msg.citations?.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-neutral-200/60 flex flex-wrap gap-2">
                      {msg.citations.map((c, i) => (
                        <div key={i} className="text-[11px] font-medium px-2 py-1 bg-white rounded flex items-center gap-1.5 shadow-sm text-neutral-600">
                          <svg className="w-3 h-3 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          {c.noteTitle} {c.pageRef && <span className="opacity-60 border-l border-neutral-300 pl-1.5 ml-0.5">{c.pageRef}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}
          {isSending && !isStreaming && (
            <div className="max-w-3xl mx-auto">
              <MessageSkeleton />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 sm:p-6 bg-white border-t border-neutral-100 shrink-0">
          <form onSubmit={handleSend} className="max-w-3xl mx-auto relative flex items-end shadow-sm border border-neutral-200 rounded-2xl bg-white focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500 transition-all">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about your notes..."
              className="w-full max-h-32 min-h-[56px] py-4 pl-4 pr-14 bg-transparent outline-none resize-none text-neutral-900"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
            />
            <button 
              type="submit"
              disabled={!input.trim() || isSending}
              className="absolute right-2 bottom-2 p-2 rounded-xl bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50 disabled:bg-neutral-200 disabled:text-neutral-500 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
          </form>
          <div className="text-center mt-2">
            <p className="text-[11px] text-neutral-400">AI Study Buddy can make mistakes. Consider verifying important information.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
