import "server-only";

import { hasSupabaseAdmin } from "./env";
import { getSupabaseAdmin } from "./supabase/server";
import { rowToPhoto, type PhotoRow } from "./photoRow";
import type { Comment, Photo } from "./types";
import { SAMPLE_PHOTOS } from "@/data/samplePhotos";

// PostgREST select that embeds the uploader's public display name.
const PHOTO_SELECT = "*, profiles:uploader_id(username)";

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
      .select(PHOTO_SELECT)
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
    uploaderName: null,
  };
  const local = await readLocal();
  local.push(photo);
  await writeLocal(local);
  return photo;
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------
interface CommentRow {
  id: string;
  photo_id: string;
  author_name: string | null;
  body: string;
  created_at: string;
}

const LOCAL_COMMENTS = ".data/comments.json";

async function readLocalComments(): Promise<Comment[]> {
  const { readFile } = await import("node:fs/promises");
  const path = await import("node:path");
  try {
    const raw = await readFile(path.join(process.cwd(), LOCAL_COMMENTS), "utf8");
    return JSON.parse(raw) as Comment[];
  } catch {
    return [];
  }
}

async function writeLocalComments(rows: Comment[]): Promise<void> {
  const { writeFile, mkdir } = await import("node:fs/promises");
  const path = await import("node:path");
  const file = path.join(process.cwd(), LOCAL_COMMENTS);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(rows, null, 2), "utf8");
}

function rowToComment(r: CommentRow): Comment {
  return {
    id: r.id,
    photoId: r.photo_id,
    authorName: r.author_name,
    body: r.body,
    createdAt: r.created_at,
  };
}

export async function listComments(photoId: string): Promise<Comment[]> {
  if (hasSupabaseAdmin) {
    const sb = getSupabaseAdmin()!;
    const { data, error } = await sb
      .from("comments")
      .select("id, photo_id, author_name, body, created_at")
      .eq("photo_id", photoId)
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) throw new Error(error.message);
    return (data as CommentRow[]).map(rowToComment);
  }
  const all = await readLocalComments();
  return all.filter((c) => c.photoId === photoId);
}

export async function insertComment(input: {
  photoId: string;
  authorId: string | null;
  authorName: string | null;
  body: string;
}): Promise<Comment> {
  if (hasSupabaseAdmin) {
    const sb = getSupabaseAdmin()!;
    const { data, error } = await sb
      .from("comments")
      .insert({
        photo_id: input.photoId,
        author_id: input.authorId,
        author_name: input.authorName,
        body: input.body,
      })
      .select("id, photo_id, author_name, body, created_at")
      .single();
    if (error) throw new Error(error.message);
    return rowToComment(data as CommentRow);
  }
  const comment: Comment = {
    id: crypto.randomUUID(),
    photoId: input.photoId,
    authorName: input.authorName,
    body: input.body,
    createdAt: new Date().toISOString(),
  };
  const all = await readLocalComments();
  all.push(comment);
  await writeLocalComments(all);
  return comment;
}

// ---------------------------------------------------------------------------
// Profile display name (profiles.username)
// ---------------------------------------------------------------------------
export async function getDisplayName(userId: string): Promise<string | null> {
  if (!hasSupabaseAdmin) return null;
  const sb = getSupabaseAdmin()!;
  const { data, error } = await sb
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.username as string | null) ?? null;
}

export async function setDisplayName(
  userId: string,
  username: string | null,
): Promise<string | null> {
  if (!hasSupabaseAdmin) return username;
  const sb = getSupabaseAdmin()!;
  const { data, error } = await sb
    .from("profiles")
    .upsert({ id: userId, username }, { onConflict: "id" })
    .select("username")
    .single();
  if (error) throw new Error(error.message);
  return (data?.username as string | null) ?? null;
}
