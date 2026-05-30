import type { Photo } from "./types";

// Maps a Supabase `photos` row (snake_case) to the front-end Photo type.
export interface PhotoRow {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  thumbnail_url: string;
  lng: number;
  lat: number;
  city: string;
  region: string | null;
  year: number | null;
  year_approximate: boolean | null;
  decade: number | null;
  categories: string[] | null;
  tags: string[] | null;
  source: string | null;
  ai_confidence: number | null;
  status: Photo["status"];
  uploader_id: string | null;
}

export function rowToPhoto(r: PhotoRow): Photo {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    imageUrl: r.image_url,
    thumbnailUrl: r.thumbnail_url,
    lng: r.lng,
    lat: r.lat,
    city: r.city,
    region: r.region,
    year: r.year,
    yearApproximate: r.year_approximate ?? false,
    decade: r.decade,
    categories: (r.categories ?? []) as Photo["categories"],
    tags: r.tags ?? [],
    source: r.source,
    aiConfidence: r.ai_confidence,
    status: r.status,
    uploader: r.uploader_id,
  };
}
