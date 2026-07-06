-- Run in Supabase SQL editor
-- Uses a synthetic marker email to satisfy the email/phone check constraint.
-- Manual players are identified by email ending in @teamstep.local
CREATE OR REPLACE FUNCTION public.admin_add_player(
  p_full_name text,
  p_team_id   uuid
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO players (player_id, full_name, team_id, role, is_active, email)
  VALUES (v_id, p_full_name, p_team_id, 'player', true,
          'manual+' || v_id::text || '@teamstep.local');
  RETURN v_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_add_player TO authenticated;
