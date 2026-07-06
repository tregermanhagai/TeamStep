import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useSession } from '../hooks/useSession'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { useMyStats } from '../hooks/useMyStats'
import { usePlayerCustomTotals } from '../hooks/usePlayerCustomTotals'
import { useLastSessionLeaderboard } from '../hooks/useLastSessionLeaderboard'
import { LeaderboardRow } from '../components/LeaderboardRow'
import { StatPill } from '../components/StatPill'
import { StatsChart } from '../components/StatsChart'
import { Avatar } from '../components/Avatar'
import { useLocale } from '../contexts/LocaleContext'
import { trainerLabel } from '../lib/playerUtils'
import { PlayerScore, SessionMatchStat } from '../types'
import { AppFooter } from '../components/AppFooter'
import { supabase } from '../lib/supabase'

type TeamColor = 'Pink' | 'Blue' | 'Yellow' | 'Green' | 'Red' | 'Other'
const COLORS: TeamColor[] = ['Pink', 'Blue', 'Yellow', 'Green', 'Red', 'Other']
const COLOR_LABELS: Record<TeamColor, string> = { Pink: 'ורוד', Blue: 'כחול', Yellow: 'צהוב', Green: 'ירוק', Red: 'אדום', Other: 'אחר' }
function todayStr() { return new Date().toISOString().split('T')[0] }

type PanelFilter = 'all' | 'last'
type SortBy = 'points' | 'goals' | 'assists' | 'wins'

