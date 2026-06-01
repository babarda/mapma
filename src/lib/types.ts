// Core domain types for MAPMA. These mirror the Supabase schema in
// supabase/migrations/0001_init.sql so the front end and DB stay in sync.

export type VerificationStatus = "draft" | "pending" | "verified" | "flagged";

export const CATEGORIES = [
  "Architecture",
  "Daily Life",
  "Markets",
  "Railways",
  "Ports",
  "Colonial Era",
  "Independence Era",
  "Amazigh Heritage",
  "Jewish Heritage",
  "Cinema",
  "Transportation",
  "Family Archives",
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface Photo {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  thumbnailUrl: string;
  /** WGS84 longitude / latitude. */
  lng: number;
  lat: number;
  city: string;
  region: string | null;
  /** Best-estimate year; decade is derived for filtering. */
  year: number | null;
  /** True when the year is an approximation (circa), not exact. */
  yearApproximate: boolean;
  decade: number | null;
  categories: Category[];
  tags: string[];
  /** Provenance / credit line, e.g. an archive name. */
  source: string | null;
  /** 0..1 confidence reported by the AI for its suggestions. */
  aiConfidence: number | null;
  status: VerificationStatus;
  uploader: string | null;
  /** Public display name of the contributor (profiles.username), or null. */
  uploaderName: string | null;
}

export interface Comment {
  id: string;
  photoId: string;
  /** Public display name; null renders as "Anonymous". */
  authorName: string | null;
  body: string;
  /** ISO timestamp. */
  createdAt: string;
}
