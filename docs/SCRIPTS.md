# TeamStep — SQL Scripts & Production Checklist

---

## 1. Reset All Data (clean slate)

Wipes all game data. Schema, views, RLS policies, and scoring defaults are **preserved**.

```sql
TRUNCATE TABLE activity_log, reports, matches, players CASCADE;

-- Confirm empty
SELECT 'players'      AS tbl, COUNT(*) FROM players
UNION ALL
SELECT 'matches',              COUNT(*) FROM matches
UNION ALL
SELECT 'reports',              COUNT(*) FROM reports
UNION ALL
SELECT 'activity_log',         COUNT(*) FROM activity_log;

-- scoring_settings is untouched (still 4/3/2/2)
SELECT * FROM scoring_settings;
```

> After reset, the next person to sign in with Google triggers `handle_new_user` and their player row is auto-created.

---

## 2. Seed Mock Data (for development / testing)

Run **after** the reset script above.

```sql
-- PLAYERS
INSERT INTO players (player_id, team_id, full_name, email, role, avatar_type) VALUES
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Steve Cohen',  'steve@test.com',  'player', 'initials'),
  ('11111111-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Daniel Levi',  'daniel@test.com', 'player', 'initials'),
  ('11111111-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'Avi Mizrahi',  'avi@test.com',    'player', 'initials'),
  ('11111111-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 'Ron Shapiro',  'ron@test.com',    'player', 'initials'),
  ('11111111-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001', 'Yoni Peretz',  'yoni@test.com',   'player', 'initials'),
  ('11111111-0000-0000-0000-000000000006', 'aaaaaaaa-0000-0000-0000-000000000001', 'Tal Friedman', 'tal@test.com',    'player', 'initials');

-- MATCHES
INSERT INTO matches (match_id, team_id, match_date, label) VALUES
  ('22222222-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '2026-06-10', 'Tuesday Training'),
  ('22222222-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', '2026-06-17', 'Tuesday Training'),
  ('22222222-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', '2026-06-24', 'Tuesday Training'),
  ('22222222-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', '2026-07-01', 'Tuesday Training');

-- REPORTS (goals, assists, team_won, clean_sheet, team_color)
INSERT INTO reports (player_id, match_id, goals, assists, team_won, clean_sheet, team_color) VALUES
  -- Jun 10
  ('11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001',2,1,2,1,'Blue'),
  ('11111111-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000001',1,2,2,2,'Pink'),
  ('11111111-0000-0000-0000-000000000003','22222222-0000-0000-0000-000000000001',0,1,1,2,'Blue'),
  ('11111111-0000-0000-0000-000000000004','22222222-0000-0000-0000-000000000001',1,3,2,0,'Pink'),
  ('11111111-0000-0000-0000-000000000005','22222222-0000-0000-0000-000000000001',3,0,1,0,'Blue'),
  ('11111111-0000-0000-0000-000000000006','22222222-0000-0000-0000-000000000001',0,2,2,1,'Pink'),
  -- Jun 17
  ('11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000002',3,1,2,2,'Blue'),
  ('11111111-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000002',1,0,1,0,'Pink'),
  ('11111111-0000-0000-0000-000000000003','22222222-0000-0000-0000-000000000002',0,0,2,2,'Blue'),
  ('11111111-0000-0000-0000-000000000004','22222222-0000-0000-0000-000000000002',2,2,2,1,'Pink'),
  ('11111111-0000-0000-0000-000000000005','22222222-0000-0000-0000-000000000002',2,1,1,0,'Blue'),
  ('11111111-0000-0000-0000-000000000006','22222222-0000-0000-0000-000000000002',1,1,2,2,'Pink'),
  -- Jun 24
  ('11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000003',1,2,1,0,'Pink'),
  ('11111111-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000003',2,2,2,1,'Blue'),
  ('11111111-0000-0000-0000-000000000003','22222222-0000-0000-0000-000000000003',0,1,2,2,'Blue'),
  ('11111111-0000-0000-0000-000000000004','22222222-0000-0000-0000-000000000003',3,1,2,0,'Pink'),
  ('11111111-0000-0000-0000-000000000005','22222222-0000-0000-0000-000000000003',4,0,2,1,'Blue'),
  ('11111111-0000-0000-0000-000000000006','22222222-0000-0000-0000-000000000003',0,3,1,2,'Pink'),
  -- Jul 1
  ('11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000004',2,0,2,2,'Yellow'),
  ('11111111-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000004',1,3,2,1,'Blue'),
  ('11111111-0000-0000-0000-000000000003','22222222-0000-0000-0000-000000000004',0,0,1,1,'Yellow'),
  ('11111111-0000-0000-0000-000000000004','22222222-0000-0000-0000-000000000004',2,2,1,0,'Blue'),
  ('11111111-0000-0000-0000-000000000005','22222222-0000-0000-0000-000000000004',3,1,2,0,'Yellow'),
  ('11111111-0000-0000-0000-000000000006','22222222-0000-0000-0000-000000000004',1,2,2,2,'Blue');
```

