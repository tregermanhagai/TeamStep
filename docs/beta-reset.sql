-- Beta Reset: keep hagai1973@gmail.com as admin, clear everything else
-- Run ONCE before sending the app link to players
-- ⚠️  Never run this after real players have signed up — it deletes everyone except hagai.

DO $$
DECLARE
  v_hagai_id UUID;
BEGIN
  SELECT id INTO v_hagai_id FROM auth.users WHERE email = 'hagai1973@gmail.com';

  IF v_hagai_id IS NULL THEN
    RAISE EXCEPTION 'hagai1973@gmail.com not found in auth.users';
  END IF;

  -- Clear all match data (reports cascade)
  DELETE FROM report_custom_stats;
  DELETE FROM reports;
  DELETE FROM matches;

  -- Remove all players except hagai
  DELETE FROM players WHERE player_id != v_hagai_id;

  -- Ensure hagai is admin
  UPDATE players SET role = 'admin' WHERE player_id = v_hagai_id;

  -- Clear activity log if present
  DELETE FROM activity_log;

  RAISE NOTICE 'Beta reset complete. Kept player: %', v_hagai_id;
END $$;
