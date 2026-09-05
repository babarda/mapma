-- MAPMA 0006: first-party visitor analytics.
-- One row per page view, written by the server route /api/track (service role).
-- No personal data: the visitor is a salted hash of (day + IP + user agent)
-- that rotates every day, so a person cannot be followed across days.
-- Run in the Supabase SQL editor (safe to re-run).

create table if not exists public.page_views (
  id            bigint generated always as identity primary key,
  ts            timestamptz not null default now(),
  -- Path without the locale prefix, e.g. "/", "/about", "/upload".
  path          text not null,
  locale        text,
  -- Where the visit came from. referrer_host is null for direct traffic and
  -- for in-site navigation; channel is derived (direct/search/social/ai/paid/
  -- referral/campaign) and only meaningful on session entries.
  referrer_host text,
  channel       text,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  -- ISO 3166 alpha-2 from the Vercel edge header, null in local dev.
  country       text,
  device        text,   -- mobile | tablet | desktop
  visitor_hash  text not null,
  -- True when this view starts a session (no view from the same visitor in
  -- the previous 30 minutes). Sessions are counted from this flag.
  is_entry      boolean not null default false
);

create index if not exists page_views_ts_idx
  on public.page_views (ts desc);

create index if not exists page_views_visitor_recent_idx
  on public.page_views (visitor_hash, ts desc);

alter table public.page_views enable row level security;

-- No policies on purpose: nothing reads or writes this table with the public
-- anon key. The tracker and the admin dashboard both go through server routes
-- that use the service role.

-- Verify:
-- select count(*) as views, count(distinct visitor_hash) as visitors
-- from public.page_views where ts > now() - interval '7 days';
