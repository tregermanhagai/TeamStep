import { useState, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useSession } from '../../hooks/useSession'
import { Avatar } from '../../components/Avatar'
import { Player } from '../../types'

export function PlayersPage() {
  const { isAdmin, player: adminPlayer, loading: sessionLoading } = useSession()
  const navigate = useNavigate()
  const [players, setPlayers] = useState<Player[]>([])
  const [loadingPlayers, setLoadingPlayers] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Add player
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  // Merge player
  const [mergeSourceId, setMergeSourceId] = useState<string | null>(null)
  const [mergeTargetId, setMergeTargetId] = useState<string>('')
  const [merging, setMerging] = useState(false)
  const [mergeError, setMergeError] = useState<string | null>(null)

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

  async function addPlayer() {
    if (!newName.trim()) return
    setAdding(true)
    setAddError(null)
    const { error } = await supabase.rpc('admin_add_player', {
      p_full_name: newName.trim(),
      p_team_id: adminPlayer?.team_id ?? null,
    })
    setAdding(false)
    if (error) { setAddError(error.message); return }
    setNewName('')
    setShowAddForm(false)
    loadPlayers()
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

  async function mergePlayer() {
    if (!mergeSourceId || !mergeTargetId) return
    const source = players.find(p => p.player_id === mergeSourceId)
    const target = players.find(p => p.player_id === mergeTargetId)
    if (!source || !target) return
    if (!confirm(`Merge "${source.full_name}" INTO "${target.full_name}"?\n\n"${source.full_name}" will be deleted and all their stats will move to "${target.full_name}". This cannot be undone.`)) return
    setMerging(true)
    setMergeError(null)
    const { error } = await supabase.rpc('admin_merge_players', {
      p_from_id: mergeSourceId,
      p_to_id: mergeTargetId,
    })
    setMerging(false)
    if (error) { setMergeError(error.message); return }
    setMergeSourceId(null)
    setMergeTargetId('')
    loadPlayers()
  }

  if (sessionLoading) return <div className="min-h-screen bg-bg" />
  if (!isAdmin) return <Navigate to="/dashboard" replace />

  if (loadingPlayers) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="w-10 h-10 rounded-full bg-card animate-pulse" />
    </div>
  )

  const mergeSource = players.find(p => p.player_id === mergeSourceId)

  return (
    <div className="min-h-screen bg-bg pb-32">
      <div className="px-4 pt-12 pb-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-accent font-semibold uppercase tracking-wider">מנהל</p>
          <h1 className="text-xl font-bold text-white">Manage Players</h1>
          <p className="text-slate-400 text-sm mt-0.5">{players.length} players total</p>
        </div>
        <button onClick={() => navigate('/profile')} className="text-slate-400 text-2xl leading-none">✕</button>
      </div>

      {/* Add player */}
      <div className="px-4 mb-4">
        {showAddForm ? (
          <div className="bg-card rounded-2xl p-4 flex flex-col gap-3">
            <p className="text-sm font-semibold text-white">הוסף שחקן</p>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addPlayer()}
              placeholder="שם מלא"
              autoFocus
              className="w-full bg-bg text-white rounded-xl px-4 py-3 text-sm border border-slate-700 focus:outline-none focus:border-accent"
            />
            {addError && <p className="text-red-400 text-xs">{addError}</p>}
            <div className="flex gap-2">
              <button
                onClick={addPlayer}
                disabled={adding || !newName.trim()}
                className="flex-1 bg-accent text-bg font-bold py-2.5 rounded-xl text-sm active:scale-95 transition-all disabled:opacity-50"
              >
                {adding ? '…' : 'הוסף'}
              </button>
              <button
                onClick={() => { setShowAddForm(false); setNewName(''); setAddError(null) }}
                className="px-4 py-2.5 rounded-xl text-sm text-slate-400 bg-slate-700/50"
              >
                ביטול
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full bg-card border border-slate-700 border-dashed text-accent font-semibold py-3 rounded-2xl text-sm active:scale-95 transition-all"
          >
            + הוסף שחקן ידנית
          </button>
        )}
      </div>

      {/* Merge panel */}
      {mergeSourceId && mergeSource && (
        <div className="px-4 mb-4">
          <div className="bg-card rounded-2xl border border-accent/30 p-4 flex flex-col gap-3">
            <p className="text-sm font-semibold text-white">
              מיזוג: <span className="text-accent">{mergeSource.full_name}</span>
            </p>
            <p className="text-xs text-slate-400">
              בחר את השחקן שאליו ירוכז הניקוד — השחקן הנבחר יימחק לאחר המיזוג
            </p>
            <select
              value={mergeTargetId}
              onChange={e => setMergeTargetId(e.target.value)}
              className="w-full bg-bg text-white rounded-xl px-4 py-3 text-sm border border-slate-700 focus:outline-none focus:border-accent"
            >
              <option value="">בחר שחקן יעד…</option>
              {players
                .filter(p => p.player_id !== mergeSourceId)
                .map(p => (
                  <option key={p.player_id} value={p.player_id}>{p.full_name}</option>
                ))}
            </select>
            {mergeError && <p className="text-red-400 text-xs">{mergeError}</p>}
            <div className="flex gap-2">
              <button
                onClick={mergePlayer}
                disabled={merging || !mergeTargetId}
                className="flex-1 bg-accent text-bg font-bold py-2.5 rounded-xl text-sm active:scale-95 transition-all disabled:opacity-50"
              >
                {merging ? '…' : 'אשר מיזוג'}
              </button>
              <button
                onClick={() => { setMergeSourceId(null); setMergeTargetId(''); setMergeError(null) }}
                className="px-4 py-2.5 rounded-xl text-sm text-slate-400 bg-slate-700/50"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Player list */}
      <div className="px-4 flex flex-col gap-2">
        {players.map(player => (
          <div
            key={player.player_id}
            className={`bg-card rounded-2xl px-4 py-3 flex items-center gap-3 transition-all ${
              mergeSourceId === player.player_id ? 'border border-accent/50' : ''
            }`}
          >
            <Avatar player={player} size={36} />
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">{player.full_name}</p>
              <p className="text-xs text-slate-500 capitalize">
                {player.role}
                {!player.email && !player.phone && (
                  <span className="ml-2 text-yellow-500">· ידני</span>
                )}
              </p>
            </div>
            <button
              onClick={() => {
                setMergeSourceId(prev => prev === player.player_id ? null : player.player_id)
                setMergeTargetId('')
                setMergeError(null)
              }}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                mergeSourceId === player.player_id
                  ? 'bg-accent text-bg'
                  : 'bg-slate-700 text-slate-300'
              }`}
            >
              מיזוג
            </button>
            <button
              onClick={() => deletePlayer(player)}
              disabled={deletingId === player.player_id}
              className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold bg-red-600 text-white active:scale-95 transition-all disabled:opacity-50"
            >
              {deletingId === player.player_id ? '…' : 'מחק'}
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
