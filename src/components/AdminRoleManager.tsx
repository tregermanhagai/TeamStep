import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { usePlayers } from '../hooks/usePlayers'
import { useSession } from '../hooks/useSession'

export function AdminRoleManager() {
  const { player: me } = useSession()
  const { data: players, loading, refetch } = usePlayers()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function toggleRole(playerId: string, currentRole: string) {
    setBusy(playerId)
    setError(null)
    const { error: err } = await supabase.rpc('set_player_role', {
      p_player_id: playerId,
      p_role: currentRole === 'admin' ? 'player' : 'admin',
    })
    if (err) setError(err.message)
    else refetch()
    setBusy(null)
  }

  if (loading) return <div className="px-4 py-3 text-slate-400 text-xs">טוען...</div>

  return (
    <div className="px-4 py-3 flex flex-col gap-2">
      {error && <p className="text-red-400 text-xs">{error}</p>}
      {players
        .filter(p => p.player_id !== me?.player_id)
        .map(p => (
          <div key={p.player_id} className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">{p.full_name}</p>
              <p className="text-xs text-slate-500">{p.role === 'admin' ? 'מנהל' : 'שחקן'}</p>
            </div>
            <button
              onClick={() => toggleRole(p.player_id, p.role)}
              disabled={busy === p.player_id}
              className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all disabled:opacity-40 ${
                p.role === 'admin'
                  ? 'bg-slate-700 text-slate-300'
                  : 'bg-accent/20 text-accent'
              }`}
            >
              {busy === p.player_id ? '...' : p.role === 'admin' ? 'הסר' : 'הפוך למנהל'}
            </button>
          </div>
        ))}
    </div>
  )
}
