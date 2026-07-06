import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useSessionTeamRanks(matchDate: string | null): Record<string, number> {
  const [ranks, setRanks] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!matchDate) { setRanks({}); return }

    async function load() {
      const { data: match } = await supabase
        .from('matches')
        .select('match_id')
        .eq('match_date', matchDate)
        .maybeSingle()

      if (!match) return

      const { data: reports } = await supabase
        .from('reports')
        .select('team_color, team_won, clean_sheet')
        .eq('match_id', match.match_id)

      if (!reports) return

      // Max wins/cs per color (uniform per team)
      const scores: Record<string, { wins: number; cs: number }> = {}
      reports.forEach(r => {
        const c = r.team_color ?? 'Other'
        if (!scores[c]) scores[c] = { wins: 0, cs: 0 }
        scores[c].wins = Math.max(scores[c].wins, r.team_won    ?? 0)
        scores[c].cs   = Math.max(scores[c].cs,   r.clean_sheet ?? 0)
      })

      // Sort descending by wins, then cs
      const sorted = Object.keys(scores).sort((a, b) => {
        const dw = scores[b].wins - scores[a].wins
        return dw !== 0 ? dw : scores[b].cs - scores[a].cs
      })

      // Assign equal rank to teams with equal scores
      const rankMap: Record<string, number> = {}
      sorted.forEach((color, i) => {
        if (i === 0) {
          rankMap[color] = 1
        } else {
          const prev = sorted[i - 1]
          const sameScore =
            scores[color].wins === scores[prev].wins &&
            scores[color].cs   === scores[prev].cs
          rankMap[color] = sameScore ? rankMap[prev] : i + 1
        }
      })

      setRanks(rankMap)
    }

    load()
  }, [matchDate])

  return ranks
}
