"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search, Upload } from "lucide-react";

import type { Category, Photo } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";
import { YEAR_MAX, YEAR_MIN } from "@/data/samplePhotos";
import { cn } from "@/lib/utils";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { authEnabled, useUser } from "@/lib/useUser";
import Logo from "@/components/Logo";
import TimelineFilter from "./TimelineFilter";

// MapLibre touches `window` at import time, so load the map client-only.
const MoroccoMap = dynamic(() => import("@/components/map/MoroccoMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-sepia-100 text-sepia-700">
      Loading map…
    </div>
  ),
});

interface Props {
  photos: Photo[];
}

export default function ExploreClient({ photos }: Props) {
  const { user } = useUser();
  const [query, setQuery] = useState("");
  const [range, setRange] = useState({ from: YEAR_MIN, to: YEAR_MAX });
  const [activeCategories, setActiveCategories] = useState<Set<Category>>(
    new Set(),
  );
  const [featured, setFeatured] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return photos.filter((p) => {
      if (p.year != null && (p.year < range.from || p.year > range.to)) {
        return false;
      }
      if (activeCategories.size > 0) {
        const hit = p.categories.some((c) => activeCategories.has(c));
        if (!hit) return false;
      }
      if (q) {
        const haystack = [
          p.title,
          p.description ?? "",
          p.city,
          p.region ?? "",
          ...p.tags,
          ...p.categories,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [photos, query, range, activeCategories]);

  // Keep the featured index valid as the filtered set changes.
  useEffect(() => {
    setFeatured(0);
  }, [query, range, activeCategories]);

  const featuredPhoto = filtered[featured] ?? null;

  function toggleCategory(c: Category) {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }

  function step(dir: 1 | -1) {
    if (filtered.length === 0) return;
    setFeatured((i) => (i + dir + filtered.length) % filtered.length);
  }

  return (
    <div className="flex h-dvh w-full flex-col overflow-x-hidden bg-parchment lg:flex-row">
      {/* ---------------- Left content panel ---------------- */}
      <aside className="flex w-full flex-col gap-5 overflow-y-auto border-b border-sepia-200 p-6 lg:w-[34%] lg:max-w-md lg:border-b-0 lg:border-r">
        <div className="flex items-start justify-between gap-3">
          <Link href="/" aria-label="MAPMA home" className="shrink-0">
            <Logo size={30} tagline />
          </Link>
          <nav className="flex min-w-0 flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs">
            <Link href="/about" className="text-sepia-700 hover:text-sepia-900">
              About
            </Link>
            <Link href="/contribute" className="text-sepia-700 hover:text-sepia-900">
              Contribute
            </Link>
            {authEnabled && user ? (
              <>
                <Link
                  href="/profile"
                  className="inline-block max-w-[120px] truncate align-middle text-sepia-700 hover:text-sepia-900"
                  title={user.email ?? ""}
                >
                  {user.email}
                </Link>
                <button
                  onClick={() => getSupabaseBrowser()?.auth.signOut()}
                  className="rounded-full bg-sepia-100 px-3 py-1 text-sepia-800 hover:bg-sepia-200"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sepia-700 hover:text-sepia-900">
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-full bg-sepia-100 px-3 py-1 text-sepia-800 hover:bg-sepia-200"
                >
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>

        <div>
          <h2 className="font-display text-2xl leading-tight text-ink">
            Mapping Morocco&apos;s Past
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink/70">
            Explore the map and discover historical photographs from across
            Morocco. Upload your own vintage images and help preserve the
            country&apos;s collective memory.
          </p>
        </div>

        {/* Primary call to action */}
        <Link
          href="/upload"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-sepia-700 px-4 py-2.5 text-sm font-medium text-parchment transition hover:bg-sepia-800"
        >
          <Upload className="h-4 w-4" /> Upload a photo
        </Link>

        {/* Search */}
        <div className="flex items-center gap-2 rounded-full border border-sepia-200 bg-white/60 px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-sepia-600" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search city, landmark, keyword…"
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink/40"
          />
        </div>

        {/* Featured photo */}
        {featuredPhoto && (
          <figure className="overflow-hidden rounded-lg border border-sepia-200 bg-white shadow-frame">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={featuredPhoto.imageUrl}
              alt={featuredPhoto.title}
              className="aspect-[3/2] w-full object-cover"
            />
            <figcaption className="px-4 py-3 text-center">
              <div className="font-display text-base leading-snug text-ink">
                {featuredPhoto.title}
              </div>
              <div className="mt-0.5 text-xs text-sepia-600">
                {featuredPhoto.city}
                {featuredPhoto.year ? ` · ${featuredPhoto.year}` : ""}
              </div>
            </figcaption>
            <div className="flex items-center justify-between border-t border-sepia-100 px-4 py-2 text-xs text-sepia-600">
              <button
                onClick={() => step(-1)}
                className="flex items-center gap-1 hover:text-sepia-800"
              >
                <ChevronLeft className="h-4 w-4" /> back
              </button>
              <span className="tabular-nums">
                {featured + 1} / {filtered.length}
              </span>
              <button
                onClick={() => step(1)}
                className="flex items-center gap-1 hover:text-sepia-800"
              >
                next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </figure>
        )}

        {/* Categories */}
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => {
            const active = activeCategories.has(c);
            return (
              <button
                key={c}
                onClick={() => toggleCategory(c)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs transition",
                  active
                    ? "bg-sepia-700 text-parchment"
                    : "bg-sepia-100 text-sepia-700 hover:bg-sepia-200",
                )}
              >
                {c}
              </button>
            );
          })}
        </div>

        {/* Timeline + counter */}
        <div className="mt-auto space-y-2 pt-2">
          <div className="text-xs text-ink/60">
            Showing{" "}
            <span className="font-semibold text-ink">{filtered.length}</span> of{" "}
            {photos.length} photographs
          </div>
          <TimelineFilter
            min={YEAR_MIN}
            max={YEAR_MAX}
            from={range.from}
            to={range.to}
            onChange={setRange}
          />
          <p className="pt-1 text-center text-[0.65rem] tracking-wide text-ink/40">
            babardazzou
          </p>
        </div>
      </aside>

      {/* ---------------- Framed map ---------------- */}
      <main className="min-h-[55vh] flex-1 p-3 sm:p-4 lg:min-h-0">
        <div className="h-full w-full overflow-hidden rounded-xl border border-sepia-300 shadow-frame">
          <MoroccoMap photos={filtered} />
        </div>
      </main>
    </div>
  );
}
