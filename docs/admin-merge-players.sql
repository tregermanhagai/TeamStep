-- Run in Supabase SQL editor
-- Merges p_from_id's stats into p_to_id, then deletes p_from_id.
-- Where both players have a report for the same match, the target's report wins.
CREATE OR REPLACE FUNCTION public.admin_merge_players(
  p_from_id uuid,
  p_to_id   uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Remove custom stats for source reports that conflict (same match as target)
  DELETE FROM report_custom_stats
  WHERE report_id IN (
    SELECT r.report_id FROM reports r
    WHERE r.player_id = p_from_id
      AND r.match_id IN (SELECT match_id FROM reports WHERE player_id = p_to_id)
  );

  -- Delete conflicting source reports
  DELETE FROM reports
  WHERE player_id = p_from_id
    AND match_id IN (SELECT match_id FROM reports WHERE player_id = p_to_id);

  -- Move remaining source reports to target player
  UPDATE reports SET player_id = p_to_id WHERE player_id = p_from_id;

  -- Delete the source player record
  DELETE FROM players WHERE player_id = p_from_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_merge_players TO authenticated;
