-- Run once in Supabase SQL Editor
-- Creates an RPC that resets all scores for a team (bypasses RLS via SECURITY DEFINER)

CREATE OR REPLACE FUNCTION public.admin_reset_scores(p_team_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Delete custom stats first (FK references reports)
  DELETE FROM report_custom_stats
  WHERE report_id IN (
    SELECT r.report_id FROM reports r
    JOIN matches m ON m.match_id = r.match_id
    WHERE m.team_id = p_team_id
  );

  -- Delete all reports for this team's matches
  DELETE FROM reports
  WHERE match_id IN (
    SELECT match_id FROM matches WHERE team_id = p_team_id
  );

  -- Delete all matches for this team
  DELETE FROM matches WHERE team_id = p_team_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reset_scores TO authenticated;
