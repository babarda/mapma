-- Adds provenance (source/credit line) and an approximate-year ("circa") flag
-- to photos. Run this in the Supabase SQL editor before publishing with the
-- updated upload form, otherwise inserts referencing these columns will fail.

alter table public.photos
  add column if not exists source           text,
  add column if not exists year_approximate boolean not null default false;
