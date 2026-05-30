-- MAPMA initial schema: PostGIS, photos, profiles, categories, verification.
-- Run in the Supabase SQL editor, or via `supabase db push` once the CLI is set up.

create extension if not exists postgis;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type verification_status as enum ('draft', 'pending', 'verified', 'flagged');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text unique,
  full_name   text,
  avatar_url  text,
  role        text not null default 'member',  -- member | moderator | admin
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Photos
-- ---------------------------------------------------------------------------
create table if not exists public.photos (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  description     text,
  image_url       text not null,
  thumbnail_url   text not null,
  -- PostGIS point (lon/lat, SRID 4326). Generated from lng/lat for convenience.
  lng             double precision not null,
  lat             double precision not null,
  geom            geography(Point, 4326)
                    generated always as (st_setsrid(st_makepoint(lng, lat), 4326)::geography) stored,
  city            text not null,
  region          text,
  year            int,
  decade          int generated always as ((year / 10) * 10) stored,
  categories      text[] not null default '{}',
  tags            text[] not null default '{}',
  ai_confidence   real,
  status          verification_status not null default 'pending',
  uploader_id     uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Spatial + filter indexes.
create index if not exists photos_geom_idx     on public.photos using gist (geom);
create index if not exists photos_year_idx     on public.photos (year);
create index if not exists photos_status_idx   on public.photos (status);
create index if not exists photos_city_idx     on public.photos (city);
create index if not exists photos_categories_idx on public.photos using gin (categories);
create index if not exists photos_tags_idx       on public.photos using gin (tags);

-- ---------------------------------------------------------------------------
-- Community verification suggestions
-- ---------------------------------------------------------------------------
create table if not exists public.suggestions (
  id          uuid primary key default gen_random_uuid(),
  photo_id    uuid not null references public.photos (id) on delete cascade,
  author_id   uuid references public.profiles (id) on delete set null,
  field       text not null,        -- e.g. 'year', 'lng', 'lat', 'city', 'description'
  value       text not null,
  note        text,
  resolved    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles    enable row level security;
alter table public.photos      enable row level security;
alter table public.suggestions enable row level security;

-- Profiles: readable by all; users manage their own.
create policy "profiles are public" on public.profiles for select using (true);
create policy "users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "users insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Photos: anyone can read VERIFIED photos; authors see their own in any state.
create policy "verified photos are public" on public.photos for select
  using (status = 'verified' or uploader_id = auth.uid());
create policy "authenticated can insert photos" on public.photos for insert
  with check (auth.uid() = uploader_id);
create policy "authors update own photos" on public.photos for update
  using (uploader_id = auth.uid());

-- Suggestions: public read; any authenticated user can suggest.
create policy "suggestions are public" on public.suggestions for select using (true);
create policy "authenticated can suggest" on public.suggestions for insert
  with check (auth.uid() = author_id);

-- ---------------------------------------------------------------------------
-- Viewport query helper: photos within a bounding box (for map loading).
-- ---------------------------------------------------------------------------
create or replace function public.photos_in_bbox(
  min_lng double precision,
  min_lat double precision,
  max_lng double precision,
  max_lat double precision,
  from_year int default null,
  to_year int default null
)
returns setof public.photos
language sql stable
as $$
  select *
  from public.photos
  where status = 'verified'
    and geom && st_makeenvelope(min_lng, min_lat, max_lng, max_lat, 4326)::geography
    and (from_year is null or year >= from_year)
    and (to_year   is null or year <= to_year);
$$;
