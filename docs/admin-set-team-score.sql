-- Run in Supabase SQL editor
-- Updates team_won and clean_sheet for all players of a given color on a given date.
CREATE OR REPLACE FUNCTION public.admin_set_team_score(
  p_match_date date,
  p_color      text,
  p_wins       int,
  p_cs         int
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE reports r
  SET team_won    = p_wins,
      clean_sheet = p_cs,
      updated_at  = now()
  FROM matches m
  WHERE r.match_id   = m.match_id
    AND m.match_date = p_match_date
    AND r.team_color = p_color;
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_set_team_score TO authenticated;
