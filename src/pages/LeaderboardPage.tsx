import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useSession } from '../hooks/useSession'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { useMyStats } from '../hooks/useMyStats'
import { LeaderboardRow } from '../components/LeaderboardRow'
import { StatPill } from '../components/StatPill'
import { StatsChart } from '../components/StatsChart'
import { Avatar } from '../components/Avatar'
import { useLocale } from '../contexts/LocaleContext'
import { PlayerScore, SessionMatchStat } from '../types'

type PanelFilter = 'all' | 'last'

export function LeaderboardPage() {
  const { t } = useLocale()
  const { player } = useSession()
  const { data, loading } = useLeaderboard()
  const location = useLocation()

  const [selectedPlayer, setSelectedPlayer] = useState<PlayerScore | null>(null)
  const [panelFilter, setPanelFilter] = useState<PanelFilter>('all')
  const [panelSession, setPanelSession] = useState<{ data: SessionMatchStat; index: number } | null>(null)

  const { data: selectedHistory, loading: histLoading } = useMyStats(selectedPlayer?.player_id)

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
    setPanelFilter('all')
    setPanelSession(null)
  }, [selectedPlayer?.player_id])

  function togglePlayer(p: PlayerScore) {
    setSelectedPlayer((prev) => (prev?.player_id === p.player_id ? null : p))
  }

  const selectedRank = selectedPlayer
    ? data.findIndex((p) => p.player_id === selectedPlayer.player_id) + 1
    : null

  const filteredHistory = panelFilter === 'last' ? selectedHistory.slice(-1) : selectedHistory
  const src = panelSession?.data ?? (panelFilter === 'last' ? filteredHistory[0] : null)
  const isSession = !!src

  const pillLabel = panelSession
    ? (panelSession.data.label === 'Training Session' ? t('trainingSession') : (panelSession.data.label ?? panelSession.data.match_date))
    : panelFilter === 'last' ? t('trainingSession') : t('overall')

  return (
    <div className="min-h-screen bg-bg pb-nav">
      <div className="px-4 pt-12 pb-4">
        <h1 className="text-xl font-bold text-white">{t('leaderboardTitle')}</h1>
        <p className="text-slate-400 text-sm mt-0.5">{t('leaderboardSubtitle')}</p>
      </div>

      {/* Selected player stats panel */}
      {selectedPlayer && (
        <div className="mx-4 mb-4 bg-card rounded-2xl p-4">
          {/* Player header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Avatar player={selectedPlayer} size={36} />
              <div>
                <p className="text-sm font-semibold text-white">{selectedPlayer.full_name}</p>
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

          {/* Filter tabs */}
          <div className="flex bg-bg rounded-2xl p-1 gap-1 mb-3">
            {(['all', 'last'] as PanelFilter[]).map((f) => (
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

          {/* Label + pills */}
          <div className="flex flex-col items-center gap-2 mb-3">
            <p className="text-xs text-accent font-medium">{pillLabel}</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <StatPill label={t('goals')}       value={isSession ? src.goals       : selectedPlayer.total_goals}   color="#22C55E" />
              <StatPill label={t('assists')}     value={isSession ? src.assists      : selectedPlayer.total_assists} color="#06C8E0" />
              <StatPill label={t('wins')}        value={isSession ? src.team_won    : selectedPlayer.total_wins}    color="#F59E0B" />
              <StatPill label={t('cleanSheets')} value={isSession ? src.clean_sheet : selectedPlayer.total_cs}      color="#8B5CF6" />
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
        </div>
      )}

      {/* Leaderboard list */}
      <div className="px-4 flex flex-col gap-2">
        {loading
          ? [1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 bg-card rounded-2xl animate-pulse" />
            ))
          : data.map((p, i) => (
              <LeaderboardRow
                key={p.player_id}
                rank={i + 1}
                player={p}
                isMe={p.player_id === player?.player_id}
                isSelected={selectedPlayer?.player_id === p.player_id}
                onClick={() => togglePlayer(p)}
              />
            ))}
      </div>
    </div>
  )
}
