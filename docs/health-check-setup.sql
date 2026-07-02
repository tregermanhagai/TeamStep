-- One-time setup for the /api/health endpoint
-- Run once in the Supabase SQL Editor, then never again

CREATE OR REPLACE FUNCTION public.health_check()
RETURNS json LANGUAGE sql SECURITY DEFINER AS $$
  SELECT json_build_object('ok', true, 'ts', now()::text)
$$;

GRANT EXECUTE ON FUNCTION public.health_check() TO anon;
