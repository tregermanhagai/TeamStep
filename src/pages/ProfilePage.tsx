import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSession } from '../hooks/useSession'
import { useLocale } from '../contexts/LocaleContext'
import { useMyStats } from '../hooks/useMyStats'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { Avatar } from '../components/Avatar'
import { StatPill } from '../components/StatPill'
import { supabase } from '../lib/supabase'
import { AppFooter } from '../components/AppFooter'
import { AdminRoleManager } from '../components/AdminRoleManager'

export function ProfilePage() {
  const { t, locale, setLocale } = useLocale()
  const navigate = useNavigate()
  const { player, session, isAdmin, loading, refetchPlayer } = useSession()
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [resetting, setResetting] = useState(false)
  const isSuperAdmin = session?.user?.email === 'hagai1973@gmail.com'
  const { data: history } = useMyStats(player?.player_id)
  const { data: leaderboard } = useLeaderboard()

  const me = leaderboard.find((p) => p.player_id === player?.player_id)
  const myRank = me ? leaderboard.indexOf(me) + 1 : null

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function resetScores() {
    if (!player) return
    if (!confirm('⚠️ This will delete ALL match reports and reset everyone\'s score to zero.\n\nThis cannot be undone. Are you sure?')) return
    setResetting(true)
    const { error } = await supabase.rpc('admin_reset_scores', { p_team_id: player.team_id })
    setResetting(false)
    if (error) alert('Reset failed: ' + error.message)
    else navigate('/leaderboard')
  }

  async function saveName() {
    if (!nameInput.trim() || !player) return
    setSavingName(true)
    await supabase.from('players').update({ full_name: nameInput.trim() }).eq('player_id', player.player_id)
    setSavingName(false)
    setEditingName(false)
    refetchPlayer()
  }

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="w-10 h-10 rounded-full bg-card animate-pulse" />
    </div>
  )

  if (!player) return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-3 px-8 text-center pb-nav">
      <p className="text-white font-semibold">Could not load profile</p>
      <p className="text-slate-400 text-sm">Try signing out and back in</p>
      <button
        onClick={signOut}
        className="mt-2 bg-card border border-slate-700 text-slate-400 font-semibold px-6 py-3 rounded-2xl"
      >
        {t('signOut')}
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-bg pb-nav">
      <div className="px-4 pt-12 pb-6 flex flex-col items-center gap-4">
        <Avatar player={player} size={80} />
        <div className="text-center">
          {editingName ? (
            <div className="flex items-center justify-center gap-2">
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
                autoFocus
                className="bg-card text-white rounded-xl px-3 py-1.5 text-sm border border-slate-600 focus:outline-none focus:border-accent w-40"
              />
              <button onClick={saveName} disabled={savingName} className="text-accent text-sm font-semibold disabled:opacity-50">
                {savingName ? '…' : 'Save'}
              </button>
              <button onClick={() => setEditingName(false)} className="text-slate-500 text-sm">✕</button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-xl font-bold text-white">{player.full_name}</h1>
              <button
                onClick={() => { setNameInput(player.full_name); setEditingName(true) }}
                className="text-slate-500 hover:text-slate-300 text-base leading-none mt-0.5"
                aria-label="Edit name"
              >
                ✎
              </button>
            </div>
          )}
          <p className="text-slate-400 text-sm">{session?.user?.email}</p>
          {myRank && <p className="text-accent text-sm font-medium mt-1">{t('rank')} #{myRank}</p>}
        </div>
      </div>

      {me && (
        <div className="flex justify-center gap-3 flex-wrap px-4 pb-2">
          <StatPill label={t('points')}  value={me.total_points}   color="#06C8E0" />
          <StatPill label={t('goals')}   value={me.total_goals}    color="#22C55E" />
          <StatPill label={t('assists')} value={me.total_assists}  color="#F59E0B" />
          <StatPill label={t('played')}  value={me.matches_played} color="#8B5CF6" />
        </div>
      )}

      <div className="mx-4 mt-5 bg-card rounded-2xl divide-y divide-slate-700/50">
        <div className="px-4 py-3">
          <p className="text-xs text-slate-400">{t('sessionsPlayed')}</p>
          <p className="text-white font-semibold">{history.length}</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-slate-400">{t('bestSession')}</p>
          {history.length > 0 ? (() => {
            const best = history.reduce((a, b) => b.match_pts > a.match_pts ? b : a)
            const d = new Date(best.match_date + 'T12:00:00')
            const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
            return (
              <div className="flex items-baseline gap-2">
                <p className="text-white font-semibold">{best.match_pts} {t('pts')}</p>
                <p className="text-xs text-slate-500">{dateStr}</p>
              </div>
            )
          })() : <p className="text-white font-semibold">—</p>}
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-slate-400">{t('role')}</p>
          <p className="text-white font-semibold">{{ player: t('rolePlayer'), admin: t('roleAdmin') }[player.role] ?? player.role}</p>
        </div>
      </div>

      {isAdmin && (
        <div className="mx-4 mt-5">
          <p className="text-xs text-accent font-semibold uppercase tracking-wider mb-2">{t('adminSection')}</p>
          <div className="bg-card rounded-2xl divide-y divide-slate-700/50">
            <Link
              to="/admin/team-scoring"
              className="flex items-center justify-between px-4 py-3 hover:bg-slate-700/30 rounded-t-2xl transition-colors"
            >
              <div>
                <p className="text-sm text-white font-medium">{t('adminTeamScoring')}</p>
                <p className="text-xs text-slate-400">{t('adminTeamScoringDesc')}</p>
              </div>
              <span className="text-slate-500 text-lg">›</span>
            </Link>
            <Link
              to="/admin/practice"
              className="flex items-center justify-between px-4 py-3 hover:bg-slate-700/30 transition-colors"
            >
              <div>
                <p className="text-sm text-white font-medium">{t('adminPractice')}</p>
                <p className="text-xs text-slate-400">{t('adminPracticeDesc')}</p>
              </div>
              <span className="text-slate-500 text-lg">›</span>
            </Link>
            <Link
              to="/admin/players"
              className="flex items-center justify-between px-4 py-3 hover:bg-slate-700/30 transition-colors"
            >
              <div>
                <p className="text-sm text-white font-medium">{t('adminPlayers')}</p>
                <p className="text-xs text-slate-400">{t('adminPlayersDesc')}</p>
              </div>
              <span className="text-slate-500 text-lg">›</span>
            </Link>
            <Link
              to="/admin/scoring"
              className="flex items-center justify-between px-4 py-3 hover:bg-slate-700/30 transition-colors"
            >
              <div>
                <p className="text-sm text-white font-medium">{t('scoringRules')}</p>
                <p className="text-xs text-slate-400">{t('scoringRulesDesc')}</p>
              </div>
              <span className="text-slate-500 text-lg">›</span>
            </Link>
            {isSuperAdmin && (
              <div>
                <div className="flex items-center justify-between px-4 pt-3 pb-1">
                  <p className="text-sm text-white font-medium">{t('manageAdmins')}</p>
                </div>
                <AdminRoleManager />
              </div>
            )}
          </div>
          <div className="mt-3 bg-red-950/30 border border-red-900/50 rounded-2xl p-4">
            <p className="text-xs text-red-400 font-semibold mb-1">Danger Zone</p>
            <p className="text-xs text-slate-500 mb-3">Reset all scores to zero. Deletes every match report permanently.</p>
            <button
              onClick={resetScores}
              disabled={resetting}
              className="w-full bg-red-700 hover:bg-red-600 text-white font-bold py-3 rounded-xl text-sm active:scale-95 transition-all disabled:opacity-60"
            >
              {resetting ? 'Resetting…' : 'Reset All Scores'}
            </button>
          </div>
        </div>
      )}

      {/* Language toggle */}
      <div className="mx-4 mt-5">
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">{t('language')}</p>
        <div className="flex bg-card rounded-2xl p-1 gap-1">
          {(['en', 'he'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLocale(l)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                locale === l ? 'bg-accent text-bg' : 'text-slate-400 hover:text-white'
              }`}
            >
              {l === 'en' ? t('english') : t('hebrew')}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-5 mb-2">
        <button
          onClick={signOut}
          className="w-full bg-card border border-slate-700 text-slate-400 font-semibold py-3 rounded-2xl active:scale-95 transition-all"
        >
          {t('signOut')}
        </button>
      </div>
      <AppFooter />
    </div>
  )
}
