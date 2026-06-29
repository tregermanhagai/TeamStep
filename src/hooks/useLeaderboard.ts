import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { PlayerScore } from '../types'

export function useLeaderboard() {
  const [data, setData] = useState<PlayerScore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: rows, error: err } = await supabase
        .from('player_scores')
        .select('*')
        .order('total_points', { ascending: false })

      if (err) setError(err.message)
      else setData(rows ?? [])
      setLoading(false)
    }
    load()
  }, [])

  return { data, loading, error }
}
