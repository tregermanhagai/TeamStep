import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocale } from '../contexts/LocaleContext'
import { useSession } from '../hooks/useSession'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { useMyStats } from '../hooks/useMyStats'
import { usePlayerCustomTotals } from '../hooks/usePlayerCustomTotals'
import { ScoreRing } from '../components/ScoreRing'
import { StatsChart } from '../components/StatsChart'
import { StatPill } from '../components/StatPill'
import { LeaderboardRow } from '../components/LeaderboardRow'
import { supabase } from '../lib/supabase'
import { AppFooter } from '../components/AppFooter'

type Filter = 'all' | 'last'

export function DashboardPage() {
  const { t } = useLocale()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('all')
  const [selectedSession, setSelectedSession] = useState<{ data: typeof history[0]; index: number } | null>(null)
  const { player } = useSession()
  const { data: leaderboard, loading: lbLoading } = useLeaderboard()
  const { data: history, loading: histLoading } = useMyStats(player?.player_id)
  const { data: customTotals } = usePlayerCustomTotals(player?.player_id)
  const ctTotal = customTotals.find((c) => c.label === 'Continuous Training')?.total ?? 0

  const me = leaderboard.find((p) => p.player_id === player?.player_id)
  const myRank = me ? leaderboard.indexOf(me) + 1 : null

  const avgPoints =
    leaderboard.length > 0
      ? leaderboard.reduce((s, p) => s + p.total_points, 0) / leaderboard.length
      : 0
  const maxPoints = leaderboard[0]?.total_points ?? 0

  const avgMatchesPlayed =
    leaderboard.length > 0
      ? leaderboard.reduce((s, p) => s + (p.matches_played ?? 0), 0) / leaderboard.length
      : 0
  const groupSessionAvg = avgMatchesPlayed > 0 ? avgPoints / avgMatchesPlayed : 0

  const filteredHistory = filter === 'last' ? history.slice(-1) : history

  return (
    <div className="min-h-screen bg-bg pb-nav">
      {/* Header */}
      <div className="px-4 pt-12 pb-2 flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm">{t('welcomeBack')}</p>
          <h1 className="text-lg font-bold text-white">{player?.full_name ?? '—'}</h1>
        </div>
        <div className="flex items-stretch gap-2">
          {myRank && (
            <div className="bg-card rounded-2xl px-3 py-1.5 text-center flex flex-col justify-center">
              <p className="text-xs text-slate-400">{t('rank')}</p>
              <p className="text-accent font-bold text-lg leading-none">#{myRank}</p>
            </div>
          )}
          <button
            onClick={() => supabase.auth.signOut()}
            className="bg-card text-slate-400 text-xs px-3 rounded-xl border border-slate-700 hover:text-white transition-colors"
          >
            {t('signOut')}
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex bg-card rounded-2xl p-1 mx-4 mt-4 gap-1">
        {(['all', 'last'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-1.5 rounded-xl text-xs font-medium transition-all ${
              filter === f ? 'bg-accent text-bg' : 'text-slate-400 hover:text-white'
            }`}
          >
            {f === 'all' ? t('allSessions') : t('lastPractice')}
          </button>
        ))}
      </div>

      {/* Score ring */}
      <div className="flex justify-center mt-4">
        {lbLoading ? (
          <div className="w-[180px] h-[180px] rounded-full bg-card animate-pulse" />
        ) : (
          <ScoreRing
            userPoints={me?.total_points ?? 0}
            teamAvg={avgPoints}
            maxPoints={maxPoints}
          />
        )}
      </div>

      {/* Stat pills */}
      {me && (() => {
        const src = selectedSession?.data ?? (filter === 'last' ? filteredHistory[0] : null)
        const isSession = !!src
        function fmtDate(dateStr: string) {
          const d = new Date(dateStr + 'T12:00:00')
          return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
        }
        const pillLabel = selectedSession
          ? fmtDate(selectedSession.data.match_date)
          : filter === 'last' && filteredHistory[0]
            ? fmtDate(filteredHistory[0].match_date)
            : t('overall')
        return (
          <div className="flex flex-col items-center gap-2 mt-5">
            <p className="text-xs text-accent font-medium">{pillLabel}</p>
            <div className="flex flex-wrap gap-3 px-4 pb-1 justify-center">
              <StatPill label={t('goals')}        value={isSession ? src.goals       : me.total_goals}  color="#22C55E" />
              <StatPill label={t('assists')}      value={isSession ? src.assists      : me.total_assists} color="#06C8E0" />
              <StatPill label={t('wins')}         value={isSession ? src.team_won    : me.total_wins}    color="#F59E0B" />
              <StatPill label={t('cleanSheets')}  value={isSession ? src.clean_sheet : me.total_cs}      color="#8B5CF6" />
              {!isSession && ctTotal > 0 && (
                <StatPill label={t('contTraining')} value={ctTotal} color="#EC4899" />
              )}
            </div>
          </div>
        )
      })()}

      {/* Personal chart */}
      <div className="mx-4 mt-5 bg-card rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-white mb-3">
          {filter === 'last' ? t('chartLastPractice') : t('chartAllSessions')}
        </h2>
        {histLoading ? (
          <div className="h-36 bg-slate-700/30 rounded-xl animate-pulse" />
        ) : (
          <StatsChart
            data={filteredHistory}
            groupAvg={groupSessionAvg}
            selectedIndex={selectedSession?.index ?? null}
            onSessionClick={(session, index) =>
              setSelectedSession(prev => prev?.index === index ? null : { data: session, index })
            }
          />
        )}
      </div>

      {/* Mini leaderboard */}
      <div className="mx-4 mt-5">
        <h2 className="text-sm font-semibold text-white mb-3">{t('groupLeaderboard')}</h2>
        {lbLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-card rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {leaderboard.slice(0, 5).map((p, i) => (
              <LeaderboardRow
                key={p.player_id}
                rank={i + 1}
                player={p}
                isMe={p.player_id === player?.player_id}
                onClick={() => navigate('/leaderboard', { state: { selectedPlayerId: p.player_id } })}
              />
            ))}
          </div>
        )}
      </div>
      <AppFooter />
    </div>
  )
}
