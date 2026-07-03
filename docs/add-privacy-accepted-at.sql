-- Run once in Supabase SQL Editor before Beta launch
ALTER TABLE players ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMPTZ;
