-- Admin RPC: create/update a report for any player, bypassing RLS.
-- Run once in Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.admin_upsert_report(
  p_player_id   uuid,
  p_match_date  date,
  p_goals       int  DEFAULT 0,
  p_assists     int  DEFAULT 0,
  p_team_won    int  DEFAULT 0,
  p_clean_sheet int  DEFAULT 0,
  p_team_color  text DEFAULT 'Other'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match_id uuid;
  v_team_id  uuid;
BEGIN
  SELECT team_id INTO v_team_id FROM players WHERE player_id = p_player_id;

  SELECT match_id INTO v_match_id
  FROM matches
  WHERE team_id = v_team_id AND match_date = p_match_date;

  IF v_match_id IS NULL THEN
    INSERT INTO matches (team_id, match_date, label)
    VALUES (v_team_id, p_match_date, TO_CHAR(p_match_date, 'FMDay DD Mon YYYY'))
    RETURNING match_id INTO v_match_id;
  END IF;

  INSERT INTO reports (player_id, match_id, goals, assists, team_won, clean_sheet, team_color)
  VALUES (p_player_id, v_match_id, p_goals, p_assists, p_team_won, p_clean_sheet, p_team_color)
  ON CONFLICT (player_id, match_id) DO UPDATE SET
    goals       = EXCLUDED.goals,
    assists     = EXCLUDED.assists,
    team_won    = EXCLUDED.team_won,
    clean_sheet = EXCLUDED.clean_sheet,
    team_color  = EXCLUDED.team_color,
    updated_at  = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_upsert_report TO authenticated;
