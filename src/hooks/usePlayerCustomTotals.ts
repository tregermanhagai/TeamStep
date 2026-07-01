import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface CustomTotal {
  label: string
  total: number
}

export function usePlayerCustomTotals(playerId: string | undefined) {
  const [data, setData] = useState<CustomTotal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!playerId) { setLoading(false); return }

    supabase
      .from('reports')
      .select('report_custom_stats(value, custom_categories(label, is_active))')
      .eq('player_id', playerId)
      .then(({ data: rows }) => {
        const totals: Record<string, number> = {}
        for (const report of rows ?? []) {
          for (const rcs of (report.report_custom_stats ?? []) as unknown as { value: number; custom_categories: { label: string; is_active: boolean } | null }[]) {
            if (rcs.custom_categories?.is_active) {
              const label = rcs.custom_categories.label
              totals[label] = (totals[label] ?? 0) + rcs.value
            }
          }
        }
        setData(Object.entries(totals).map(([label, total]) => ({ label, total })))
        setLoading(false)
      })
  }, [playerId])

  return { data, loading }
}
