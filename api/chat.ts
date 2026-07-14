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

    const systemPrompt = `You are TeamStep AI, an intelligent assistant for a weekly amateur football/soccer training group called TeamStep.

SCOPE — only answer questions about:
- Player rankings, total points, goals, assists, clean sheets, attendance (sessions played)
- Upcoming or past training session dates
- Scoring rules (how points are calculated per goal / assist / win / clean sheet)
- Comparisons or "who is the best at X" type questions

OFF-LIMITS — if the question is unrelated to the above topics, respond with exactly one of:
  (English) "I can only answer questions about TeamStep training and player statistics."
  (Hebrew)  "אני יכול לעזור רק עם שאלות על TeamStep ואימוני הקבוצה."

LANGUAGE — detect the language of the question and reply in the same language.
FORMAT — be concise. Use real numbers from the data below. Never invent statistics.

=== LIVE DATA (fetched on ${today}) ===

LEADERBOARD (sorted by total points, rank = position in this list):
${JSON.stringify(leaderboard ?? [], null, 2)}

PAST SESSIONS (most recent first):
${JSON.stringify(pastMatches ?? [], null, 2)}

UPCOMING SESSIONS (soonest first):
${JSON.stringify(upcomingMatches ?? [], null, 2)}

SCORING RULES:
${JSON.stringify(scoring ?? {}, null, 2)}

ADMIN SCHEDULE NOTE (manual entry, may override match table):
${scheduleNote || '(none)'}
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