**Expected leaderboard after seeding (default 4/3/2/2 scoring):**

| # | Player | Points | Goals | Assists | Wins |
|---|--------|--------|-------|---------|------|
| 1 | Ron Shapiro | 72 | 8 | 8 | 7 |
| 2 | Steve Cohen | 68 | 8 | 4 | 7 |
| 3 | Yoni Peretz | 68 | 12 | 2 | 6 |
| 4 | Daniel Levi | 63 | 5 | 7 | 7 |
| 5 | Tal Friedman | 60 | 2 | 8 | 7 |
| 6 | Avi Mizrahi | 32 | 0 | 2 | 6 |

---

## 3. Fix: Insert Your Admin Row After a Reset

If your player row is missing after a reset (you see 406/403 errors on login), run this in SQL Editor — replace with your actual auth UUID and email:

```sql
-- Find your auth UUID first:
SELECT id, email FROM auth.users;

-- Then insert your player row:
INSERT INTO players (player_id, team_id, full_name, email, role, avatar_type)
VALUES (
  '<your-auth-uuid>',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Hagai Tregerman',
  'hagai1973@gmail.com',
  'admin',
  'initials'
)
ON CONFLICT (player_id) DO NOTHING;
```

---

## 4. Fix: Update the `handle_new_user` Trigger

Run this once to ensure future Google logins auto-create a player row with `team_id`:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.players (player_id, team_id, full_name, email, role)
  VALUES (
    NEW.id,
    'aaaaaaaa-0000-0000-0000-000000000001',
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    CASE WHEN NEW.email = 'hagai1973@gmail.com' THEN 'admin' ELSE 'player' END
  )
  ON CONFLICT (player_id) DO NOTHING;
  RETURN NEW;
END;
$$;
```

---

## 5. Production Checklist

### Supabase
- [ ] Run **Reset** script to wipe all mock/test data
- [ ] Confirm `scoring_settings` still has 1 row (4/3/2/2)
- [ ] Confirm `player_scores`, `practice_mvp`, `all_time_mvp` views return without error
- [ ] Run updated `handle_new_user` trigger (Section 4 above)
- [ ] Google OAuth redirect URL includes your production domain in Supabase → Auth → URL Configuration

### App
- [ ] Create `.env.production` with real `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [ ] Set `VITE_DEFAULT_LOCALE=he` (or `en`) for the default language
- [ ] Run `npm run build` — confirm no errors
- [ ] Deploy `dist/` folder to your hosting provider (Vercel, Netlify, etc.)

### Google Cloud Console
- [ ] Add production domain to **Authorised JavaScript origins**
- [ ] Add `https://<your-domain>/` to **Authorised redirect URIs** (or keep using the Supabase callback URL)

### Go-live
- [ ] Sign in with your Google account → confirm admin role
- [ ] Share the URL with your group
- [ ] First player to sign in gets their row auto-created via the trigger
