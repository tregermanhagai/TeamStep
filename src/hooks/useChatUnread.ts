import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from './useSession'

const LS_KEY = 'chatLastSeen'

function getLastSeen(): string {
  return localStorage.getItem(LS_KEY) ?? new Date(0).toISOString()
}

/** Call this from ChatPage to clear the unread dot. */
export function markChatRead() {
  localStorage.setItem(LS_KEY, new Date().toISOString())
  window.dispatchEvent(new Event('teamstep:chatRead'))
}

/** Used only in BottomNav — one instance across the whole app. */
export function useChatUnread() {
  const { player } = useSession()
  const [hasUnread, setHasUnread] = useState(false)

  // Clear the dot when ChatPage dispatches the event (same tab)
  useEffect(() => {
    function onRead() { setHasUnread(false) }
    window.addEventListener('teamstep:chatRead', onRead)
    return () => window.removeEventListener('teamstep:chatRead', onRead)
  }, [])

  useEffect(() => {
    if (!player?.team_id) return

    // Initial check: is there a message newer than last seen?
    supabase
      .from('messages')
      .select('created_at')
      .eq('team_id', player.team_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setHasUnread(data[0].created_at > getLastSeen())
        }
      })

    // Realtime: mark unread when a new message arrives
    const channel = supabase
      .channel(`chat-unread-${player.team_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `team_id=eq.${player.team_id}`,
        },
        (payload) => {
          const msgTime = (payload.new as { created_at: string }).created_at
          if (msgTime > getLastSeen()) setHasUnread(true)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [player?.team_id])

  return hasUnread
}