export function LeaderboardPage() {
  const { t, locale } = useLocale()
  const { player, isAdmin } = useSession()
  const { data, loading } = useLeaderboard()
  const location = useLocation()

  const [sortBy, setSortBy] = useState<SortBy>('points')
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerScore | null>(null)
  const [panelFilter, setPanelFilter] = useState<PanelFilter>('last')
  const [panelSession, setPanelSession] = useState<{ data: SessionMatchStat; index: number } | null>(null)

  const { data: lastSessionMap } = useLastSessionLeaderboard()

  const sortedData = [...data].sort((a, b) => {
    if (panelFilter === 'last') {
      const la = lastSessionMap[a.player_id] ?? { session_pts: 0, goals: 0, assists: 0, team_won: 0 }
      const lb = lastSessionMap[b.player_id] ?? { session_pts: 0, goals: 0, assists: 0, team_won: 0 }
      switch (sortBy) {
        case 'goals':   return lb.goals    - la.goals    || lb.session_pts - la.session_pts
        case 'assists': return lb.assists  - la.assists  || lb.session_pts - la.session_pts
        case 'wins':    return lb.team_won - la.team_won || lb.session_pts - la.session_pts
        default:        return lb.session_pts - la.session_pts
      }
    }
    switch (sortBy) {
      case 'goals':   return b.total_goals   - a.total_goals   || b.total_points - a.total_points
      case 'assists': return b.total_assists - a.total_assists || b.total_points - a.total_points
      case 'wins':    return b.total_wins    - a.total_wins    || b.total_points - a.total_points
      default:        return b.total_points  - a.total_points
    }
  })
  const { data: selectedHistory, loading: histLoading, refetch: refetchStats } = useMyStats(selectedPlayer?.player_id)
  const { data: customTotals } = usePlayerCustomTotals(selectedPlayer?.player_id)
  const ctTotal = customTotals.find((c) => c.label === 'Continuous Training')?.total ?? 0

  // Admin inline report state
  const [adminStats, setAdminStats] = useState({ goals: 0, assists: 0, teamWon: 0, cleanSheet: 0, color: 'Other' as TeamColor })
  const [adminSaving, setAdminSaving] = useState(false)
  const [adminSaved, setAdminSaved] = useState(false)

  useEffect(() => {
    setAdminSaved(false)
    if (!selectedPlayer || !isAdmin) return
    loadAdminReport(selectedPlayer.player_id)
  }, [selectedPlayer?.player_id])

  async function loadAdminReport(playerId: string) {
    const { data: match } = await supabase
      .from('matches')
      .select('match_id')
      .eq('match_date', todayStr())
      .maybeSingle()
    if (!match) { setAdminStats({ goals: 0, assists: 0, teamWon: 0, cleanSheet: 0, color: 'Other' }); return }
    const { data: report } = await supabase
      .from('reports')
      .select('*')
      .eq('player_id', playerId)
      .eq('match_id', match.match_id)
      .maybeSingle()
    if (report) {
      setAdminStats({ goals: report.goals ?? 0, assists: report.assists ?? 0, teamWon: report.team_won ?? 0, cleanSheet: report.clean_sheet ?? 0, color: (report.team_color ?? 'Other') as TeamColor })
    } else {
      setAdminStats({ goals: 0, assists: 0, teamWon: 0, cleanSheet: 0, color: 'Other' })
    }
  }

  async function saveAdminReport() {
    if (!selectedPlayer) return
    setAdminSaving(true)
    setAdminSaved(false)
    const { error } = await supabase.rpc('admin_upsert_report', {
      p_player_id:   selectedPlayer.player_id,
      p_match_date:  todayStr(),
      p_goals:       adminStats.goals,
      p_assists:     adminStats.assists,
      p_team_won:    adminStats.teamWon,
      p_clean_sheet: adminStats.cleanSheet,
      p_team_color:  adminStats.color,
    })
    setAdminSaving(false)
    if (!error) { setAdminSaved(true); refetchStats() }
  }

  // Pre-select player when navigated from dashboard
  useEffect(() => {
    const preselectedId = (location.state as { selectedPlayerId?: string } | null)?.selectedPlayerId
    if (preselectedId && data.length > 0) {
      const found = data.find((p) => p.player_id === preselectedId)
      if (found) setSelectedPlayer(found)
    }
  }, [data, location.state])

  // Reset panel state when switching player
  useEffect(() => {
    setPanelFilter('last')
    setPanelSession(null)
  }, [selectedPlayer?.player_id])

  function togglePlayer(p: PlayerScore) {
    setSelectedPlayer((prev) => (prev?.player_id === p.player_id ? null : p))
  }

  const selectedRank = selectedPlayer
    ? sortedData.findIndex((p) => p.player_id === selectedPlayer.player_id) + 1
    : null

  const filteredHistory = panelFilter === 'last' ? selectedHistory.slice(-1) : selectedHistory
  const src = panelSession?.data ?? (panelFilter === 'last' ? filteredHistory[0] : null)
  const isSession = !!src

  function fmtDate(dateStr: string) {
    const d = new Date(dateStr + 'T12:00:00')
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  }

  const pillLabel = panelSession
    ? fmtDate(panelSession.data.match_date)
    : panelFilter === 'last' && filteredHistory[0]
      ? fmtDate(filteredHistory[0].match_date)
      : t('overall')

  return (
    <div className="min-h-screen bg-bg pb-nav">
      <div className="px-4 pt-12 pb-4">
        <h1 className="text-xl font-bold text-white">{t('leaderboardTitle')}</h1>
        <p className="text-slate-400 text-sm mt-0.5">{t('leaderboardSubtitle')}</p>
      </div>

      {/* Sort tabs */}
      <div className="flex bg-card rounded-2xl p-1 mx-4 mb-4 gap-1">
        {([
          { key: 'points',  label: t('points')  },
          { key: 'goals',   label: t('goals')   },
          { key: 'assists', label: t('assists') },
          { key: 'wins',    label: t('wins')    },
        ] as { key: SortBy; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSortBy(key)}
            className={`flex-1 py-1.5 rounded-xl text-xs font-medium transition-all ${
              sortBy === key ? 'bg-accent text-bg' : 'text-slate-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Season / Last session filter */}
      <div className="flex bg-card rounded-2xl p-1 mx-4 mb-4 gap-1">
        {(['last', 'all'] as PanelFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => { setPanelFilter(f); setPanelSession(null) }}
            className={`flex-1 py-1.5 rounded-xl text-xs font-medium transition-all ${
              panelFilter === f ? 'bg-accent text-bg' : 'text-slate-400 hover:text-white'
            }`}
          >
            {f === 'all' ? t('allSessions') : t('lastPractice')}
          </button>
        ))}
      </div>

      {/* Selected player stats panel */}
      {selectedPlayer && (
        <div className="mx-4 mb-4 bg-card rounded-2xl p-4">
          {/* Player header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Avatar player={selectedPlayer} size={36} />
              <div>
                <p className="text-sm font-semibold text-white">
                  {selectedPlayer.full_name}
                  {trainerLabel(selectedPlayer.full_name, locale) && (
                    <span className="ml-1 text-slate-400 text-xs font-normal">{trainerLabel(selectedPlayer.full_name, locale)}</span>
                  )}
                </p>
                {selectedRank && (
                  <p className="text-xs text-slate-400">#{selectedRank} · {selectedPlayer.total_points} pts</p>
                )}
              </div>
            </div>
            <button
              onClick={() => setSelectedPlayer(null)}
              className="text-slate-500 hover:text-white text-lg leading-none px-1"
            >
              ✕
            </button>
          </div>

          {/* Label + pills */}
          <div className="flex flex-col items-center gap-2 mb-3">
            <p className="text-xs text-accent font-medium">{pillLabel}</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <StatPill label={t('goals')}        value={isSession ? src.goals       : selectedPlayer.total_goals}   color="#22C55E" />
              <StatPill label={t('assists')}      value={isSession ? src.assists      : selectedPlayer.total_assists} color="#06C8E0" />
              <StatPill label={t('wins')}         value={isSession ? src.team_won    : selectedPlayer.total_wins}    color="#F59E0B" />
              <StatPill label={t('cleanSheets')}  value={isSession ? src.clean_sheet : selectedPlayer.total_cs}      color="#8B5CF6" />
              {!isSession && ctTotal > 0 && (
                <StatPill label={t('contTraining')} value={ctTotal} color="#EC4899" />
              )}
            </div>
          </div>

          {/* Chart */}
          {histLoading ? (
            <div className="h-28 bg-slate-700/30 rounded-xl animate-pulse" />
          ) : (
            <StatsChart
              data={filteredHistory}
              selectedIndex={panelSession?.index ?? null}
              onSessionClick={(session, index) =>
                setPanelSession((prev) => prev?.index === index ? null : { data: session, index })
              }
            />
          )}

          {/* Admin inline report — always shown for admins */}
          {isAdmin && (
            <div className="mt-3 border-t border-slate-700/50 pt-3">
              <p className="text-xs text-accent font-semibold mb-2 text-right">נתוני אימון היום</p>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {(['goals', 'assists', 'teamWon', 'cleanSheet'] as const).map(field => {
                  const labels = { goals: 'שער', assists: 'בישול', teamWon: "נצ'", cleanSheet: 'ספיגה' }
                  return (
                    <div key={field} className="flex flex-col items-center gap-1">
                      <p className="text-xs text-slate-400">{labels[field]}</p>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setAdminStats(s => ({ ...s, [field]: Math.max(0, s[field] - 1) }))} className="w-7 h-7 rounded-full bg-slate-700 text-white flex items-center justify-center active:scale-95">−</button>
                        <span className="text-white font-bold text-sm w-4 text-center">{adminStats[field]}</span>
                        <button onClick={() => setAdminStats(s => ({ ...s, [field]: Math.min(5, s[field] + 1) }))} className="w-7 h-7 rounded-full bg-slate-700 text-white flex items-center justify-center active:scale-95">+</button>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center gap-2 mb-3 flex-wrap justify-end">
                <p className="text-xs text-slate-400">:קבוצה</p>
                {COLORS.map(c => (
                  <button key={c} onClick={() => setAdminStats(s => ({ ...s, color: c }))} className={`px-2 py-0.5 rounded-lg text-xs font-medium transition-all ${adminStats.color === c ? 'bg-accent text-bg' : 'bg-slate-700 text-slate-300'}`}>{COLOR_LABELS[c]}</button>
                ))}
              </div>
              {adminSaved && <p className="text-green-400 text-xs mb-2 text-center">נשמר בהצלחה</p>}
              <button
                onClick={saveAdminReport}
                disabled={adminSaving}
                className="w-full bg-accent text-bg text-sm font-bold py-2.5 rounded-xl active:scale-95 transition-all disabled:opacity-50"
              >
                {adminSaving ? 'שומר...' : 'שמור נתוני אימון'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Leaderboard list */}
      <div className="px-4 flex flex-col gap-2">
        {loading
          ? [1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 bg-card rounded-2xl animate-pulse" />
            ))
          : sortedData.map((p, i) => (
              <LeaderboardRow
                key={p.player_id}
                rank={i + 1}
                player={p}
                isMe={p.player_id === player?.player_id}
                isSelected={selectedPlayer?.player_id === p.player_id}
                sortBy={sortBy}
                onClick={() => togglePlayer(p)}
                sessionStats={panelFilter === 'last' ? (() => {
                  const ls = lastSessionMap[p.player_id]
                  return ls ? { goals: ls.goals, assists: ls.assists, wins: ls.team_won, points: ls.session_pts } : { goals: 0, assists: 0, wins: 0, points: 0 }
                })() : undefined}
              />
            ))}
      </div>
      <AppFooter />
    </div>
  )
}
