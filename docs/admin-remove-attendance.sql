-- Run in Supabase SQL editor
-- Deletes a player's report for a specific date (admin only).
CREATE OR REPLACE FUNCTION public.admin_remove_attendance(
  p_player_id  uuid,
  p_match_date date
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_match_id uuid;
BEGIN
  SELECT match_id INTO v_match_id
  FROM matches
  WHERE match_date = p_match_date
  LIMIT 1;

  IF v_match_id IS NOT NULL THEN
    DELETE FROM reports
    WHERE player_id = p_player_id
      AND match_id  = v_match_id;
  END IF;
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_remove_attendance TO authenticated;
