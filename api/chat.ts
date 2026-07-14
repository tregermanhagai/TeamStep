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

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  const openaiKey   = process.env.OPENAI_API_KEY

  if (!supabaseUrl || !serviceKey || !openaiKey) {
    return res.status(503).json({ error: 'Server configuration missing' })
  }

  try {
    const today = new Date().toISOString().split('T')[0]

    // Use direct REST fetch with service role key — most reliable in serverless context
    const sbHeaders = {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    }

    const [playersRes, reportsRes, scoringRes, pastRes, upcomingRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/players?select=player_id,full_name`, { headers: sbHeaders }),
      fetch(`${supabaseUrl}/rest/v1/reports?select=player_id,goals,assists,team_won,clean_sheet`, { headers: sbHeaders }),
      fetch(`${supabaseUrl}/rest/v1/scoring_settings?select=goal_pts,assist_pts,win_pts,clean_sheet_pts&limit=1`, { headers: sbHeaders }),
      fetch(`${supabaseUrl}/rest/v1/matches?select=match_date,label&match_date=lt.${today}&order=match_date.desc&limit=5`, { headers: sbHeaders }),
      fetch(`${supabaseUrl}/rest/v1/matches?select=match_date,label&match_date=gte.${today}&order=match_date.asc&limit=5`, { headers: sbHeaders }),
    ])

    const [players, reports, scoringRows, pastMatches, upcomingMatches] = await Promise.all([
      playersRes.json(),
      reportsRes.json(),
      scoringRes.json(),
      pastRes.json(),
      upcomingRes.json(),
    ])

    const fetchErrors = [
      !playersRes.ok && `players: ${playersRes.status} ${JSON.stringify(players)}`,
      !reportsRes.ok && `reports: ${reportsRes.status} ${JSON.stringify(reports)}`,
      !scoringRes.ok && `scoring: ${scoringRes.status}`,
    ].filter(Boolean)

    if (fetchErrors.length) {
      console.error('[chat] REST errors:', fetchErrors)
    }

    const scoring = Array.isArray(scoringRows) ? (scoringRows[0] ?? null) : null

    // Aggregate per-player stats in JS
    const statsMap: Record<string, {
      name: string; goals: number; assists: number
      wins: number; cs: number; sessions: number; points: number
    }> = {}

    for (const p of (Array.isArray(players) ? players : [])) {
      statsMap[p.player_id] = {
        name: p.full_name, goals: 0, assists: 0, wins: 0, cs: 0, sessions: 0, points: 0,
      }
    }

    for (const r of (Array.isArray(reports) ? reports : [])) {
      const s = statsMap[r.player_id]
      if (!s) continue
      const g = r.goals ?? 0
      const a = r.assists ?? 0
      const w = r.team_won ?? 0
      const c = r.clean_sheet ?? 0
      s.goals   += g
      s.assists += a
      s.wins    += w
      s.cs      += c
      s.sessions += 1
      if (scoring) {
        s.points += g * scoring.goal_pts + a * scoring.assist_pts
          + w * scoring.win_pts + c * scoring.clean_sheet_pts
      }
    }

    const leaderboard = Object.values(statsMap)
      .sort((a, b) => b.points - a.points)
      .map((s, i) => ({
        rank: i + 1,
        name: s.name,
        total_points: s.points,
        goals_scored: s.goals,
        assists: s.assists,
        team_wins: s.wins,
        clean_sheets: s.cs,
        sessions_attended: s.sessions,
      }))

    const dataStatus = fetchErrors.length
      ? `ERRORS: ${fetchErrors.join('; ')}`
      : `${leaderboard.length} players loaded`

    let scheduleNote = ''
    try {
      const raw = fs.readFileSync(path.join(process.cwd(), 'next-practice.txt'), 'utf8').trim()
      if (raw) scheduleNote = raw
    } catch {
      // file missing — not fatal
    }

    const systemPrompt = `You are TeamStep AI, a helpful assistant for a weekly amateur football/soccer training group called TeamStep.

YOUR JOB: Answer questions about player stats, rankings, training sessions, and scoring rules using the live data below.
Always answer in the same language as the question (Hebrew question → Hebrew answer, English question → English answer).
Be concise and use real numbers. Do not invent data.

FIELD GLOSSARY:
- total_points: cumulative score across all sessions
- goals_scored: total goals scored
- assists: total assists
- team_wins: number of sessions their team won
- clean_sheets: number of clean sheets
- sessions_attended: how many training sessions / practices the player attended (Hebrew: "אימונים")

If asked about something completely unrelated to football/TeamStep, politely decline in the same language.

=== LIVE DATA (as of ${today}) ===

PLAYER LEADERBOARD (${dataStatus}):
${JSON.stringify(leaderboard, null, 2)}

PAST SESSIONS:
${JSON.stringify(Array.isArray(pastMatches) ? pastMatches : [], null, 2)}

UPCOMING SESSIONS:
${JSON.stringify(Array.isArray(upcomingMatches) ? upcomingMatches : [], null, 2)}

SCORING RULES:
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
