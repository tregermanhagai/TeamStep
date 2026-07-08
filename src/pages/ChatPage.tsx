import { useEffect, useRef, useState, KeyboardEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../hooks/useSession'
import { markChatRead } from '../hooks/useChatUnread'
import { useLocale } from '../contexts/LocaleContext'

interface Message {
  message_id: string
  player_id: string
  full_name: string
  body: string
  created_at: string
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function Initials({ name, self }: { name: string; self: boolean }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
  return (
    <span
      className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
        self ? 'bg-accent text-bg' : 'bg-slate-700 text-slate-300'
      }`}
    >
      {initials || '?'}
    </span>
  )
}

export function ChatPage() {
  const { t } = useLocale()
  const { player } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!player?.team_id) return

    // Clear the unread badge
    markChatRead()

    supabase
      .from('messages')
      .select('*')
      .eq('team_id', player.team_id)
      .order('created_at', { ascending: true })
      .limit(50)
      .then(({ data, error }) => {
        if (error) console.error('[ChatPage] fetch error', error)
        else if (data) setMessages(data as Message[])
      })

    const channel = supabase
      .channel(`chat-page-${player.team_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `team_id=eq.${player.team_id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [player?.team_id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!player || !body.trim()) return
    const trimmed = body.trim()
    setBody('')
    setSending(true)
    const { error } = await supabase.from('messages').insert({
      team_id: player.team_id,
      player_id: player.player_id,
      full_name: player.full_name,
      body: trimmed,
    })
    if (error) {
      console.error('[ChatPage] send error', error)
      setBody(trimmed)
    }
    setSending(false)
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col pb-nav">
      <div className="px-4 pt-12 pb-3 border-b border-slate-700/50">
        <h1 className="text-xl font-bold text-white">{t('chatTitle')}</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <p className="text-center text-slate-500 text-sm mt-8">{t('chatNoMessages')}</p>
        )}
        {messages.map((msg) => {
          const isSelf = msg.player_id === player?.player_id
          return (
            <div
              key={msg.message_id}
              className={`flex items-end gap-2 ${isSelf ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <Initials name={msg.full_name} self={isSelf} />
              <div className={`max-w-[72%] flex flex-col gap-0.5 ${isSelf ? 'items-end' : 'items-start'}`}>
                {!isSelf && (
                  <span className="text-xs text-slate-500 px-1">{msg.full_name}</span>
                )}
                <div
                  className={`px-3 py-2 rounded-2xl text-sm break-words ${
                    isSelf
                      ? 'bg-accent text-bg rounded-br-sm'
                      : 'bg-card text-white rounded-bl-sm'
                  }`}
                >
                  {msg.body}
                </div>
                <span className="text-xs text-slate-600 px-1">{formatTime(msg.created_at)}</span>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-3 border-t border-slate-700/50 flex gap-2 items-end">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t('chatPlaceholder')}
          maxLength={500}
          rows={1}
          className="flex-1 bg-card text-white rounded-2xl px-4 py-3 text-sm border border-slate-700 focus:outline-none focus:border-accent resize-none"
          style={{ minHeight: '44px', maxHeight: '120px' }}
        />
        <button
          onClick={sendMessage}
          disabled={sending || !body.trim()}
          className="bg-accent text-bg font-bold px-4 py-3 rounded-2xl text-sm active:scale-95 transition-all disabled:opacity-40"
        >
          {t('chatSend')}
        </button>
      </div>
    </div>
  )
}
