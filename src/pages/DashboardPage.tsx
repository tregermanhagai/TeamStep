import { useSession } from '../hooks/useSession'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { useMyStats } from '../hooks/useMyStats'
import { ScoreRing } from '../components/ScoreRing'
import { StatsChart } from '../components/StatsChart'
import { StatPill } from '../components/StatPill'
import { LeaderboardRow } from '../components/LeaderboardRow'
import { supabase } from '../lib/supabase'

export function DashboardPage() {
  const { player } = useSession()
  const { data: leaderboard, loading: lbLoading } = useLeaderboard()
  const { data: history, loading: histLoading } = useMyStats(player?.player_id)

  const me = leaderboard.find((p) => p.player_id === player?.player_id)
  const myRank = me ? leaderboard.indexOf(me) + 1 : null

  const avgPoints =
    leaderboard.length > 0
      ? leaderboard.reduce((s, p) => s + p.total_points, 0) / leaderboard.length
      : 0
  const maxPoints = leaderboard[0]?.total_points ?? 0

  return (
    <div className="min-h-screen bg-bg pb-nav">
      {/* Header */}
      <div className="px-4 pt-12 pb-2 flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm">Welcome back</p>
          <h1 className="text-lg font-bold text-white">{player?.full_name ?? '—'}</h1>
        </div>
        <div className="flex items-center gap-2">
          {myRank && (
            <div className="bg-card rounded-2xl px-3 py-1.5 text-center">
              <p className="text-xs text-slate-400">Rank</p>
              <p className="text-accent font-bold text-lg leading-none">#{myRank}</p>
            </div>
          )}
          <button
            onClick={() => supabase.auth.signOut()}
            className="bg-card text-slate-400 text-xs px-3 py-2 rounded-xl border border-slate-700 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
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
      {me && (
        <div className="flex gap-3 overflow-x-auto px-4 mt-5 pb-1 no-scrollbar">
          <StatPill label="Goals" value={me.total_goals} color="#22C55E" />
          <StatPill label="Assists" value={me.total_assists} color="#06C8E0" />
          <StatPill label="Wins" value={me.total_wins} color="#F59E0B" />
          <StatPill label="Played" value={me.matches_played} color="#8B5CF6" />
        </div>
      )}

      {/* Personal chart */}
      <div className="mx-4 mt-5 bg-card rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-white mb-3">My Points This Month</h2>
        {histLoading ? (
          <div className="h-36 bg-slate-700/30 rounded-xl animate-pulse" />
        ) : (
          <StatsChart data={history} />
        )}
      </div>

      {/* Mini leaderboard */}
      <div className="mx-4 mt-5">
        <h2 className="text-sm font-semibold text-white mb-3">Group Leaderboard</h2>
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
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
