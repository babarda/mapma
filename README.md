# MAPMA — Morocco's Photographic Memory

A digital archive of Morocco's collective memory. Upload historical photographs,
let AI suggest the location/era/context, and explore the country through time on
an interactive map.

> **Status:** Foundation + interactive map. Upload, AI extraction, and auth come next.

## Stack

- **Next.js 14 (App Router) + TypeScript + TailwindCSS** — UI, museum aesthetic
- **MapLibre GL** via `react-map-gl` — interactive map with clustering
- **MapTiler** tiles (falls back to free **OpenFreeMap** when no key is set)
- **Supabase** (Postgres + PostGIS + Auth) — data & accounts
- **Cloudflare R2** — image storage (zero egress)
- **Google Gemini Flash** — AI vision metadata extraction
- **Vercel** — hosting

## Prerequisites

- **Node.js 20 LTS or newer** (not currently installed on this machine).
  Install from <https://nodejs.org/> or `winget install OpenJS.NodeJS.LTS`.

## Getting started

```bash
npm install
cp .env.example .env.local   # optional: the map renders with no keys
npm run dev                  # http://localhost:3000
```

The map works **immediately with zero configuration** using free OpenFreeMap
tiles and built-in seed photos. Add a `NEXT_PUBLIC_MAPTILER_KEY` to upgrade to
the sepia "museum" tile style.

## Environment variables

See [`.env.example`](.env.example). All keys are optional for the map; they are
required as each feature is wired up (Supabase for data/auth, R2 for uploads,
Gemini for AI extraction).

## Database

Apply the schema in [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
via the Supabase SQL editor. It enables PostGIS and creates `photos`, `profiles`,
and `suggestions` tables with row-level security and a `photos_in_bbox()` helper
for viewport-based map loading.

## Project structure

```
src/
  app/
    layout.tsx              # fonts (Playfair Display + Inter), metadata
    page.tsx                # full-screen map homepage (reads seed data)
    globals.css             # museum theme + MapLibre popup styling
  components/
    map/MoroccoMap.tsx      # MapLibre map: clustering, popups, navigation
    explore/
      ExploreClient.tsx     # search + category + timeline state, filters photos
      TimelineFilter.tsx    # year range slider
  data/samplePhotos.ts      # seed photos across 7 Moroccan cities
  lib/
    types.ts                # Photo / Category domain types
    mapStyle.ts             # MapTiler ↔ OpenFreeMap style resolution + viewport
    supabase/{client,server}.ts  # browser (anon) + server (service role) clients
    utils.ts                # cn() class helper
supabase/migrations/0001_init.sql  # PostGIS schema + RLS
```

## Roadmap (next sessions)

1. **Auth** — Supabase email/OAuth, profile creation
2. **Upload flow** — drag-drop → R2 storage → thumbnail generation
3. **AI extraction** — Gemini Vision route returning location/year/description/tags
4. **Validation UI** — review/approve/edit AI suggestions before publish
5. **Live data** — swap seed data for `photos_in_bbox()` viewport queries
6. **Moderation** — pending → verified workflow, community suggestions
