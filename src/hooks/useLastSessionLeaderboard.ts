import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export type LastSessionStat = {
  goals: number
  assists: number
  team_won: number
  clean_sheet: number
  session_pts: number
}

// date = undefined  → find latest match that actually has reports (for LeaderboardPage)
// date = null       → history still loading, do nothing
// date = 'YYYY-MM-DD' → load that specific session (for DashboardPage "Last Practice")
export function useLastSessionLeaderboard(date?: string | null) {
  const [data, setData] = useState<Record<string, LastSessionStat>>({})

  useEffect(() => {
    if (date === null) return        // loading, wait
    if (date === undefined) {
      loadLatest()                   // LeaderboardPage: auto-detect
    } else {
      loadByDate(date)               // DashboardPage: use known date
    }
  }, [date])

  async function loadLatest() {
    // Get the 20 most-recent matches by date, then check which ones have reports.
    // We can't just take the latest match because find_or_create_match creates an
    // empty match for today on every dashboard load.
    const { data: recentMatches } = await supabase
      .from('matches')
      .select('match_id')
      .order('match_date', { ascending: false })
      .limit(20)

    if (!recentMatches || recentMatches.length === 0) return

    const ids = recentMatches.map(m => m.match_id)
    const { data: reportRows } = await supabase
      .from('reports')
      .select('match_id')
      .in('match_id', ids)

    if (!reportRows || reportRows.length === 0) return

    const withReports = new Set(reportRows.map(r => r.match_id))
    // recentMatches is already sorted newest-first, so the first hit is the latest real session
    const target = recentMatches.find(m => withReports.has(m.match_id))
    if (!target) return

    await loadByMatchId(target.match_id)
  }

  async function loadByDate(targetDate: string) {
    const { data: match } = await supabase
      .from('matches')
      .select('match_id')
      .eq('match_date', targetDate)
      .maybeSingle()

    if (!match) return
    await loadByMatchId(match.match_id)
  }

  async function loadByMatchId(matchId: string) {
    const [{ data: reports }, { data: settings }] = await Promise.all([
      supabase.from('reports').select('*').eq('match_id', matchId),
      supabase.from('scoring_settings').select('*').single(),
    ])

    if (!reports || !settings) return

    const map: Record<string, LastSessionStat> = {}
    reports.forEach(r => {
      map[r.player_id] = {
        goals:       r.goals       ?? 0,
        assists:     r.assists     ?? 0,
        team_won:    r.team_won    ?? 0,
        clean_sheet: r.clean_sheet ?? 0,
        session_pts: (r.goals       ?? 0) * settings.goal_pts        +
                     (r.assists     ?? 0) * settings.assist_pts      +
                     (r.team_won    ?? 0) * settings.win_pts         +
                     (r.clean_sheet ?? 0) * settings.clean_sheet_pts,
      }
    })
    setData(map)
  }

  return { data }
}
