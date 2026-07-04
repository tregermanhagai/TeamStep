-- Run once in Supabase SQL Editor
-- Creates an RPC that deletes a player and all their associated data

CREATE OR REPLACE FUNCTION public.admin_delete_player(p_player_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Delete custom stats for this player's reports
  DELETE FROM report_custom_stats
  WHERE report_id IN (
    SELECT report_id FROM reports WHERE player_id = p_player_id
  );

  -- Delete all reports for this player
  DELETE FROM reports WHERE player_id = p_player_id;

  -- Delete the player record
  DELETE FROM players WHERE player_id = p_player_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_player TO authenticated;
