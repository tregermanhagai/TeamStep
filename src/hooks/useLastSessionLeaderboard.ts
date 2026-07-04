import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export type LastSessionStat = {
  goals: number
  assists: number
  team_won: number
  clean_sheet: number
  session_pts: number
}

export function useLastSessionLeaderboard() {
  const [data, setData] = useState<Record<string, LastSessionStat>>({})

  useEffect(() => { load() }, [])

  async function load() {
    const { data: match } = await supabase
      .from('matches')
      .select('match_id')
      .order('match_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!match) return

    const [{ data: reports }, { data: settings }] = await Promise.all([
      supabase.from('reports').select('*').eq('match_id', match.match_id),
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
        session_pts: (r.goals ?? 0)       * settings.goal_pts  +
                     (r.assists ?? 0)     * settings.assist_pts +
                     (r.team_won ?? 0)    * settings.win_pts    +
                     (r.clean_sheet ?? 0) * settings.clean_sheet_pts,
      }
    })
    setData(map)
  }

  return { data }
}
