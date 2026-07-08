import { useState, useEffect } from 'react'
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
import { useLastSessionLeaderboard } from '../hooks/useLastSessionLeaderboard'
import { useSessionTeamRanks } from '../hooks/useSessionTeamRanks'

type Filter = 'all' | 'last'
type TeamColor = 'Pink' | 'Blue' | 'Yellow' | 'Green' | 'Red' | 'Other'
const COLORS: TeamColor[] = ['Pink', 'Blue', 'Yellow', 'Green', 'Red', 'Other']
const COLOR_LABELS: Record<TeamColor, string> = { Pink: 'ורוד', Blue: 'כחול', Yellow: 'צהוב', Green: 'ירוק', Red: 'אדום', Other: 'אחר' }
const COLOR_DOT: Record<TeamColor, string> = { Pink: 'bg-pink-500', Blue: 'bg-blue-400', Yellow: 'bg-yellow-400', Green: 'bg-green-500', Red: 'bg-red-500', Other: 'bg-slate-500' }
function todayStr() { return new Date().toISOString().split('T')[0] }

export function DashboardPage() {
  const { t } = useLocale()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('last')
  const [selectedSession, setSelectedSession] = useState<{ data: typeof history[0]; index: number } | null>(null)
  const [reportGoals,      setReportGoals]      = useState(0)
  const [reportAssists,    setReportAssists]    = useState(0)
  const [reportWon,        setReportWon]        = useState(0)
  const [reportCS,         setReportCS]         = useState(0)
  const [reportColor,      setReportColor]      = useState<TeamColor>('Other')
  const [reportMatchId,    setReportMatchId]    = useState<string | null>(null)
  const [reportExists,     setReportExists]     = useState(false)
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [reportSaved,      setReportSaved]      = useState(false)
  const [reportResetting,  setReportResetting]  = useState(false)
  const [showInfo,         setShowInfo]         = useState(false)
  const { player } = useSession()
  const { data: leaderboard, loading: lbLoading } = useLeaderboard()
  const { data: history, loading: histLoading, refetch: refetchHistory } = useMyStats(player?.player_id)
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

  const { data: lastSessionMap } = useLastSessionLeaderboard()
  const lastSessionValues = Object.values(lastSessionMap)
  const lastSessionUserPts = filteredHistory[0]?.match_pts ?? 0
  const lastSessionMaxPts  = lastSessionValues.length > 0 ? Math.max(...lastSessionValues.map(s => s.session_pts)) : 0
  const lastSessionAvgPts  = lastSessionValues.length > 0 ? lastSessionValues.reduce((s, v) => s + v.session_pts, 0) / lastSessionValues.length : 0

  const ringPoints  = filter === 'last' ? lastSessionUserPts : (me?.total_points ?? 0)
  const ringMax     = filter === 'last' ? lastSessionMaxPts  : maxPoints
  const ringAvg     = filter === 'last' ? lastSessionAvgPts  : avgPoints

  const currentSessionDate =
    selectedSession?.data.match_date ?? (filter === 'last' ? filteredHistory[0]?.match_date : null) ?? null
  const teamRanks = useSessionTeamRanks(currentSessionDate)

  useEffect(() => {
    if (!player) return
    loadTodayReport()
  }, [player?.player_id])

  async function loadTodayReport() {
    const { data: matchId } = await supabase.rpc('find_or_create_match', { p_date: todayStr() })
    if (!matchId) return
    setReportMatchId(matchId as string)
    const { data: report } = await supabase
      .from('reports')
      .select('*')
      .eq('player_id', player!.player_id)
      .eq('match_id', matchId)
      .maybeSingle()
    if (report) {
      setReportExists(true)
      setReportGoals(report.goals ?? 0)
      setReportAssists(report.assists ?? 0)
      setReportWon(report.team_won ?? 0)
      setReportCS(report.clean_sheet ?? 0)
      setReportColor((report.team_color ?? 'Other') as TeamColor)
    } else {
      setReportExists(false)
    }
  }

  async function resetReport() {
    if (!player || !reportMatchId) return
    setReportResetting(true)
    await supabase.from('reports')
      .delete()
      .eq('player_id', player.player_id)
      .eq('match_id', reportMatchId)
    setReportGoals(0)
    setReportAssists(0)
    setReportWon(0)
    setReportCS(0)
    setReportColor('Other')
    setReportExists(false)
    setReportSaved(false)
    setReportResetting(false)
    refetchHistory()
  }

  async function submitReport() {
    if (!player || !reportMatchId) return
    setReportSubmitting(true)
    setReportSaved(false)
    await supabase.from('reports').upsert({
      player_id: player.player_id,
      match_id: reportMatchId,
      goals: reportGoals,
      assists: reportAssists,
      team_won: reportWon,
      clean_sheet: reportCS,
      team_color: reportColor,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'player_id,match_id' })
    setReportSubmitting(false)
    setReportSaved(true)
    setReportExists(true)
    refetchHistory()
    setTimeout(() => setReportSaved(false), 2500)
  }

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
            onClick={() => setShowInfo(true)}
            className="bg-card text-xl px-3 rounded-xl border border-slate-700 flex items-center justify-center"
            title="מידע"
          >🛟</button>
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
        {(['last', 'all'] as Filter[]).map((f) => (
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
            userPoints={ringPoints}
            teamAvg={ringAvg}
            maxPoints={ringMax}
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
            {isSession && src.team_color && (
              <div className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${COLOR_DOT[src.team_color as TeamColor] ?? 'bg-slate-500'}`} />
                <span className="text-xs text-slate-300">
                  צבע קבוצה: {COLOR_LABELS[src.team_color as TeamColor] ?? src.team_color}
                  {teamRanks[src.team_color] !== undefined && (
                    <span className="text-accent font-semibold"> ({teamRanks[src.team_color]})</span>
                  )}
                </span>
              </div>
            )}
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

      {/* Inline session report */}
      <div className="mx-4 mt-5 bg-card rounded-2xl p-4">
        <p className="text-sm font-semibold text-white mb-3 text-right">נתוני האימון שלי היום</p>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {([
            { label: 'שער',   value: reportGoals,   set: setReportGoals   },
            { label: 'בישול', value: reportAssists,  set: setReportAssists },
            { label: "נצ'",   value: reportWon,      set: setReportWon     },
            { label: 'ללא ספיגה', value: reportCS,   set: setReportCS      },
          ] as const).map(({ label, value, set }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <p className="text-xs text-slate-400">{label}</p>
              <div className="flex items-center gap-1">
                <button onClick={() => set(Math.max(0, value - 1))} className="w-7 h-7 rounded-full bg-slate-700 text-white flex items-center justify-center active:scale-95">−</button>
                <span className="text-white font-bold text-sm w-4 text-center">{value}</span>
                <button onClick={() => set(Math.min(5, value + 1))} className="w-7 h-7 rounded-full bg-slate-700 text-white flex items-center justify-center active:scale-95">+</button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mb-3 flex-wrap justify-end">
          <p className="text-xs text-slate-400">:קבוצה</p>
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setReportColor(c)}
              className={`px-2 py-0.5 rounded-lg text-xs font-medium transition-all ${reportColor === c ? 'bg-accent text-bg' : 'bg-slate-700 text-slate-300'}`}
            >
              {COLOR_LABELS[c]}
            </button>
          ))}
        </div>
        {reportSaved && <p className="text-green-400 text-xs mb-2 text-center">נשמר בהצלחה ✓</p>}
        <div className="flex gap-2">
          <button
            onClick={submitReport}
            disabled={reportSubmitting || !reportMatchId || (reportGoals === 0 && reportAssists === 0 && reportWon === 0 && reportCS === 0 && reportColor === 'Other')}
            className="flex-1 bg-accent text-bg text-sm font-bold py-2.5 rounded-xl active:scale-95 transition-all disabled:opacity-50"
          >
            {reportSubmitting ? 'שומר...' : 'שמור נתוני אימון'}
          </button>
          {reportExists && (
            <button
              onClick={resetReport}
              disabled={reportResetting}
              className="px-4 py-2.5 bg-slate-700 text-red-400 text-sm font-medium rounded-xl active:scale-95 transition-all disabled:opacity-50"
            >
              {reportResetting ? '...' : 'מחק'}
            </button>
          )}
        </div>
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
                showPracticeCount
              />
            ))}
          </div>
        )}
      </div>
      <AppFooter />

      {/* Info popup */}
      {showInfo && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-4"
          onClick={() => setShowInfo(false)}
        >
          <div
            className="bg-card rounded-2xl p-6 w-full max-w-sm mb-6 flex flex-col items-center gap-4"
            onClick={e => e.stopPropagation()}
          >
            <span className="text-5xl">🛟</span>
            <div className="text-center">
              <p className="text-white font-bold text-base mb-1">TeamStep</p>
              <p className="text-slate-400 text-xs">גרסה 0.1.0</p>
            </div>
            <a
              href="https://wa.me/972545966296"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold text-sm py-3 rounded-xl transition-colors active:scale-95"
            >
              <span className="text-lg">💬</span>
              צור קשר ב-WhatsApp
            </a>
            <button
              onClick={() => setShowInfo(false)}
              className="text-slate-500 text-xs"
            >
              סגור
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
