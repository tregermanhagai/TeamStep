import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { SessionMatchStat } from '../types'

export function useMyStats(playerId: string | undefined) {
  const [data, setData] = useState<SessionMatchStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!playerId) { setLoading(false); return }

    supabase
      .from('player_match_scores')
      .select('match_date, label, goals, assists, team_won, clean_sheet, team_color, match_pts')
      .eq('player_id', playerId)
      .order('match_date')
      .then(({ data: rows }) => {
        setData((rows ?? []) as SessionMatchStat[])
        setLoading(false)
      })
  }, [playerId])

  return { data, loading }
}
