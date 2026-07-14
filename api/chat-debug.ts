export default async function handler(req: any, res: any) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return res.status(503).json({
      error: 'Env vars missing',
      hasUrl: !!supabaseUrl,
      hasKey: !!serviceKey,
    })
  }

  const headers = {
    'apikey': serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  }

  try {
    const [playersRes, reportsRes, scoringRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/players?select=player_id,full_name,is_active,is_blocked&limit=5`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/reports?select=report_id,player_id,goals&limit=3`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/scoring_settings?select=goal_pts,assist_pts,win_pts,clean_sheet_pts&limit=1`, { headers }),
    ])

    const [players, reports, scoring] = await Promise.all([
      playersRes.json(),
      reportsRes.json(),
      scoringRes.json(),
    ])

    return res.status(200).json({
      players:  { status: playersRes.status, count: Array.isArray(players) ? players.length : '?', sample: players },
      reports:  { status: reportsRes.status, count: Array.isArray(reports) ? reports.length : '?', sample: reports },
      scoring:  { status: scoringRes.status, data: scoring },
    })
  } catch (err: any) {
    return res.status(500).json({ error: err?.message })
  }
}
