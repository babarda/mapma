-- Security hardening: ensure Row-Level Security is enabled on EVERY table in
-- the public schema. The anon key is public (it ships in the browser bundle),
-- so RLS is the only thing protecting table data from direct API access.
--
-- This is safe for MAPMA: all reads/writes go through the server's service-role
-- key, which bypasses RLS. The app never queries tables with the anon key.
--
-- Triggered by a Supabase advisory (rls_disabled_in_public) — most commonly the
-- PostGIS-created public.spatial_ref_sys reference table, which has RLS off by
-- default. Run this in the Supabase SQL editor.

do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security;', r.tablename);
  end loop;
end $$;

-- Verify (every row should show rls_enabled = true):
-- select tablename, rowsecurity as rls_enabled
-- from pg_tables where schemaname = 'public'
-- order by rowsecurity, tablename;
