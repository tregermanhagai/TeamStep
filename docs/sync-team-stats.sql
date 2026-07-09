-- Run this in the Supabase SQL editor.
-- After any player submits a report, call this RPC to propagate the
-- highest team_won / clean_sheet value across all teammates who already reported
-- with the same color in the same match. Values can only increase (MAX), never decrease.

CREATE OR REPLACE FUNCTION public.sync_team_stats(
  p_match_id   uuid,
  p_team_color text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_max_wins int;
  v_max_cs   int;
BEGIN
  -- 'Other' is not a real team; skip sync.
  IF p_team_color = 'Other' THEN RETURN; END IF;

  SELECT MAX(team_won), MAX(clean_sheet)
    INTO v_max_wins, v_max_cs
    FROM public.reports
   WHERE match_id   = p_match_id
     AND team_color = p_team_color;

  UPDATE public.reports
     SET team_won    = v_max_wins,
         clean_sheet = v_max_cs,
         updated_at  = now()
   WHERE match_id   = p_match_id
     AND team_color = p_team_color;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_team_stats TO authenticated;
