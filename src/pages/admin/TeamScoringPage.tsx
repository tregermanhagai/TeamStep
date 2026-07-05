import { useState, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useSession } from '../../hooks/useSession'

type TeamColor = 'Pink' | 'Blue' | 'Yellow' | 'Green' | 'Red' | 'Other'
const COLORS: TeamColor[] = ['Pink', 'Blue', 'Yellow', 'Green', 'Red', 'Other']
const COLOR_LABELS: Record<TeamColor, string> = { Pink: 'ורוד', Blue: 'כחול', Yellow: 'צהוב', Green: 'ירוק', Red: 'אדום', Other: 'אחר' }
const BORDER_COLOR: Record<TeamColor, string> = {
  Yellow: 'border-yellow-500/50', Pink: 'border-pink-500/50',
  Blue: 'border-blue-400/50', Green: 'border-green-500/50',
  Red: 'border-red-500/50', Other: 'border-slate-600',
}
const TEXT_COLOR: Record<TeamColor, string> = {
  Yellow: 'text-yellow-400', Pink: 'text-pink-400',
  Blue: 'text-blue-400', Green: 'text-green-400',
  Red: 'text-red-400', Other: 'text-slate-400',
}

type TeamStat = { wins: number; cs: number }
type TeamPlayers = Record<TeamColor, string[]>

function todayStr() { return new Date().toISOString().split('T')[0] }

export function TeamScoringPage() {
  const { isAdmin, loading: sessionLoading } = useSession()
  const navigate = useNavigate()
  const [date, setDate] = useState(todayStr())
  const [teamPlayers, setTeamPlayers] = useState<TeamPlayers>({ Pink: [], Blue: [], Yellow: [], Green: [], Red: [], Other: [] })
  const [teamStats, setTeamStats] = useState<Record<TeamColor, TeamStat>>({
    Pink: { wins: 0, cs: 0 }, Blue: { wins: 0, cs: 0 },
    Yellow: { wins: 0, cs: 0 }, Green: { wins: 0, cs: 0 },
    Red: { wins: 0, cs: 0 }, Other: { wins: 0, cs: 0 },
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionLoading && isAdmin) loadReports(date)
  }, [sessionLoading, isAdmin, date])

  async function loadReports(matchDate: string) {
    setLoading(true)
    const { data: match } = await supabase
      .from('matches')
      .select('match_id')
      .eq('match_date', matchDate)
      .maybeSingle()

    const grouped: TeamPlayers = { Pink: [], Blue: [], Yellow: [], Green: [], Red: [], Other: [] }
    const inferred: Record<TeamColor, TeamStat> = {
      Pink: { wins: 0, cs: 0 }, Blue: { wins: 0, cs: 0 },
      Yellow: { wins: 0, cs: 0 }, Green: { wins: 0, cs: 0 },
      Red: { wins: 0, cs: 0 }, Other: { wins: 0, cs: 0 },
    }

    if (match) {
      const { data: reports } = await supabase
        .from('reports')
        .select('player_id, team_color, team_won, clean_sheet, players(full_name)')
        .eq('match_id', match.match_id)

      if (reports) {
        reports.forEach((r: any) => {
          const color = (r.team_color as TeamColor) ?? 'Other'
          const name = r.players?.full_name ?? '?'
          grouped[color].push(name)
          inferred[color].wins = Math.max(inferred[color].wins, r.team_won ?? 0)
          inferred[color].cs   = Math.max(inferred[color].cs,   r.clean_sheet ?? 0)
        })
      }
    }

    setTeamPlayers(grouped)
    setTeamStats(inferred)
    setLoading(false)
  }

  async function saveAll() {
    setSaving(true)
    setError(null)
    let failed = 0
    for (const color of COLORS) {
      const ts = teamStats[color]
      const { error: err } = await supabase.rpc('admin_set_team_score', {
        p_match_date: date,
        p_color:      color,
        p_wins:       ts.wins,
        p_cs:         ts.cs,
      })
      if (err) { failed++; console.error('[admin_set_team_score]', err) }
    }
    setSaving(false)
    if (failed > 0) setError(`${failed} color(s) failed. Check console.`)
    else navigate('/leaderboard')
  }

  if (sessionLoading) return <div className="min-h-screen bg-bg" />
  if (!isAdmin) return <Navigate to="/dashboard" replace />

  const hasAnyPlayers = COLORS.some(c => teamPlayers[c].length > 0)

  return (
    <div className="min-h-screen bg-bg pb-32">
      {/* Header */}
      <div className="px-4 pt-12 pb-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-accent font-semibold uppercase tracking-wider">Admin</p>
          <h1 className="text-xl font-bold text-white">ניקוד קבוצתי</h1>
        </div>
        <button onClick={() => navigate('/profile')} className="text-slate-400 text-2xl leading-none">✕</button>
      </div>

      {/* Date picker */}
      <div className="px-4 mb-5">
        <input
          type="date"
          value={date}
          max={todayStr()}
          onChange={e => setDate(e.target.value)}
          className="w-full bg-card text-white rounded-xl px-4 py-3 text-sm border border-slate-700 focus:outline-none focus:border-accent"
        />
        {!loading && !hasAnyPlayers && (
          <p className="text-xs text-slate-500 mt-1 px-1">אין שחקנים שדווחו לתאריך זה עדיין</p>
        )}
      </div>

      {/* Team cards */}
      {loading ? (
        <div className="px-4 flex flex-col gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-card rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="px-4 flex flex-col gap-3">
          {COLORS.map(color => {
            const names = teamPlayers[color]
            const ts = teamStats[color]
            return (
              <div key={color} className={`bg-card rounded-2xl border p-4 ${BORDER_COLOR[color]}`}>
                <p className={`text-sm font-semibold mb-1 ${TEXT_COLOR[color]}`}>
                  {COLOR_LABELS[color]} ({names.length})
                </p>
                <p className="text-xs text-slate-500 mb-3 truncate min-h-[1rem]">
                  {names.length > 0 ? names.join(' · ') : '—'}
                </p>
                <div className="flex gap-8">
                  {([
                    { label: 'ניצחון', key: 'wins' as const },
                    { label: 'ללא ספיגה', key: 'cs' as const },
                  ]).map(({ label, key }) => (
                    <div key={key} className="flex flex-col items-center gap-1">
                      <p className="text-xs text-slate-400">{label}</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setTeamStats(s => ({ ...s, [color]: { ...s[color], [key]: Math.max(0, s[color][key] - 1) } }))}
                          className="w-7 h-7 rounded-full bg-slate-700 text-white flex items-center justify-center active:scale-95"
                        >−</button>
                        <span className="text-white font-bold w-5 text-center">{ts[key]}</span>
                        <button
                          onClick={() => setTeamStats(s => ({ ...s, [color]: { ...s[color], [key]: Math.min(9, s[color][key] + 1) } }))}
                          className="w-7 h-7 rounded-full bg-slate-700 text-white flex items-center justify-center active:scale-95"
                        >+</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-bg border-t border-slate-800">
        {error && <p className="text-red-400 text-xs mb-2 text-center">{error}</p>}
        <button
          onClick={saveAll}
          disabled={saving || !hasAnyPlayers}
          className="w-full bg-accent text-bg font-bold py-4 rounded-2xl active:scale-95 transition-all disabled:opacity-50"
        >
          {saving ? 'שומר…' : 'שמור ניקוד קבוצתי'}
        </button>
      </div>
    </div>
  )
}
