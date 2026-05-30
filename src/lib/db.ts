import "server-only";

import { hasSupabaseAdmin } from "./env";
import { getSupabaseAdmin } from "./supabase/server";
import { rowToPhoto, type PhotoRow } from "./photoRow";
import type { Photo } from "./types";
import { SAMPLE_PHOTOS } from "@/data/samplePhotos";

export interface NewPhoto {
  title: string;
  description: string;
  imageUrl: string;
  thumbnailUrl: string;
  lng: number;
  lat: number;
  city: string;
  region: string | null;
  year: number | null;
  yearApproximate: boolean;
  categories: string[];
  tags: string[];
  source: string | null;
  aiConfidence: number | null;
  uploaderId: string | null;
}

// ---------------------------------------------------------------------------
// Local JSON fallback (dev only, when Supabase isn't configured).
// ---------------------------------------------------------------------------
const LOCAL_FILE = ".data/photos.json";

async function readLocal(): Promise<Photo[]> {
  const { readFile } = await import("node:fs/promises");
  const path = await import("node:path");
  try {
    const raw = await readFile(path.join(process.cwd(), LOCAL_FILE), "utf8");
    return JSON.parse(raw) as Photo[];
  } catch {
    return [];
  }
}

async function writeLocal(photos: Photo[]): Promise<void> {
  const { writeFile, mkdir } = await import("node:fs/promises");
  const path = await import("node:path");
  const file = path.join(process.cwd(), LOCAL_FILE);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(photos, null, 2), "utf8");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export async function listVerifiedPhotos(): Promise<Photo[]> {
  if (hasSupabaseAdmin) {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb!
      .from("photos")
      .select("*")
      .eq("status", "verified")
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) throw new Error(error.message);
    return (data as PhotoRow[]).map(rowToPhoto);
  }
  // Dev: built-in seed photos + anything published locally.
  const local = await readLocal();
  return [...SAMPLE_PHOTOS, ...local];
}

// All photos a contributor has submitted, any status, newest first. Uses the
// admin client so a contributor can see their own pending/flagged uploads.
export async function listPhotosByUploader(uploaderId: string): Promise<Photo[]> {
  if (hasSupabaseAdmin) {
    const sb = getSupabaseAdmin()!;
    const { data, error } = await sb
      .from("photos")
      .select("*")
      .eq("uploader_id", uploaderId)
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) throw new Error(error.message);
    return (data as PhotoRow[]).map(rowToPhoto);
  }
  const local = await readLocal();
  return local.filter((p) => p.uploader === uploaderId);
}

export async function insertPhoto(input: NewPhoto): Promise<Photo> {
  if (hasSupabaseAdmin) {
    const sb = getSupabaseAdmin()!;
    if (input.uploaderId) {
      // Ensure a profile row exists to satisfy the FK.
      await sb.from("profiles").upsert({ id: input.uploaderId }, { onConflict: "id" });
    }
    const { data, error } = await sb
      .from("photos")
      .insert({
        title: input.title,
        description: input.description,
        image_url: input.imageUrl,
        thumbnail_url: input.thumbnailUrl,
        lng: input.lng,
        lat: input.lat,
        city: input.city,
        region: input.region,
        year: input.year,
        year_approximate: input.yearApproximate,
        categories: input.categories,
        tags: input.tags,
        source: input.source,
        ai_confidence: input.aiConfidence,
        status: "verified",
        uploader_id: input.uploaderId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return rowToPhoto(data as PhotoRow);
  }

  // Dev fallback.
  const photo: Photo = {
    id: crypto.randomUUID(),
    title: input.title,
    description: input.description,
    imageUrl: input.imageUrl,
    thumbnailUrl: input.thumbnailUrl,
    lng: input.lng,
    lat: input.lat,
    city: input.city,
    region: input.region,
    year: input.year,
    yearApproximate: input.yearApproximate,
    decade: input.year != null ? Math.floor(input.year / 10) * 10 : null,
    categories: input.categories as Photo["categories"],
    tags: input.tags,
    source: input.source,
    aiConfidence: input.aiConfidence,
    status: "verified",
    uploader: input.uploaderId,
  };
  const local = await readLocal();
  local.push(photo);
  await writeLocal(local);
  return photo;
}
