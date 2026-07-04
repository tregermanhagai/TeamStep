import { useState, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useSession } from '../../hooks/useSession'
import { Avatar } from '../../components/Avatar'
import { Player } from '../../types'

export function PlayersPage() {
  const { isAdmin, loading: sessionLoading } = useSession()
  const navigate = useNavigate()
  const [players, setPlayers] = useState<Player[]>([])
  const [loadingPlayers, setLoadingPlayers] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionLoading && isAdmin) loadPlayers()
  }, [sessionLoading, isAdmin])

  async function loadPlayers() {
    const { data } = await supabase
      .from('players')
      .select('*')
      .order('full_name')
    if (data) setPlayers(data)
    setLoadingPlayers(false)
  }

  async function deletePlayer(player: Player) {
    if (!confirm(`Delete ${player.full_name}?\n\nThis will permanently remove the player and all their match reports. This cannot be undone.`)) return
    setDeletingId(player.player_id)
    const { error } = await supabase.rpc('admin_delete_player', { p_player_id: player.player_id })
    if (error) {
      alert('Delete failed: ' + error.message)
      setDeletingId(null)
      return
    }
    setPlayers(prev => prev.filter(p => p.player_id !== player.player_id))
    setDeletingId(null)
  }

  if (sessionLoading) return <div className="min-h-screen bg-bg" />
  if (!isAdmin) return <Navigate to="/dashboard" replace />

  if (loadingPlayers) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="w-10 h-10 rounded-full bg-card animate-pulse" />
    </div>
  )

  return (
    <div className="min-h-screen bg-bg pb-32">
      <div className="px-4 pt-12 pb-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-accent font-semibold uppercase tracking-wider">Admin</p>
          <h1 className="text-xl font-bold text-white">Manage Players</h1>
          <p className="text-slate-400 text-sm mt-0.5">{players.length} players total</p>
        </div>
        <button onClick={() => navigate('/profile')} className="text-slate-400 text-2xl leading-none">✕</button>
      </div>

      <div className="px-4 flex flex-col gap-2">
        {players.map(player => (
          <div key={player.player_id} className="bg-card rounded-2xl px-4 py-3 flex items-center gap-3">
            <Avatar player={player} size={36} />
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">{player.full_name}</p>
              <p className="text-xs text-slate-500 capitalize">{player.role}</p>
            </div>
            <button
              onClick={() => deletePlayer(player)}
              disabled={deletingId === player.player_id}
              className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold bg-red-600 text-white active:scale-95 transition-all disabled:opacity-50"
            >
              {deletingId === player.player_id ? '…' : 'Delete'}
            </button>
          </div>
        ))}
        {players.length === 0 && (
          <p className="text-slate-500 text-sm text-center py-8">No players found.</p>
        )}
      </div>
    </div>
  )
}
