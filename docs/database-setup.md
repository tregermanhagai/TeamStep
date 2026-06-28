# TeamStep — Supabase Backend Setup Guide

Everything in this guide is done in the **browser** (Supabase dashboard + Google Cloud Console). No code editor needed until the React scaffold step.

---

## Step 1 — Create the Supabase project (~5 min)

1. Go to https://supabase.com → **New project**
2. Name: `teamstep`, region: **eu-central-1 Frankfurt** (closest to Israel)
3. Set a strong database password and save it
4. Wait for provisioning (~1 min)
5. Go to **Project Settings → API** and save:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`

---

## Step 2 — Create the tables

Open **SQL Editor → New query** and run this entire block:

```sql
-- ── PLAYERS ──────────────────────────────────────────────────────────────
CREATE TABLE players (
  player_id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name    text NOT NULL,
  email        text UNIQUE,
  phone        text UNIQUE,
  role         text NOT NULL DEFAULT 'player' CHECK (role IN ('admin', 'player')),
  is_active    boolean NOT NULL DEFAULT true,
  is_blocked   boolean NOT NULL DEFAULT false,
  avatar_type  text NOT NULL DEFAULT 'initials' CHECK (avatar_type IN ('initials', 'gallery', 'photo')),
  avatar_value text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_or_phone CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- ── MATCHES ──────────────────────────────────────────────────────────────
CREATE TABLE matches (
  match_id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_date  date NOT NULL,
  label       text,
  is_locked   boolean NOT NULL DEFAULT false
);

-- ── REPORTS ──────────────────────────────────────────────────────────────
CREATE TABLE reports (
  report_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   uuid NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  match_id    uuid NOT NULL REFERENCES matches(match_id) ON DELETE CASCADE,
  goals       int NOT NULL DEFAULT 0 CHECK (goals BETWEEN 0 AND 5),
  assists     int NOT NULL DEFAULT 0 CHECK (assists BETWEEN 0 AND 5),
  team_won    int NOT NULL DEFAULT 0 CHECK (team_won BETWEEN 0 AND 5),
  clean_sheet int NOT NULL DEFAULT 0 CHECK (clean_sheet BETWEEN 0 AND 5),
  team_color  text CHECK (team_color IN ('Pink', 'Blue', 'Yellow', 'Other')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id, match_id)
);

-- ── SCORING SETTINGS (single row) ────────────────────────────────────────
CREATE TABLE scoring_settings (
  id               int PRIMARY KEY DEFAULT 1,
  goal_pts         int NOT NULL DEFAULT 4 CHECK (goal_pts >= 0),
  assist_pts       int NOT NULL DEFAULT 3 CHECK (assist_pts >= 0),
  win_pts          int NOT NULL DEFAULT 2 CHECK (win_pts >= 0),
  clean_sheet_pts  int NOT NULL DEFAULT 2 CHECK (clean_sheet_pts >= 0),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);
INSERT INTO scoring_settings DEFAULT VALUES;

-- ── ACTIVITY LOG ─────────────────────────────────────────────────────────
CREATE TABLE activity_log (
  log_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   uuid REFERENCES players(player_id) ON DELETE SET NULL,
  event_type  text NOT NULL CHECK (event_type IN (
                'register','login','report','avatar',
                'score_change','block','unblock')),
  details     jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
```

---

## Step 3 — Create the computed views

New query in SQL Editor:

```sql
-- ── PLAYER SCORES (leaderboard — single source of truth) ─────────────────
CREATE OR REPLACE VIEW player_scores AS
SELECT
  p.player_id,
  p.full_name,
  p.avatar_type,
  p.avatar_value,
  COUNT(r.report_id)                           AS matches_played,
  COALESCE(SUM(r.goals),        0)             AS total_goals,
  COALESCE(SUM(r.assists),      0)             AS total_assists,
  COALESCE(SUM(r.team_won),     0)             AS total_wins,
  COALESCE(SUM(r.clean_sheet),  0)             AS total_cs,
  COALESCE(SUM(
    s.goal_pts        * r.goals +
    s.assist_pts      * r.assists +
    s.win_pts         * r.team_won +
    s.clean_sheet_pts * r.clean_sheet
  ), 0)                                        AS total_points
FROM players p
LEFT JOIN reports r  ON r.player_id = p.player_id
CROSS JOIN scoring_settings s
WHERE p.is_active = true AND p.is_blocked = false
GROUP BY
  p.player_id, p.full_name, p.avatar_type, p.avatar_value,
  s.goal_pts, s.assist_pts, s.win_pts, s.clean_sheet_pts
ORDER BY total_points DESC;

-- ── PRACTICE MVP (per-session winner with tie-breaking) ───────────────────
-- Tie-break order: most points → most goals → most assists → co-MVP (multiple rows)
CREATE OR REPLACE VIEW practice_mvp AS
WITH scored AS (
  SELECT
    r.match_id,
    r.player_id,
    r.goals,
    r.assists,
    s.goal_pts * r.goals +
    s.assist_pts * r.assists +
    s.win_pts * r.team_won +
    s.clean_sheet_pts * r.clean_sheet  AS match_pts
  FROM reports r
  CROSS JOIN scoring_settings s
),
ranked AS (
  SELECT *,
    RANK() OVER (
      PARTITION BY match_id
      ORDER BY match_pts DESC, goals DESC, assists DESC
    ) AS rnk
  FROM scored
)
SELECT match_id, player_id, match_pts
FROM ranked
WHERE rnk = 1;
-- Multiple rows per match_id = co-MVPs (intentional per SRS §3.8.1)

-- ── ALL-TIME MVP (title count per player) ────────────────────────────────
CREATE OR REPLACE VIEW all_time_mvp AS
SELECT
  pm.player_id,
  p.full_name,
  p.avatar_type,
  p.avatar_value,
  COUNT(*)          AS mvp_titles,
  ps.total_points
FROM practice_mvp pm
JOIN players       p  ON p.player_id  = pm.player_id
JOIN player_scores ps ON ps.player_id = pm.player_id
GROUP BY pm.player_id, p.full_name, p.avatar_type, p.avatar_value, ps.total_points
ORDER BY mvp_titles DESC, total_points DESC;
```

---

## Step 4 — Enable Row-Level Security

> **Key design decision:** `player_id = auth.uid()` — every player's primary key matches their Supabase Auth UID, assigned at first login. RLS policies therefore need no joins.

```sql
-- Enable RLS on all tables
ALTER TABLE players          ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches           ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports           ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_settings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log      ENABLE ROW LEVEL SECURITY;

-- Admin helper (checks auth.users directly — works before a player row exists)
CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean
  LANGUAGE sql SECURITY DEFINER AS $$
    SELECT EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
        AND email = 'hagai.tregerman@gmail.com'
    );
  $$;

-- PLAYERS
CREATE POLICY "players_read"       ON players FOR SELECT TO authenticated USING (true);
CREATE POLICY "players_insert_own" ON players FOR INSERT TO authenticated WITH CHECK (player_id = auth.uid());
CREATE POLICY "players_update_own" ON players FOR UPDATE TO authenticated USING (player_id = auth.uid());
CREATE POLICY "players_admin_all"  ON players FOR ALL    TO authenticated USING (is_admin());

-- MATCHES
CREATE POLICY "matches_read"        ON matches FOR SELECT TO authenticated USING (true);
CREATE POLICY "matches_admin_write" ON matches FOR ALL    TO authenticated USING (is_admin());

-- REPORTS
CREATE POLICY "reports_read"       ON reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "reports_own_insert" ON reports FOR INSERT TO authenticated WITH CHECK (player_id = auth.uid());
CREATE POLICY "reports_own_update" ON reports FOR UPDATE TO authenticated USING (player_id = auth.uid());
CREATE POLICY "reports_own_delete" ON reports FOR DELETE TO authenticated USING (player_id = auth.uid());

-- SCORING_SETTINGS
CREATE POLICY "scoring_read"        ON scoring_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "scoring_admin_write" ON scoring_settings FOR UPDATE TO authenticated USING (is_admin());

-- ACTIVITY_LOG (admin only)
CREATE POLICY "log_admin_only" ON activity_log FOR ALL TO authenticated USING (is_admin());
```

---

## Step 5 — Avatar Storage bucket

1. Supabase dashboard → **Storage → New bucket**
2. Name: `avatars`, toggle **Public**
3. Add storage policies:

```sql
CREATE POLICY "avatar_upload_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatar_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatar_public_read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');
```

Upload path convention from the React app: `avatars/{player_id}/avatar.jpg`

---

## Step 6 — Google OAuth (~15 min)

### In Google Cloud Console (console.cloud.google.com)

1. New project → name it `TeamStep`
2. **APIs & Services → OAuth consent screen**
   - User type: **External**
   - App name: `TeamStep`, support email: `hagai.tregerman@gmail.com`
   - Scopes: `email`, `profile`, `openid`
3. **Credentials → Create Credentials → OAuth 2.0 Client ID**
   - Type: **Web application**
   - Authorised JavaScript origins: `http://localhost:5173`
   - Authorised redirect URIs: `https://<project-ref>.supabase.co/auth/v1/callback`
     *(find this exact URL in Supabase → Auth → Providers → Google)*
4. Copy **Client ID** and **Client Secret**

### In Supabase dashboard

1. **Authentication → Providers → Google** → Enable
2. Paste Client ID and Client Secret → Save

---

## Step 7 — Auto-create player rows on first login

This trigger fires when any Google user signs in for the first time, creating their player row automatically. Your email gets `role = 'admin'` automatically.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.players (player_id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    CASE WHEN NEW.email = 'hagai.tregerman@gmail.com' THEN 'admin' ELSE 'player' END
  )
  ON CONFLICT (player_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## Step 8 — Verify schema (no data yet)

```sql
SELECT * FROM scoring_settings;       -- 1 row: 4/3/2/2
SELECT * FROM player_scores;          -- 0 rows
SELECT * FROM practice_mvp  LIMIT 1; -- 0 rows, no error
SELECT * FROM all_time_mvp  LIMIT 1; -- 0 rows, no error
```

---

## Step 9 — Seed mock data for testing

> **Note:** SQL Editor runs as `postgres` superuser and bypasses RLS. This is intentional for seeding — the mock players have no real Auth accounts.

Save this as **"Seed mock data"** in Supabase SQL Editor.

```sql
-- 6 mock players
INSERT INTO players (player_id, full_name, email, role, avatar_type) VALUES
  ('11111111-0000-0000-0000-000000000001', 'Steve Cohen',  'steve@test.com',  'player', 'initials'),
  ('11111111-0000-0000-0000-000000000002', 'Daniel Levi',  'daniel@test.com', 'player', 'initials'),
  ('11111111-0000-0000-0000-000000000003', 'Avi Mizrahi',  'avi@test.com',    'player', 'initials'),
  ('11111111-0000-0000-0000-000000000004', 'Ron Shapiro',  'ron@test.com',    'player', 'initials'),
  ('11111111-0000-0000-0000-000000000005', 'Yoni Peretz',  'yoni@test.com',   'player', 'initials'),
  ('11111111-0000-0000-0000-000000000006', 'Tal Friedman', 'tal@test.com',    'player', 'initials');

-- 4 training sessions
INSERT INTO matches (match_id, match_date, label) VALUES
  ('22222222-0000-0000-0000-000000000001', '2026-06-10', 'Tuesday Training'),
  ('22222222-0000-0000-0000-000000000002', '2026-06-17', 'Tuesday Training'),
  ('22222222-0000-0000-0000-000000000003', '2026-06-24', 'Tuesday Training'),
  ('22222222-0000-0000-0000-000000000004', '2026-07-01', 'Tuesday Training');

-- Reports: (goals, assists, team_won, clean_sheet, team_color)
-- Points formula: 4*G + 3*A + 2*W + 2*CS

-- Session 1 – Jun 10  (MVP: Daniel 18pts)
INSERT INTO reports (player_id, match_id, goals, assists, team_won, clean_sheet, team_color) VALUES
  ('11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001', 2,1,2,1,'Blue'),  -- Steve  17
  ('11111111-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000001', 1,2,2,2,'Pink'),  -- Daniel 18 ← MVP
  ('11111111-0000-0000-0000-000000000003','22222222-0000-0000-0000-000000000001', 0,1,1,2,'Blue'),  -- Avi     9
  ('11111111-0000-0000-0000-000000000004','22222222-0000-0000-0000-000000000001', 1,3,2,0,'Pink'),  -- Ron    17
  ('11111111-0000-0000-0000-000000000005','22222222-0000-0000-0000-000000000001', 3,0,1,0,'Blue'),  -- Yoni   14
  ('11111111-0000-0000-0000-000000000006','22222222-0000-0000-0000-000000000001', 0,2,2,1,'Pink');  -- Tal    12

-- Session 2 – Jun 17  (MVP: Steve 23pts)
INSERT INTO reports (player_id, match_id, goals, assists, team_won, clean_sheet, team_color) VALUES
  ('11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000002', 3,1,2,2,'Blue'),  -- Steve  23 ← MVP
  ('11111111-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000002', 1,0,1,0,'Pink'),  -- Daniel  6
  ('11111111-0000-0000-0000-000000000003','22222222-0000-0000-0000-000000000002', 0,0,2,2,'Blue'),  -- Avi     8
  ('11111111-0000-0000-0000-000000000004','22222222-0000-0000-0000-000000000002', 2,2,2,1,'Pink'),  -- Ron    20
  ('11111111-0000-0000-0000-000000000005','22222222-0000-0000-0000-000000000002', 2,1,1,0,'Blue'),  -- Yoni   13
  ('11111111-0000-0000-0000-000000000006','22222222-0000-0000-0000-000000000002', 1,1,2,2,'Pink');  -- Tal    15

-- Session 3 – Jun 24  (MVP: Yoni 22pts)
INSERT INTO reports (player_id, match_id, goals, assists, team_won, clean_sheet, team_color) VALUES
  ('11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000003', 1,2,1,0,'Pink'),  -- Steve  12
  ('11111111-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000003', 2,2,2,1,'Blue'),  -- Daniel 20
  ('11111111-0000-0000-0000-000000000003','22222222-0000-0000-0000-000000000003', 0,1,2,2,'Blue'),  -- Avi    11
  ('11111111-0000-0000-0000-000000000004','22222222-0000-0000-0000-000000000003', 3,1,2,0,'Pink'),  -- Ron    19
  ('11111111-0000-0000-0000-000000000005','22222222-0000-0000-0000-000000000003', 4,0,2,1,'Blue'),  -- Yoni   22 ← MVP
  ('11111111-0000-0000-0000-000000000006','22222222-0000-0000-0000-000000000003', 0,3,1,2,'Pink');  -- Tal    15

-- Session 4 – Jul 1  (MVP: Yoni 19pts — tie with Daniel 19pts, broken by goals 3 vs 1)
INSERT INTO reports (player_id, match_id, goals, assists, team_won, clean_sheet, team_color) VALUES
  ('11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000004', 2,0,2,2,'Yellow'), -- Steve  16
  ('11111111-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000004', 1,3,2,1,'Blue'),   -- Daniel 19
  ('11111111-0000-0000-0000-000000000003','22222222-0000-0000-0000-000000000004', 0,0,1,1,'Yellow'), -- Avi     4
  ('11111111-0000-0000-0000-000000000004','22222222-0000-0000-0000-000000000004', 2,2,1,0,'Blue'),   -- Ron    16
  ('11111111-0000-0000-0000-000000000005','22222222-0000-0000-0000-000000000004', 3,1,2,0,'Yellow'), -- Yoni   19 ← MVP
  ('11111111-0000-0000-0000-000000000006','22222222-0000-0000-0000-000000000004', 1,2,2,2,'Blue');   -- Tal    18
```

---

## Step 10 — Simulation queries

Save each as a named query in Supabase SQL Editor for easy re-use during development.

**"Sim: Leaderboard"** — expected order: Ron 72 > Steve 68 = Yoni 68 > Daniel 63 > Tal 60 > Avi 32
```sql
SELECT full_name, matches_played, total_goals, total_assists,
       total_wins, total_cs, total_points
FROM player_scores
ORDER BY total_points DESC;
```

**"Sim: Per-match MVP"** — expected: Daniel(Jun10), Steve(Jun17), Yoni(Jun24), Yoni(Jul1)
```sql
SELECT m.match_date, p.full_name AS mvp, pm.match_pts
FROM practice_mvp pm
JOIN players p ON p.player_id = pm.player_id
JOIN matches m ON m.match_id  = pm.match_id
ORDER BY m.match_date DESC;
```

**"Sim: All-time MVP"** — expected: Yoni 2 titles, Steve 1, Daniel 1
```sql
SELECT full_name, mvp_titles, total_points
FROM all_time_mvp;
```

**"Sim: One player's history"** — change the UUID to test any player
```sql
SELECT m.match_date, r.goals, r.assists, r.team_won, r.clean_sheet, r.team_color,
       s.goal_pts*r.goals + s.assist_pts*r.assists +
       s.win_pts*r.team_won + s.clean_sheet_pts*r.clean_sheet AS match_pts
FROM reports r
JOIN matches m ON m.match_id = r.match_id
CROSS JOIN scoring_settings s
WHERE r.player_id = '11111111-0000-0000-0000-000000000001'  -- Steve
ORDER BY m.match_date;
```

**"Sim: Scoring change impact"** — verify that changing a multiplier re-ranks everyone
```sql
UPDATE scoring_settings SET goal_pts = 5 WHERE id = 1;
SELECT full_name, total_points FROM player_scores ORDER BY total_points DESC;
-- Reset after testing:
UPDATE scoring_settings SET goal_pts = 4 WHERE id = 1;
```

---

## Step 11 — Reset DB for production

Save as **"RESET — clear all data"** in Supabase SQL Editor.

Wipes all players, matches, reports and log entries. Schema, views, RLS policies, trigger and scoring defaults survive untouched.

```sql
TRUNCATE TABLE activity_log, reports, matches, players CASCADE;

-- Confirm everything is empty
SELECT 'players'      AS tbl, COUNT(*) FROM players
UNION ALL
SELECT 'matches',              COUNT(*) FROM matches
UNION ALL
SELECT 'reports',              COUNT(*) FROM reports
UNION ALL
SELECT 'activity_log',         COUNT(*) FROM activity_log;

-- Scoring settings are preserved (not truncated)
SELECT * FROM scoring_settings;
```

After reset, the next Google login triggers `handle_new_user` and creates the first real player row. Your email gets `role = 'admin'` automatically.

---

## Verification Checklist

### Schema
- [ ] `scoring_settings` has 1 row: goal_pts=4, assist_pts=3, win_pts=2, clean_sheet_pts=2
- [ ] All 5 tables exist with correct columns
- [ ] All 3 views return without error
- [ ] RLS is ON for all 5 tables

### Auth & Storage
- [ ] `avatars` bucket is public
- [ ] Google OAuth is enabled in Supabase Auth
- [ ] First Google login creates a row in `players` with the correct `role`

### Mock data
- [ ] `player_scores`: Ron #1 with 72 pts
- [ ] `practice_mvp`: Daniel, Steve, Yoni, Yoni
- [ ] `all_time_mvp`: Yoni 2 titles
- [ ] Changing `goal_pts` to 5 reorders the leaderboard; reset to 4 restores it

### Reset
- [ ] Reset query leaves all 4 tables empty
- [ ] `scoring_settings` still has its default row after reset
