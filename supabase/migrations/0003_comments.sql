-- MAPMA 0003: photo comments + reuse of profiles.username as a public display
-- name. Run in the Supabase SQL editor (safe to re-run — guarded with IF NOT
-- EXISTS / drop-and-recreate policies).

-- ---------------------------------------------------------------------------
-- Comments (public read; writes go through the server API only)
-- ---------------------------------------------------------------------------
create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  photo_id    uuid not null references public.photos (id) on delete cascade,
  -- Author is optional: comments are open to guests. When signed in we store
  -- the user id so a contributor could later manage their own comments.
  author_id   uuid references public.profiles (id) on delete set null,
  -- The public display name shown next to the comment (guest-entered name, or
  -- the signed-in user's chosen display name). Null => "Anonymous".
  author_name text,
  body        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists comments_photo_idx
  on public.comments (photo_id, created_at);

alter table public.comments enable row level security;

-- Public can READ all comments.
drop policy if exists "comments are public" on public.comments;
create policy "comments are public" on public.comments for select using (true);

-- No anon/authenticated INSERT policy on purpose: all comment creation flows
-- through the server route (service_role), which bypasses RLS and applies
-- validation, a honeypot, and rate limiting. This stops bots from spamming the
-- table directly with the public anon key while keeping comments open to all.

-- ---------------------------------------------------------------------------
-- Display name: profiles.username already exists (see 0001). No schema change
-- needed — it is now surfaced publicly as the contributor's credit and is
-- editable from the profile page. Ensure it stays unique-friendly.
-- ---------------------------------------------------------------------------
-- (profiles.username is already `text unique` from 0001_init.sql.)
