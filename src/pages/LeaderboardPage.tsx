import { useSession } from '../hooks/useSession'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { LeaderboardRow } from '../components/LeaderboardRow'
import { useLocale } from '../contexts/LocaleContext'

export function LeaderboardPage() {
  const { t } = useLocale()
  const { player } = useSession()
  const { data, loading } = useLeaderboard()

  return (
    <div className="min-h-screen bg-bg pb-nav">
      <div className="px-4 pt-12 pb-4">
        <h1 className="text-xl font-bold text-white">{t('leaderboardTitle')}</h1>
        <p className="text-slate-400 text-sm mt-0.5">{t('leaderboardSubtitle')}</p>
      </div>

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
              />
            ))}
      </div>
    </div>
  )
}
