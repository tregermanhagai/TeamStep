import { useState, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useSession } from '../../hooks/useSession'
import { useLocale } from '../../contexts/LocaleContext'
import { trainerLabel } from '../../lib/playerUtils'

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
type PlayerEntry = { id: string; name: string }
type TeamPlayerMap = Record<TeamColor, PlayerEntry[]>

const emptyMap = (): TeamPlayerMap => ({
  Pink: [], Blue: [], Yellow: [], Green: [], Red: [], Other: [],
})
const emptyStats = (): Record<TeamColor, TeamStat> => ({
  Pink: { wins: 0, cs: 0 }, Blue: { wins: 0, cs: 0 },
  Yellow: { wins: 0, cs: 0 }, Green: { wins: 0, cs: 0 },
  Red: { wins: 0, cs: 0 }, Other: { wins: 0, cs: 0 },
})

function todayStr() { return new Date().toISOString().split('T')[0] }

export function TeamScoringPage() {
  const { isAdmin, loading: sessionLoading, player: adminPlayer } = useSession()
  const { locale } = useLocale()
  const navigate = useNavigate()
  const [date, setDate] = useState(todayStr())
  const [teamPlayerMap, setTeamPlayerMap] = useState<TeamPlayerMap>(emptyMap())
  const [teamStats, setTeamStats] = useState<Record<TeamColor, TeamStat>>(emptyStats())
  const [allPlayers, setAllPlayers] = useState<{ player_id: string; full_name: string }[]>([])
  const [expandedColor, setExpandedColor] = useState<TeamColor | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [addingToColor, setAddingToColor] = useState<TeamColor | null>(null)
  const [newPlayerName, setNewPlayerName] = useState('')
  const [creatingPlayer, setCreatingPlayer] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('players').select('player_id, full_name').eq('is_active', true).order('full_name')
      .then(({ data }) => { if (data) setAllPlayers(data) })
  }, [])

  useEffect(() => { setNewPlayerName('') }, [expandedColor])

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

    const grouped = emptyMap()
    const inferred = emptyStats()

    if (match) {
      const { data: reports } = await supabase
        .from('reports')
        .select('player_id, team_color, team_won, clean_sheet, players(full_name)')
        .eq('match_id', match.match_id)

      if (reports) {
        reports.forEach((r: any) => {
          const color = (r.team_color as TeamColor) ?? 'Other'
          grouped[color].push({ id: r.player_id, name: r.players?.full_name ?? '?' })
          inferred[color].wins = Math.max(inferred[color].wins, r.team_won ?? 0)
          inferred[color].cs   = Math.max(inferred[color].cs,   r.clean_sheet ?? 0)
        })
      }
    }

    setTeamPlayerMap(grouped)
    setTeamStats(inferred)
    setLoading(false)
  }

  async function createAndAddPlayer(color: TeamColor) {
    if (!newPlayerName.trim() || !adminPlayer?.team_id) return
    setCreatingPlayer(true)
    const { data: newId, error: addErr } = await supabase.rpc('admin_add_player', {
      p_full_name: newPlayerName.trim(),
      p_team_id:   adminPlayer.team_id,
    })
    if (addErr || !newId) { console.error('[createAndAddPlayer]', addErr); setCreatingPlayer(false); return }
    setNewPlayerName('')
    await addPlayerToTeam(newId as string, color)
    setCreatingPlayer(false)
    // Refresh full player list so the new player appears in future dropdowns
    const { data } = await supabase.from('players').select('player_id, full_name').eq('is_active', true).order('full_name')
    if (data) setAllPlayers(data)
  }

  async function removePlayerFromTeam(playerId: string) {
    const { error: err } = await supabase.rpc('admin_remove_attendance', {
      p_player_id:  playerId,
      p_match_date: date,
    })
    if (err) { console.error('[removePlayerFromTeam]', err); return }
    setTeamPlayerMap(prev => {
      const next = { ...prev }
      for (const color of COLORS) {
        next[color] = prev[color].filter(e => e.id !== playerId)
      }
      return next
    })
  }

  async function addPlayerToTeam(playerId: string, color: TeamColor) {
    setAddingToColor(color)
    const { error: err } = await supabase.rpc('admin_save_attendance', {
      p_player_id:  playerId,
      p_match_date: date,
      p_goals:      0,
      p_assists:    0,
      p_color:      color,
    })
    if (err) console.error('[addPlayerToTeam]', err)
    setAddingToColor(null)
    await loadReports(date)
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

  const hasAnyPlayers = COLORS.some(c => teamPlayerMap[c].length > 0)

  return (
    <div className="min-h-screen bg-bg pb-32">
      {/* Header */}
      <div className="px-4 pt-12 pb-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-accent font-semibold uppercase tracking-wider">מנהל</p>
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
            const entries = teamPlayerMap[color]
            const ts = teamStats[color]
            const isExpanded = expandedColor === color
            const inThisColor = new Set(entries.map(e => e.id))
            const availableToAdd = allPlayers.filter(p => !inThisColor.has(p.player_id))

            return (
              <div key={color} className={`bg-card rounded-2xl border ${BORDER_COLOR[color]}`}>
                {/* Clickable header — always active */}
                <button
                  className="w-full flex items-center justify-between px-4 pt-4 pb-2 active:opacity-70"
                  onClick={() => setExpandedColor(prev => prev === color ? null : color)}
                >
                  <p className={`text-sm font-semibold ${TEXT_COLOR[color]}`}>
                    {COLOR_LABELS[color]} ({entries.length})
                  </p>
                  <span className="text-slate-500 text-xs">{isExpanded ? '▲' : '▼'}</span>
                </button>

                {/* Collapsed: show truncated player names */}
                {!isExpanded && (
                  <p className="text-xs text-slate-500 px-4 pb-3 truncate min-h-[1.25rem]">
                    {entries.length > 0 ? entries.map(e => e.name).join(' · ') : '—'}
                  </p>
                )}

                {/* Expanded: full player list + add dropdown */}
                {isExpanded && (
                  <div className="px-4 pb-3 border-t border-slate-700/40 pt-2">
                    {entries.length === 0 && (
                      <p className="text-xs text-slate-600 py-1">אין שחקנים בקבוצה זו</p>
                    )}
                    <div className="flex flex-col gap-0.5 mb-2">
                      {entries.map(e => (
                        <div key={e.id} className="flex items-center justify-between gap-2">
                          <p className="text-xs text-slate-300 py-0.5">
                            • {e.name}
                            {trainerLabel(e.name, locale) && (
                              <span className="ml-1 text-slate-500">{trainerLabel(e.name, locale)}</span>
                            )}
                          </p>
                          <button
                            onClick={() => removePlayerFromTeam(e.id)}
                            className="text-slate-600 hover:text-red-400 text-sm leading-none flex-shrink-0 transition-colors"
                            title="הסר מהקבוצה"
                          >×</button>
                        </div>
                      ))}
                    </div>
                    {/* Add existing player dropdown */}
                    <select
                      value=""
                      onChange={e => { if (e.target.value) addPlayerToTeam(e.target.value, color) }}
                      disabled={addingToColor === color || availableToAdd.length === 0}
                      className="w-full bg-bg text-white rounded-xl px-3 py-2 text-xs border border-slate-700 focus:outline-none focus:border-accent disabled:opacity-50"
                    >
                      <option value="">
                        {availableToAdd.length === 0
                          ? 'כל השחקנים כבר בקבוצה זו'
                          : addingToColor === color
                            ? 'מוסיף…'
                            : '+ הוסף שחקן לקבוצה…'}
                      </option>
                      {availableToAdd.map(p => (
                        <option key={p.player_id} value={p.player_id}>{p.full_name}{trainerLabel(p.full_name, locale) ? ` ${trainerLabel(p.full_name, locale)}` : ''}</option>
                      ))}
                    </select>

                    {/* Create new manual player */}
                    <div className="flex gap-2 mt-2">
                      <input
                        type="text"
                        value={newPlayerName}
                        onChange={e => setNewPlayerName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && createAndAddPlayer(color)}
                        placeholder="שם שחקן חדש…"
                        className="flex-1 bg-bg text-white rounded-xl px-3 py-2 text-xs border border-slate-700 focus:outline-none focus:border-accent placeholder-slate-600"
                      />
                      <button
                        onClick={() => createAndAddPlayer(color)}
                        disabled={!newPlayerName.trim() || creatingPlayer}
                        className="px-3 py-2 bg-accent text-bg text-xs font-bold rounded-xl active:scale-95 transition-all disabled:opacity-50"
                      >
                        {creatingPlayer ? '…' : 'צור'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Wins / CS counters — always visible */}
                <div className="flex gap-8 px-4 pb-4">
                  {([
                    { label: 'ניצחון',    key: 'wins' as const },
                    { label: 'ללא ספיגה', key: 'cs'   as const },
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
