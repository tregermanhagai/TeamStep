import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { usePlayers } from '../../hooks/usePlayers'
import { useSession } from '../../hooks/useSession'
import { useLocale } from '../../contexts/LocaleContext'
import { trainerLabel } from '../../lib/playerUtils'

function Initials({ name }: { name: string }) {
  const letters = name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
  return (
    <span className="w-9 h-9 rounded-full bg-slate-700 flex-shrink-0 flex items-center justify-center text-xs font-bold text-slate-300">
      {letters || '?'}
    </span>
  )
}

export function ManagersPage() {
  const { t, locale } = useLocale()
  const navigate = useNavigate()
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

  const admins  = players.filter(p => p.role === 'admin')
  const regular = players.filter(p => p.role !== 'admin')

  function PlayerRow({ p, isAdmin }: { p: typeof players[0]; isAdmin: boolean }) {
    const isSelf = p.player_id === me?.player_id
    const label = trainerLabel(p.full_name, locale)
    return (
      <div className="flex items-center gap-3 px-4 py-3">
        <Initials name={p.full_name} />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium truncate">
            {p.full_name}
            {label && <span className="ml-1 text-slate-400 text-xs font-normal">{label}</span>}
          </p>
          <p className="text-xs text-slate-500">{isAdmin ? t('roleAdmin') : t('rolePlayer')}</p>
        </div>
        {!isSelf && (
          <button
            onClick={() => toggleRole(p.player_id, p.role)}
            disabled={busy === p.player_id}
            className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-all disabled:opacity-40 ${
              isAdmin
                ? 'bg-red-900/40 text-red-400 hover:bg-red-900/60'
                : 'bg-accent/15 text-accent hover:bg-accent/25'
            }`}
          >
            {busy === p.player_id ? '…' : isAdmin ? t('removeAdmin') : t('makeAdmin')}
          </button>
        )}
        {isSelf && (
          <span className="text-xs text-slate-600 px-3">{t('youLabel')}</span>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg pb-8">
      <div className="px-4 pt-12 pb-5 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="text-slate-400 hover:text-white text-xl leading-none px-1"
        >
          ‹
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">{t('manageAdmins')}</h1>
          <p className="text-slate-400 text-xs mt-0.5">{t('manageAdminsDesc')}</p>
        </div>
      </div>

      {error && (
        <div className="mx-4 mb-4 px-4 py-2 bg-red-900/30 border border-red-800 rounded-xl text-red-300 text-xs">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mx-4 space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-14 bg-card rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* Current admins */}
          {admins.length > 0 && (
            <div className="mx-4 mb-5">
              <p className="text-xs text-accent font-semibold uppercase tracking-wider mb-2 px-1">
                {t('currentAdmins')} ({admins.length})
              </p>
              <div className="bg-card rounded-2xl divide-y divide-slate-700/50 border border-accent/20">
                {admins.map(p => <PlayerRow key={p.player_id} p={p} isAdmin />)}
              </div>
            </div>
          )}

          {/* Regular players */}
          {regular.length > 0 && (
            <div className="mx-4">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2 px-1">
                {t('players')} ({regular.length})
              </p>
              <div className="bg-card rounded-2xl divide-y divide-slate-700/50">
                {regular.map(p => <PlayerRow key={p.player_id} p={p} isAdmin={false} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
