-- Seed Cleanup: remove fake players and their data, keep all real players
-- Safe to run at any time — only touches UUIDs that start with f000000x or e000000x

-- Remove seed custom stats (explicit before cascade)
DELETE FROM report_custom_stats
WHERE report_id IN (
  SELECT report_id FROM reports
  WHERE player_id IN (
    'f0000001-0000-0000-0000-000000000000',
    'f0000002-0000-0000-0000-000000000000',
    'f0000003-0000-0000-0000-000000000000',
    'f0000004-0000-0000-0000-000000000000',
    'f0000005-0000-0000-0000-000000000000',
    'f0000006-0000-0000-0000-000000000000'
  )
);

-- Remove seed reports
DELETE FROM reports
WHERE player_id IN (
  'f0000001-0000-0000-0000-000000000000',
  'f0000002-0000-0000-0000-000000000000',
  'f0000003-0000-0000-0000-000000000000',
  'f0000004-0000-0000-0000-000000000000',
  'f0000005-0000-0000-0000-000000000000',
  'f0000006-0000-0000-0000-000000000000'
);

-- Remove seed players
DELETE FROM players
WHERE player_id IN (
  'f0000001-0000-0000-0000-000000000000',
  'f0000002-0000-0000-0000-000000000000',
  'f0000003-0000-0000-0000-000000000000',
  'f0000004-0000-0000-0000-000000000000',
  'f0000005-0000-0000-0000-000000000000',
  'f0000006-0000-0000-0000-000000000000'
);

-- Remove seed matches only if no real reports remain (safe — won't touch real sessions)
DELETE FROM matches
WHERE match_id IN (
  'e0000001-0000-0000-0000-000000000000',
  'e0000002-0000-0000-0000-000000000000',
  'e0000003-0000-0000-0000-000000000000',
  'e0000004-0000-0000-0000-000000000000'
)
AND NOT EXISTS (
  SELECT 1 FROM reports WHERE reports.match_id = matches.match_id
);

RAISE NOTICE 'Seed cleanup complete. Real players preserved.';
