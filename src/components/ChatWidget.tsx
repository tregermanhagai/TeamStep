import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Message {
  role: 'user' | 'assistant'
  text: string
}

const WELCOME: Message = {
  role: 'assistant',
  text: 'שלום! שאל אותי על דירוגי שחקנים, נתונים ואימונים 🏆\nHi! Ask me about player rankings, stats and training sessions.',
}

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, open])

  async function send() {
    const q = input.trim()
    if (!q || loading) return
    setMessages(prev => [...prev, { role: 'user', text: q }])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      })
      const data = await res.json()
      setMessages(prev => [
        ...prev,
        { role: 'assistant', text: data.answer ?? data.error ?? 'Sorry, something went wrong.' },
      ])
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', text: 'Network error. Please try again.' },
      ])
    }
    setLoading(false)
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-2">
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="w-[300px] h-[420px] bg-card border border-slate-700/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-base">⚽</span>
                <span className="text-sm font-semibold text-white">TeamStep AI</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-500 hover:text-white text-sm leading-none w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-700/50 transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs whitespace-pre-wrap break-words leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-accent text-bg rounded-br-sm'
                        : 'bg-slate-700/60 text-slate-100 rounded-bl-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-slate-700/60 px-4 py-2.5 rounded-2xl rounded-bl-sm">
                    <span className="flex gap-1 items-center">
                      {[0, 1, 2].map(i => (
                        <motion.span
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-slate-400 block"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                        />
                      ))}
                    </span>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-2.5 border-t border-slate-700/50 flex gap-2 items-end flex-shrink-0">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="שאל אותי מתי האימון הבא, או סטטיסטיקה של שחקנים ואימונים"
                rows={1}
                maxLength={500}
                className="flex-1 bg-slate-800 text-white text-xs rounded-xl px-3 py-2 border border-slate-600 focus:outline-none focus:border-accent resize-none placeholder-slate-500"
                style={{ minHeight: '34px', maxHeight: '80px' }}
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                className="bg-accent text-bg font-bold px-3 py-2 rounded-xl text-xs active:scale-95 transition-all disabled:opacity-40 flex-shrink-0"
                aria-label="Send"
              >
                ➤
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <motion.button
        onClick={() => setOpen(prev => !prev)}
        whileTap={{ scale: 0.9 }}
        className="w-12 h-12 bg-accent rounded-full flex items-center justify-center text-xl shadow-xl"
        aria-label={open ? 'Close chat' : 'Open AI chat'}
      >
        {open ? <span className="text-bg text-sm font-bold">✕</span> : '⚽'}
      </motion.button>
    </div>
  )
}
