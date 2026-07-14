import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { question } = req.body ?? {}
  if (!question || typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({ error: 'Missing question' })
  }

  const supabaseUrl  = process.env.VITE_SUPABASE_URL
  const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY
  const openaiKey    = process.env.OPENAI_API_KEY

  if (!supabaseUrl || !serviceKey || !openaiKey) {
    return res.status(503).json({ error: 'Server configuration missing' })
  }

  try {
    // Service-role client bypasses RLS so we get all team data without a user JWT
    const supabase = createClient(supabaseUrl, serviceKey)
    const today = new Date().toISOString().split('T')[0]

    const [
      { data: leaderboard, error: lbErr },
      { data: pastMatches,     error: pmErr },
      { data: upcomingMatches, error: umErr },
      { data: scoring,         error: scErr },
    ] = await Promise.all([
      supabase
        .from('player_scores')
        .select('full_name,total_points,total_goals,total_assists,total_wins,total_cs,matches_played')
        .order('total_points', { ascending: false })
        .limit(20),
      supabase
        .from('matches')
        .select('match_date,label')
        .lt('match_date', today)
        .order('match_date', { ascending: false })
        .limit(5),
      supabase
        .from('matches')
        .select('match_date,label')
        .gte('match_date', today)
        .order('match_date', { ascending: true })
        .limit(5),
      supabase
        .from('scoring_settings')
        .select('goal_pts,assist_pts,win_pts,clean_sheet_pts')
        .single(),
    ])

    if (lbErr || pmErr || umErr) {
      console.error('[chat] Supabase errors', { lbErr, pmErr, umErr, scErr })
    }

    let scheduleNote = ''
    try {
      const raw = fs.readFileSync(path.join(process.cwd(), 'next-practice.txt'), 'utf8').trim()
      if (raw) scheduleNote = raw
    } catch {
      // file missing — not a fatal error
    }

    // Build a labeled leaderboard so the model understands every field
    const labeledLeaderboard = (leaderboard ?? []).map((p, i) => ({
      rank: i + 1,
      name: p.full_name,
      total_points: p.total_points,
      goals_scored: p.total_goals,
      assists: p.total_assists,
      team_wins: p.total_wins,
      clean_sheets: p.total_cs,
      sessions_attended: p.matches_played,   // "practices" / "אימונים"
    }))

    const systemPrompt = `You are TeamStep AI, a helpful assistant for a weekly amateur football/soccer training group called TeamStep.

YOUR JOB: Answer questions about player stats, rankings, training sessions, and scoring rules using the live data below.
Always answer in the same language as the question (Hebrew question → Hebrew answer, English question → English answer).
Be concise and use real numbers. Do not invent data.

FIELD GLOSSARY (so you understand the data):
- rank: player's position in the leaderboard
- total_points: cumulative score across all sessions
- goals_scored: total goals the player scored
- assists: total assists
- team_wins: number of sessions their team won
- clean_sheets: number of sessions their team kept a clean sheet
- sessions_attended: how many training sessions / practices the player attended (also called "אימונים" in Hebrew)

If asked about something completely unrelated to football/TeamStep (e.g. geography, cooking), politely decline in the same language.

=== LIVE DATA (as of ${today}) ===

PLAYER LEADERBOARD:
${JSON.stringify(labeledLeaderboard, null, 2)}

PAST SESSIONS (most recent first):
${JSON.stringify(pastMatches ?? [], null, 2)}

UPCOMING SESSIONS (soonest first):
${JSON.stringify(upcomingMatches ?? [], null, 2)}

SCORING RULES (points per event):
${JSON.stringify(scoring ?? {}, null, 2)}

NEXT PRACTICE (admin note):
${scheduleNote || '(no note set)'}
`

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: question.trim() },
        ],
        max_tokens: 500,
        temperature: 0.4,
      }),
    })

    if (!openaiRes.ok) {
      const errText = await openaiRes.text()
      console.error('[chat] OpenAI error:', errText)
      return res.status(502).json({ error: 'AI service unavailable. Please try again.' })
    }

    const openaiData = await openaiRes.json()
    const answer = openaiData.choices?.[0]?.message?.content?.trim()
      ?? 'Sorry, I could not generate a response.'

    return res.status(200).json({ answer })
  } catch (err: any) {
    console.error('[chat] unexpected error:', err)
    return res.status(500).json({ error: err?.message ?? 'Internal server error' })
  }
}
