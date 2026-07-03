-- Fix: handle_new_user trigger + ensure_player_exists RPC
-- Auto-assigns all new players to the single team (Israel Team 1).

-- Step 1: backfill existing NULL team_ids FIRST (must come before SET NOT NULL)
UPDATE public.players
SET team_id = 'aaaaaaaa-0000-0000-0000-000000000001'
WHERE team_id IS NULL;

-- Step 2: restore NOT NULL on team_id (now safe — no nulls remain)
ALTER TABLE public.players ALTER COLUMN team_id SET NOT NULL;

-- Step 3: replace trigger — always assigns default team
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
BEGIN
  INSERT INTO public.players (player_id, email, phone, full_name, role, team_id)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
      NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
      NEW.phone,
      SPLIT_PART(COALESCE(NEW.email, ''), '@', 1),
      'New Player'
    ),
    'player',
    v_team_id
  )
  ON CONFLICT (player_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Step 4: replace ensure_player_exists RPC — also assigns default team
CREATE OR REPLACE FUNCTION public.ensure_player_exists(
  p_full_name text,
  p_email     text DEFAULT NULL,
  p_phone     text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
BEGIN
  INSERT INTO public.players (player_id, email, phone, full_name, role, team_id)
  VALUES (
    auth.uid(),
    p_email,
    p_phone,
    COALESCE(NULLIF(TRIM(p_full_name), ''), 'New Player'),
    'player',
    v_team_id
  )
  ON CONFLICT (player_id) DO NOTHING;
END;
$$;

