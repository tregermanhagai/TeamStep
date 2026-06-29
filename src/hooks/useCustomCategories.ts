import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { CustomCategory } from '../types'

export function useCustomCategories(includeInactive = false) {
  const [data, setData] = useState<CustomCategory[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    let q = supabase
      .from('custom_categories')
      .select('*')
      .order('sort_order')

    if (!includeInactive) q = q.eq('is_active', true)

    const { data: rows } = await q
    setData(rows ?? [])
    setLoading(false)
  }, [includeInactive])

  useEffect(() => { load() }, [load])

  return { data, loading, reload: load }
}
