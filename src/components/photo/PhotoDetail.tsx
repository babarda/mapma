"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, MapPin, Tag, User, X } from "lucide-react";

import type { Photo } from "@/lib/types";
import Comments from "./Comments";

interface Props {
  photo: Photo;
  all: Photo[];
  /** Ordered list to step through with the prev/next arrows (the gallery view). */
  sequence: Photo[];
  onClose: () => void;
  onShowOnMap: (photo: Photo) => void;
  onOpenPhoto: (photo: Photo) => void;
  onSelectCity: (city: string) => void;
  onSelectTag: (tag: string) => void;
  onSelectPublisher: (name: string) => void;
}

export default function PhotoDetail({
  photo,
  all,
  sequence,
  onClose,
  onShowOnMap,
  onOpenPhoto,
  onSelectCity,
  onSelectTag,
  onSelectPublisher,
}: Props) {
  const t = useTranslations("Photo");
  // Position within the gallery sequence, with wrap-around so the arrows always
  // move. Falls back gracefully if the photo isn't in the sequence.
  const idx = sequence.findIndex((p) => p.id === photo.id);
  const count = sequence.length;
  const prevPhoto =
    count > 1 && idx >= 0 ? sequence[(idx - 1 + count) % count] : null;
  const nextPhoto =
    count > 1 && idx >= 0 ? sequence[(idx + 1) % count] : null;

  // Close on Escape, navigate with arrow keys; lock body scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && prevPhoto) onOpenPhoto(prevPhoto);
      else if (e.key === "ArrowRight" && nextPhoto) onOpenPhoto(nextPhoto);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, onOpenPhoto, prevPhoto, nextPhoto]);

  // Other photographs from the same city/area.
  const related = all
    .filter(
      (p) =>
        p.id !== photo.id &&
        p.city.trim().toLowerCase() === photo.city.trim().toLowerCase(),
    )
    .slice(0, 12);

  const yearLabel =
    photo.year != null
      ? `${photo.yearApproximate ? `${t("circa")} ` : ""}${photo.year}`
      : t("yearUnknown");

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto bg-ink/60 p-0 backdrop-blur-sm sm:p-6"
      onClick={onClose}
    >
      <article
        className="relative my-0 w-full max-w-3xl bg-parchment shadow-frame sm:my-4 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute end-3 top-3 z-10 rounded-full bg-ink/55 p-1.5 text-parchment transition hover:bg-ink/80"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative bg-ink/5 sm:rounded-t-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.imageUrl}
            alt={photo.title}
            className="max-h-[60vh] w-full object-contain sm:rounded-t-2xl"
          />

          {/* Prev / next through the gallery sequence */}
          {prevPhoto && (
            <button
              onClick={() => onOpenPhoto(prevPhoto)}
              aria-label={t("prevPhoto")}
              className="absolute start-2 top-1/2 -translate-y-1/2 rounded-full bg-ink/55 p-2 text-parchment transition hover:bg-ink/80 rtl:rotate-180"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          {nextPhoto && (
            <button
              onClick={() => onOpenPhoto(nextPhoto)}
              aria-label={t("nextPhoto")}
              className="absolute end-2 top-1/2 -translate-y-1/2 rounded-full bg-ink/55 p-2 text-parchment transition hover:bg-ink/80 rtl:rotate-180"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
          {count > 1 && idx >= 0 && (
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-ink/55 px-2.5 py-0.5 text-xs tabular-nums text-parchment">
              {idx + 1} / {count}
            </span>
          )}
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-sepia-600">
            <span>{yearLabel}</span>
            <span aria-hidden>•</span>
            <button
              onClick={() => onSelectCity(photo.city)}
              className="underline-offset-2 hover:underline"
            >
              {photo.city}
            </button>
          </div>

          <h2 className="mt-1 font-display text-2xl leading-snug text-ink">
            {photo.title}
          </h2>

          {photo.description && (
            <p className="mt-2 text-sm leading-relaxed text-ink/75">
              {photo.description}
            </p>
          )}

          {/* Categories */}
          {photo.categories.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {photo.categories.map((c) => (
                <span
                  key={c}
                  className="rounded-full bg-sepia-100 px-2.5 py-0.5 text-xs text-sepia-700"
                >
                  {c}
                </span>
              ))}
            </div>
          )}

          {/* Tags (clickable → browse) */}
          {photo.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-ink/40" />
              {photo.tags.map((t) => (
                <button
                  key={t}
                  onClick={() => onSelectTag(t)}
                  className="rounded-full border border-sepia-200 px-2.5 py-0.5 text-xs text-sepia-700 transition hover:bg-sepia-100"
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          {/* Credits */}
          <dl className="mt-4 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 shrink-0 text-ink/40" />
              <dt className="sr-only">Contributed by</dt>
              <dd className="text-ink/70">
                {photo.uploaderName ? (
                  <>
                    {t("contributedBy")}{" "}
                    <button
                      onClick={() => onSelectPublisher(photo.uploaderName as string)}
                      className="font-medium text-ink underline-offset-2 hover:underline"
                    >
                      {photo.uploaderName}
                    </button>
                  </>
                ) : (
                  t("anonymous")
                )}
              </dd>
            </div>
            {photo.source && (
              <div className="text-ink/70">
                <dt className="sr-only">Source</dt>
                <dd className="italic">{t("source", { source: photo.source })}</dd>
              </div>
            )}
          </dl>

          <button
            onClick={() => onShowOnMap(photo)}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-sepia-700 px-4 py-2 text-sm font-medium text-parchment transition hover:bg-sepia-800"
          >
            <MapPin className="h-4 w-4" /> {t("showOnMap")}
          </button>

          {/* Related from the same area */}
          {related.length > 0 && (
            <div className="mt-6">
              <h3 className="font-display text-lg text-ink">
                {t("moreFrom", { city: photo.city })}
              </h3>
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {related.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onOpenPhoto(p)}
                    className="group overflow-hidden rounded-lg border border-sepia-200 bg-white text-left shadow-frame"
                    title={p.title}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.thumbnailUrl}
                      alt={p.title}
                      className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          <Comments photoId={photo.id} />
        </div>
      </article>
    </div>
  );
}
