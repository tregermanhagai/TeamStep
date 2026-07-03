-- Fix: handle_new_user trigger was failing with NOT NULL violations on
-- full_name and team_id. New players have no team yet so team_id must be nullable.

-- Step 1: make team_id nullable (new players have no team yet)
ALTER TABLE public.players ALTER COLUMN team_id DROP NOT NULL;

-- Step 2: replace trigger with robust COALESCE fallback for full_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.players (player_id, email, phone, full_name, role)
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
    'player'
  )
  ON CONFLICT (player_id) DO NOTHING;
  RETURN NEW;
END;
$$;
