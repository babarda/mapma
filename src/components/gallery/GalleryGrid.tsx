"use client";

import { MapPin } from "lucide-react";

import type { Photo } from "@/lib/types";

interface Props {
  photos: Photo[];
  onOpen: (photo: Photo) => void;
}

// A responsive archival "contact sheet" of photo cards. Tapping a card opens
// the full detail view (with related photos + comments).
export default function GalleryGrid({ photos, onOpen }: Props) {
  if (photos.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-sm text-ink/50">
        No photographs match your filters yet. Try clearing the search or
        widening the years.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-3 sm:p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((p) => (
          <button
            key={p.id}
            onClick={() => onOpen(p)}
            className="group flex flex-col overflow-hidden rounded-lg border border-sepia-200 bg-white text-left shadow-frame transition hover:border-sepia-300"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.thumbnailUrl}
              alt={p.title}
              loading="lazy"
              className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="flex flex-1 flex-col px-3 py-2">
              <h3 className="line-clamp-2 font-display text-sm leading-snug text-ink">
                {p.title}
              </h3>
              <div className="mt-1 flex items-center gap-1 text-[11px] text-sepia-600">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{p.city}</span>
                {p.year != null && (
                  <span className="shrink-0">
                    · {p.yearApproximate ? "c. " : ""}
                    {p.year}
                  </span>
                )}
              </div>
              {p.uploaderName && (
                <span className="mt-0.5 truncate text-[11px] text-ink/40">
                  {p.uploaderName}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
