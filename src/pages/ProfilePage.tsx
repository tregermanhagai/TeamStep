import { Link } from 'react-router-dom'
import { useSession } from '../hooks/useSession'
import { useLocale } from '../contexts/LocaleContext'
import { useMyStats } from '../hooks/useMyStats'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { Avatar } from '../components/Avatar'
import { StatPill } from '../components/StatPill'
import { supabase } from '../lib/supabase'
import { AppFooter } from '../components/AppFooter'

export function ProfilePage() {
  const { t, locale, setLocale } = useLocale()
  const { player, session, isAdmin, loading } = useSession()
  const { data: history } = useMyStats(player?.player_id)
  const { data: leaderboard } = useLeaderboard()

  const me = leaderboard.find((p) => p.player_id === player?.player_id)
  const myRank = me ? leaderboard.indexOf(me) + 1 : null

  async function signOut() {
    await supabase.auth.signOut()
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
          <h1 className="text-xl font-bold text-white">{player.full_name}</h1>
          <p className="text-slate-400 text-sm">{session?.user?.email}</p>
          {myRank && <p className="text-accent text-sm font-medium mt-1">{t('rank')} #{myRank}</p>}
        </div>
      </div>

      {me && (
        <div className="flex gap-3 overflow-x-auto px-4 pb-2">
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
          <p className="text-white font-semibold">
            {history.length > 0 ? Math.max(...history.map((h) => h.match_pts)) + ' ' + t('pts') : '—'}
          </p>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-slate-400">{t('role')}</p>
          <p className="text-white font-semibold capitalize">{player.role}</p>
        </div>
      </div>

      {isAdmin && (
        <div className="mx-4 mt-5">
          <p className="text-xs text-accent font-semibold uppercase tracking-wider mb-2">{t('adminSection')}</p>
          <div className="bg-card rounded-2xl divide-y divide-slate-700/50">
            <Link
              to="/admin/scoring"
              className="flex items-center justify-between px-4 py-3 hover:bg-slate-700/30 rounded-t-2xl transition-colors"
            >
              <div>
                <p className="text-sm text-white font-medium">{t('scoringRules')}</p>
                <p className="text-xs text-slate-400">{t('scoringRulesDesc')}</p>
              </div>
              <span className="text-slate-500 text-lg">›</span>
            </Link>
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
