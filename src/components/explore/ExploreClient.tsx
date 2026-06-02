"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Map as MapIcon,
  Menu,
  Search,
  Upload,
  X,
} from "lucide-react";

import type { Category, Photo } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";
import { YEAR_MAX, YEAR_MIN } from "@/data/samplePhotos";
import { cn } from "@/lib/utils";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { authEnabled, useUser } from "@/lib/useUser";
import Logo from "@/components/Logo";
import TimelineFilter from "./TimelineFilter";
import GalleryGrid from "@/components/gallery/GalleryGrid";
import PhotoDetail from "@/components/photo/PhotoDetail";

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

type View = "map" | "gallery";

export default function ExploreClient({ photos }: Props) {
  const t = useTranslations("Home");
  const tc = useTranslations("Common");
  const { user } = useUser();
  const [query, setQuery] = useState("");
  const [range, setRange] = useState({ from: YEAR_MIN, to: YEAR_MAX });
  const [activeCategories, setActiveCategories] = useState<Set<Category>>(new Set());
  const [city, setCity] = useState("");
  const [tag, setTag] = useState("");
  const [publisher, setPublisher] = useState("");
  const [featured, setFeatured] = useState(0);

  const [view, setView] = useState<View>("map");
  const [detailPhoto, setDetailPhoto] = useState<Photo | null>(null);
  const [focus, setFocus] = useState<{ photo: Photo; nonce: number } | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Distinct values for the browse dropdowns.
  const cities = useMemo(
    () =>
      Array.from(new Set(photos.map((p) => p.city).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [photos],
  );
  const tags = useMemo(
    () =>
      Array.from(new Set(photos.flatMap((p) => p.tags).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [photos],
  );
  const publishers = useMemo(
    () =>
      Array.from(
        new Set(photos.map((p) => p.uploaderName).filter((n): n is string => Boolean(n))),
      ).sort((a, b) => a.localeCompare(b)),
    [photos],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const tagL = tag.toLowerCase();
    const cityL = city.toLowerCase();
    return photos.filter((p) => {
      if (p.year != null && (p.year < range.from || p.year > range.to)) return false;
      if (cityL && p.city.toLowerCase() !== cityL) return false;
      if (tagL && !p.tags.some((t) => t.toLowerCase() === tagL)) return false;
      if (publisher && p.uploaderName !== publisher) return false;
      if (activeCategories.size > 0) {
        if (!p.categories.some((c) => activeCategories.has(c))) return false;
      }
      if (q) {
        const haystack = [
          p.title,
          p.description ?? "",
          p.city,
          p.region ?? "",
          p.uploaderName ?? "",
          ...p.tags,
          ...p.categories,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [photos, query, range, activeCategories, city, tag, publisher]);

  // Keep the featured index valid as the filtered set changes.
  useEffect(() => {
    setFeatured(0);
  }, [query, range, activeCategories, city, tag, publisher]);

  const featuredPhoto = filtered[featured] ?? null;
  const hasBrowseFilter = Boolean(city || tag || publisher);

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

  function showOnMap(photo: Photo) {
    setDetailPhoto(null);
    setView("map");
    setFocus((f) => ({ photo, nonce: (f?.nonce ?? 0) + 1 }));
  }

  // When a marker is selected on the map, move the featured panel to that photo
  // so both sides of the page stay in sync.
  function syncFeatured(photo: Photo) {
    const idx = filtered.findIndex((p) => p.id === photo.id);
    if (idx >= 0) setFeatured(idx);
  }

  function browseBy(setter: (v: string) => void, value: string) {
    setter(value);
    setDetailPhoto(null);
    setView("gallery");
  }

  // ---- Reusable nav links ----
  const navLinks = (
    <>
      <Link href="/about" className="text-sepia-700 hover:text-sepia-900">
        {tc("about")}
      </Link>
      <Link href="/contribute" className="text-sepia-700 hover:text-sepia-900">
        {tc("contribute")}
      </Link>
      {authEnabled && user ? (
        <>
          <Link
            href="/profile"
            className="inline-block max-w-[140px] truncate align-middle text-sepia-700 hover:text-sepia-900"
            title={user.email ?? ""}
          >
            {user.email}
          </Link>
          <button
            onClick={() => getSupabaseBrowser()?.auth.signOut()}
            className="rounded-full bg-sepia-100 px-3 py-1 text-sepia-800 hover:bg-sepia-200"
          >
            {tc("signOut")}
          </button>
        </>
      ) : (
        <>
          <Link href="/login" className="text-sepia-700 hover:text-sepia-900">
            {tc("signIn")}
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-sepia-100 px-3 py-1 text-sepia-800 hover:bg-sepia-200"
          >
            {tc("signUp")}
          </Link>
        </>
      )}
      <LanguageSwitcher />
    </>
  );

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-parchment lg:flex-row">
      {/* ---------------- Sidebar / mobile top panel ---------------- */}
      <aside className="flex max-h-[58vh] w-full shrink-0 flex-col overflow-y-auto border-b border-sepia-200 lg:h-dvh lg:max-h-none lg:w-[36%] lg:max-w-md lg:shrink lg:border-b-0 lg:border-r">
        {/* Top bar */}
        <div className="flex items-start justify-between gap-3 px-4 pt-4 sm:px-6">
          <Link href="/" aria-label="MAPMA home" className="shrink-0">
            <Logo size={28} tagline />
          </Link>
          {/* Desktop nav */}
          <nav className="hidden min-w-0 flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs lg:flex">
            {navLinks}
          </nav>
          {/* Mobile menu toggle */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
            className="rounded-full border border-sepia-200 p-2 text-sepia-700 lg:hidden"
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <nav className="flex flex-col gap-2 border-b border-sepia-200 px-4 py-3 text-sm lg:hidden">
            {navLinks}
          </nav>
        )}

        {/* Hero — desktop only, to keep the map prominent on phones */}
        <div className="hidden px-6 pt-4 lg:block">
          <h2 className="font-display text-2xl leading-tight text-ink">
            {t("heroTitle")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink/70">
            {t("heroBody")}
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-3 p-4 sm:px-6 lg:pt-4">
          {/* View toggle */}
          <div className="flex rounded-full border border-sepia-200 bg-white/60 p-1 text-sm">
            <button
              onClick={() => setView("map")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 transition",
                view === "map" ? "bg-sepia-700 text-parchment" : "text-sepia-700",
              )}
            >
              <MapIcon className="h-4 w-4" /> {t("viewMap")}
            </button>
            <button
              onClick={() => setView("gallery")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 transition",
                view === "gallery" ? "bg-sepia-700 text-parchment" : "text-sepia-700",
              )}
            >
              <LayoutGrid className="h-4 w-4" /> {t("viewGallery")}
            </button>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 rounded-full border border-sepia-200 bg-white/60 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-sepia-600" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink/40"
            />
          </div>

          {/* Active browse-filter chips */}
          {hasBrowseFilter && (
            <div className="flex flex-wrap gap-1.5 text-xs">
              {city && (
                <FilterChip label={t("filterCity", { value: city })} onClear={() => setCity("")} />
              )}
              {tag && (
                <FilterChip label={t("filterTag", { value: tag })} onClear={() => setTag("")} />
              )}
              {publisher && (
                <FilterChip
                  label={t("filterBy", { value: publisher })}
                  onClear={() => setPublisher("")}
                />
              )}
            </div>
          )}

          {/* Filters toggle (mobile only) */}
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className="flex items-center justify-between rounded-lg border border-sepia-200 bg-white/60 px-3 py-2 text-sm text-sepia-700 lg:hidden"
          >
            <span>{t("filtersBrowse")}</span>
            <ChevronRight
              className={cn("h-4 w-4 transition-transform", filtersOpen && "rotate-90")}
            />
          </button>

          {/* Filter panel (collapsible on mobile, always shown on desktop) */}
          <div className={cn("flex-col gap-3", filtersOpen ? "flex" : "hidden", "lg:flex")}>
            <BrowseSelect
              label={t("selectCity")}
              allLabel={t("all")}
              value={city}
              options={cities}
              onChange={setCity}
            />
            <BrowseSelect
              label={t("selectTag")}
              allLabel={t("all")}
              value={tag}
              options={tags}
              onChange={setTag}
            />
            {publishers.length > 0 && (
              <BrowseSelect
                label={t("selectPublisher")}
                allLabel={t("all")}
                value={publisher}
                options={publishers}
                onChange={setPublisher}
              />
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

            {/* Timeline */}
            <TimelineFilter
              min={YEAR_MIN}
              max={YEAR_MAX}
              from={range.from}
              to={range.to}
              onChange={setRange}
            />

            {/* Upload CTA */}
            <Link
              href="/upload"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-sepia-700 px-4 py-2.5 text-sm font-medium text-parchment transition hover:bg-sepia-800"
            >
              <Upload className="h-4 w-4" /> {t("uploadCta")}
            </Link>
          </div>

          {/* Counter */}
          <div className="text-xs text-ink/60">
            {t("showing", { count: filtered.length, total: photos.length })}
          </div>
        </div>

        {/* Featured photo — desktop only */}
        {featuredPhoto && (
          <div className="mt-auto hidden p-6 pt-2 lg:block">
            <figure className="overflow-hidden rounded-lg border border-sepia-200 bg-white shadow-frame">
              <button onClick={() => setDetailPhoto(featuredPhoto)} className="block w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={featuredPhoto.imageUrl}
                  alt={featuredPhoto.title}
                  className="aspect-[3/2] w-full object-cover"
                />
              </button>
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
                <button onClick={() => step(-1)} className="flex items-center gap-1 hover:text-sepia-800">
                  <ChevronLeft className="h-4 w-4" /> {t("back")}
                </button>
                <span className="tabular-nums">
                  {filtered.length === 0 ? 0 : featured + 1} / {filtered.length}
                </span>
                <button onClick={() => step(1)} className="flex items-center gap-1 hover:text-sepia-800">
                  {t("next")} <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </figure>
          </div>
        )}
      </aside>

      {/* ---------------- Main: map (always mounted) with gallery overlay ---------------- */}
      <main className="relative min-h-0 flex-1">
        <div className="absolute inset-0 p-2 sm:p-3">
          <div className="h-full w-full overflow-hidden rounded-xl border border-sepia-300 shadow-frame">
            <MoroccoMap
              photos={filtered}
              onOpenDetail={setDetailPhoto}
              onSelectPhoto={syncFeatured}
              focusPhoto={focus?.photo ?? null}
              focusNonce={focus?.nonce ?? 0}
            />
          </div>
        </div>
        {view === "gallery" && (
          <div className="absolute inset-0 bg-parchment">
            <GalleryGrid photos={filtered} onOpen={setDetailPhoto} />
          </div>
        )}
      </main>

      {/* ---------------- Photo detail overlay ---------------- */}
      {detailPhoto && (
        <PhotoDetail
          photo={detailPhoto}
          all={photos}
          sequence={filtered}
          onClose={() => setDetailPhoto(null)}
          onShowOnMap={showOnMap}
          onOpenPhoto={setDetailPhoto}
          onSelectCity={(c) => browseBy(setCity, c)}
          onSelectTag={(t) => browseBy(setTag, t)}
          onSelectPublisher={(n) => browseBy(setPublisher, n)}
        />
      )}
    </div>
  );
}

// ---- Small presentational helpers ----
function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-sepia-700 px-2.5 py-1 text-parchment">
      {label}
      <button onClick={onClear} aria-label={`Clear ${label}`} className="hover:opacity-80">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function BrowseSelect({
  label,
  allLabel,
  value,
  options,
  onChange,
}: {
  label: string;
  allLabel: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-ink/60">
      <span className="w-16 shrink-0">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-sepia-200 bg-white px-2 py-1.5 text-sm text-ink outline-none focus:border-sepia-400"
      >
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
