# TeamStep — Football Training Performance Tracker

A trust-based stat tracking and leaderboard app for weekly football (soccer) training groups.

## What It Does

Players self-report their match stats after each training session (goals, assists, wins, clean sheets). The app automatically calculates points, ranks every player on a live leaderboard, and tracks each person's progress over time with charts.

- **Personal dashboard** — points chart over time, per-session stat history
- **Group leaderboard** — all-time and per-session rankings with animated rank changes
- **MVP system** — session MVP (highest scorer that day) and all-time MVP title count
- **Per-practice drilldown** — click any session date to see the full ranked breakdown
- **Avatar gallery** — players pick a cartoon avatar or upload a photo

## Tech Stack

| Layer | Choice |
|-------|--------|
| Language | TypeScript |
| Front-end | React + Vite |
| Styling | Tailwind CSS |
| Animation | Framer Motion |
| Charts | Recharts |
| Backend | Supabase (PostgreSQL + Auth + RLS + Storage) |
| Hosting | Vercel |

## Scoring Formula

```
points = 4×Goals + 3×Assists + 2×GamesWon + 2×CleanSheets
```

All four multipliers are admin-editable from the UI. Points are computed in a database view — never in client code.

## User Roles

| Role | Who | Can Do |
|------|-----|--------|
| Admin | hagai.tregerman@gmail.com | Add/edit/block players, create sessions, edit scoring rules, view activity log |
| Player | Any registered member | Submit own stats, view leaderboard and personal dashboard |

Login is Google OAuth. Admin is detected by the verified Google email.

## Screens

**Player screens**
- `/leaderboard` — home screen, animated ranked list
- `/stats` — personal dashboard with progress chart
- `/report` — submit stats for a session
- `/player/:id` — any player's read-only profile
- `/practice/:matchId` — one session's full ranked breakdown

**Admin screens**
- `/admin/roster` — add / edit / block players, create sessions
- `/admin/scoring` — edit point multipliers with retroactive preview
- `/admin/log` — activity log (logins, submissions, changes)

## Project Structure (after scaffolding)

```
public/
  avatars/         ← default avatar gallery images
src/
  lib/
    supabase.ts    ← single Supabase client instance
  hooks/           ← useSession, useLeaderboard, usePlayerDashboard …
  pages/           ← one file per screen
  components/      ← Avatar, StatChips, LeaderboardRow, PerformanceChart …
docs/
  database-setup.md   ← Supabase backend setup guide (start here)
  TeamStep_SRS_v1.0.pdf
```

## Database Views

All computed data comes from server-side views — clients read results, never submit computed values.

| View | Purpose |
|------|---------|
| `player_scores` | Total points, goals, assists, wins, clean sheets per player |
| `practice_mvp` | Top scorer per session (with goals/assists tie-breaking) |
| `all_time_mvp` | MVP title count per player, sorted by titles then total points |

## Getting Started

**Step 1 — Set up the Supabase backend**
Follow [docs/database-setup.md](docs/database-setup.md) completely before writing any code.
It covers tables, views, RLS policies, Google OAuth, mock data, and the reset script.

**Step 2 — Scaffold the React app**
```bash
npm create vite@latest . -- --template react-ts
npm install @supabase/supabase-js react-router-dom framer-motion recharts
```

Copy the example env file and fill in your Supabase keys:
```bash
cp .env.example .env.local
```
Then edit `.env.local` — values are in **Supabase → Project Settings → API**.
`.env.local` is git-ignored and will never be committed.

**Step 3 — Connect Supabase**
```ts
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

## SRS Reference

Full requirements are in [docs/TeamStep_SRS_v1.0.pdf](docs/TeamStep_SRS_v1.0.pdf).
