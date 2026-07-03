import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useSession } from '../../hooks/useSession'
import { Avatar } from '../../components/Avatar'
import { Player } from '../../types'

type TeamColor = 'Pink' | 'Blue' | 'Yellow' | 'Other'
const COLORS: TeamColor[] = ['Pink', 'Blue', 'Yellow', 'Other']

type PlayerStats = {
  attended: boolean
  goals: number
  assists: number
  teamWon: number
  cleanSheet: number
  color: TeamColor
}

function defaultStats(): PlayerStats {
  return { attended: false, goals: 0, assists: 0, teamWon: 0, cleanSheet: 0, color: 'Other' }
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function Counter({
  label, value, onChange,
}: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-xs text-slate-400">{label}</p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-7 h-7 rounded-full bg-slate-700 text-white text-base flex items-center justify-center active:scale-95"
        >−</button>
        <span className="text-white font-bold text-base w-5 text-center">{value}</span>
        <button
          onClick={() => onChange(Math.min(5, value + 1))}
          className="w-7 h-7 rounded-full bg-slate-700 text-white text-base flex items-center justify-center active:scale-95"
        >+</button>
      </div>
    </div>
  )
}

export function PracticeReportPage() {
  const { isAdmin, player: adminPlayer } = useSession()
  const navigate = useNavigate()
  const [date, setDate] = useState(todayStr())
  const [players, setPlayers] = useState<Player[]>([])
  const [stats, setStats] = useState<Record<string, PlayerStats>>({})
  const [saving, setSaving] = useState(false)
  const [savedCount, setSavedCount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAdmin) { navigate('/dashboard'); return }
    loadPlayers()
  }, [isAdmin])

  useEffect(() => {
    if (players.length > 0) loadExistingReports(date)
  }, [date, players])

  async function loadPlayers() {
    const { data } = await supabase
      .from('players')
      .select('*')
      .eq('is_active', true)
      .order('full_name')
    if (data) {
      setPlayers(data)
      const initial: Record<string, PlayerStats> = {}
      data.forEach(p => { initial[p.player_id] = defaultStats() })
      setStats(initial)
    }
    setLoading(false)
  }

  async function loadExistingReports(matchDate: string) {
    const teamId = adminPlayer?.team_id ?? 'aaaaaaaa-0000-0000-0000-000000000001'

    const { data: match } = await supabase
      .from('matches')
      .select('match_id')
      .eq('team_id', teamId)
      .eq('match_date', matchDate)
      .maybeSingle()

    if (!match) {
      // No session yet — reset all to not-attended
      setStats(s => {
        const reset: Record<string, PlayerStats> = {}
        Object.keys(s).forEach(id => { reset[id] = defaultStats() })
        return reset
      })
      return
    }

    const { data: reports } = await supabase
      .from('reports')
      .select('*')
      .eq('match_id', match.match_id)

    setStats(s => {
      const updated: Record<string, PlayerStats> = {}
      Object.keys(s).forEach(id => { updated[id] = defaultStats() })
      if (reports) {
        reports.forEach(r => {
          if (updated[r.player_id] !== undefined) {
            updated[r.player_id] = {
              attended: true,
              goals: r.goals ?? 0,
              assists: r.assists ?? 0,
              teamWon: r.team_won ?? 0,
              cleanSheet: r.clean_sheet ?? 0,
              color: (r.team_color as TeamColor) ?? 'Other',
            }
          }
        })
      }
      return updated
    })
  }

  function toggle(playerId: string) {
    setSavedCount(null)
    setStats(s => ({
      ...s,
      [playerId]: { ...s[playerId], attended: !s[playerId].attended },
    }))
  }

  function setStat<K extends keyof PlayerStats>(playerId: string, field: K, value: PlayerStats[K]) {
    setSavedCount(null)
    setStats(s => ({ ...s, [playerId]: { ...s[playerId], [field]: value } }))
  }

  async function saveAll() {
    const attending = players.filter(p => stats[p.player_id]?.attended)
    if (attending.length === 0) { setError('Mark at least one player as attending.'); return }
    setSaving(true)
    setSavedCount(null)
    setError(null)
    let failed = 0
    for (const p of attending) {
      const s = stats[p.player_id]
      const { error: err } = await supabase.rpc('admin_upsert_report', {
        p_player_id:   p.player_id,
        p_match_date:  date,
        p_goals:       s.goals,
        p_assists:     s.assists,
        p_team_won:    s.teamWon,
        p_clean_sheet: s.cleanSheet,
        p_team_color:  s.color,
      })
      if (err) { failed++; console.error('[admin_upsert_report]', err) }
    }
    setSaving(false)
    if (failed > 0) setError(`${failed} report(s) failed. Check console.`)
    else setSavedCount(attending.length)
  }

  const attendingCount = Object.values(stats).filter(s => s.attended).length

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="w-10 h-10 rounded-full bg-card animate-pulse" />
    </div>
  )

  return (
    <div className="min-h-screen bg-bg pb-32">
      {/* Header */}
      <div className="px-4 pt-12 pb-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-accent font-semibold uppercase tracking-wider">Admin</p>
          <h1 className="text-xl font-bold text-white">Practice Report</h1>
        </div>
        <button onClick={() => navigate('/profile')} className="text-slate-400 text-2xl leading-none">✕</button>
      </div>

      {/* Date picker */}
      <div className="px-4 mb-5">
        <input
          type="date"
          value={date}
          max={todayStr()}
          onChange={e => { setDate(e.target.value); setSavedCount(null) }}
          className="w-full bg-card text-white rounded-xl px-4 py-3 text-sm border border-slate-700 focus:outline-none focus:border-accent"
        />
        <p className="text-xs text-slate-500 mt-1 px-1">
          {attendingCount} player{attendingCount !== 1 ? 's' : ''} marked as attending
        </p>
      </div>

      {/* Player list */}
      <div className="px-4 flex flex-col gap-3">
        {players.map(player => {
          const s = stats[player.player_id]
          if (!s) return null
          return (
            <div key={player.player_id} className="bg-card rounded-2xl overflow-hidden">
              {/* Player row — tap to toggle attendance */}
              <button
                onClick={() => toggle(player.player_id)}
                className="w-full flex items-center justify-between px-4 py-3 active:bg-slate-700/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar player={player} size={36} />
                  <span className="text-white font-medium text-sm">{player.full_name}</span>
                </div>
                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                  s.attended ? 'bg-accent border-accent text-bg' : 'border-slate-600'
                }`}>
                  {s.attended && <span className="text-xs font-bold">✓</span>}
                </div>
              </button>

              {/* Stat inputs — only when attended */}
              {s.attended && (
                <div className="px-4 pb-4 border-t border-slate-700/40 pt-3 flex flex-col gap-4">
                  <div className="grid grid-cols-4 gap-2">
                    <Counter label="Goals"   value={s.goals}      onChange={v => setStat(player.player_id, 'goals', v)} />
                    <Counter label="Assists"  value={s.assists}    onChange={v => setStat(player.player_id, 'assists', v)} />
                    <Counter label="Wins"     value={s.teamWon}    onChange={v => setStat(player.player_id, 'teamWon', v)} />
                    <Counter label="CS"       value={s.cleanSheet} onChange={v => setStat(player.player_id, 'cleanSheet', v)} />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs text-slate-400">Team:</p>
                    {COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setStat(player.player_id, 'color', c)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          s.color === c ? 'bg-accent text-bg' : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer save bar */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-bg border-t border-slate-800">
        {error && <p className="text-red-400 text-xs mb-2 text-center">{error}</p>}
        {savedCount !== null && (
          <p className="text-green-400 text-xs mb-2 text-center">
            Saved reports for {savedCount} player{savedCount !== 1 ? 's' : ''}
          </p>
        )}
        <button
          onClick={saveAll}
          disabled={saving || attendingCount === 0}
          className="w-full bg-accent text-bg font-bold py-4 rounded-2xl active:scale-95 transition-all disabled:opacity-50"
        >
          {saving ? 'Saving…' : `Save Reports (${attendingCount} player${attendingCount !== 1 ? 's' : ''})`}
        </button>
      </div>
    </div>
  )
}
