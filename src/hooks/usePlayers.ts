import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface PlayerBasic {
  player_id: string
  full_name: string
  role: 'admin' | 'player'
}

export function usePlayers() {
  const [data, setData] = useState<PlayerBasic[]>([])
  const [loading, setLoading] = useState(true)

  function fetchPlayers() {
    setLoading(true)
    supabase
      .from('players')
      .select('player_id, full_name, role')
      .order('full_name')
      .then(({ data: rows }) => {
        setData((rows ?? []) as PlayerBasic[])
        setLoading(false)
      })
  }

  useEffect(() => { fetchPlayers() }, [])

  return { data, loading, refetch: fetchPlayers }
}
