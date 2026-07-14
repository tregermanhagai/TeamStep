import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return res.status(503).json({ error: 'Env vars missing', supabaseUrl: !!supabaseUrl, serviceKey: !!serviceKey })
  }

  try {
    const supabase = createClient(supabaseUrl, serviceKey)

    const [
      { data: players,  error: pErr  },
      { data: reports,  error: rErr  },
      { data: scoring,  error: scErr },
    ] = await Promise.all([
      supabase.from('players').select('player_id, full_name, is_active, is_blocked').limit(5),
      supabase.from('reports').select('report_id, player_id, goals').limit(5),
      supabase.from('scoring_settings').select('*').limit(1),
    ])

    return res.status(200).json({
      players:  { count: players?.length ?? 0, error: pErr?.message ?? null, sample: players?.slice(0, 3) },
      reports:  { count: reports?.length ?? 0, error: rErr?.message ?? null },
      scoring:  { data: scoring?.[0] ?? null,  error: scErr?.message ?? null },
    })
  } catch (err: any) {
    return res.status(500).json({ error: err?.message })
  }
}
