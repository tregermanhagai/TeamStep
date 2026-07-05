-- Run in Supabase SQL editor
-- Saves individual player stats (goals, assists, color) without overwriting team scores.
CREATE OR REPLACE FUNCTION public.admin_save_attendance(
  p_player_id  uuid,
  p_match_date date,
  p_goals      int,
  p_assists    int,
  p_color      text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_match_id uuid;
BEGIN
  v_match_id := find_or_create_match(p_match_date);

  INSERT INTO reports (player_id, match_id, goals, assists, team_color, team_won, clean_sheet, updated_at)
  VALUES (p_player_id, v_match_id, p_goals, p_assists, p_color, 0, 0, now())
  ON CONFLICT (player_id, match_id)
  DO UPDATE SET
    goals      = EXCLUDED.goals,
    assists    = EXCLUDED.assists,
    team_color = EXCLUDED.team_color,
    updated_at = now();
    -- team_won and clean_sheet are intentionally NOT updated here
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_save_attendance TO authenticated;
