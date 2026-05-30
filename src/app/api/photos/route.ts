import { NextResponse } from "next/server";
import sharp from "sharp";

import { getUserIdFromRequest } from "@/lib/auth";
import { insertPhoto, listVerifiedPhotos } from "@/lib/db";
import { hasSupabase } from "@/lib/env";
import { checkPublish, clientKey, recordPublish } from "@/lib/rateLimit";
import { publishMetaSchema } from "@/lib/schemas";
import { putImage } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 12 * 1024 * 1024;

export async function GET() {
  const photos = await listVerifiedPhotos();
  return NextResponse.json({ photos });
}

// POST multipart/form-data: `file` (image) + `meta` (JSON of publishMetaSchema).
export async function POST(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req);
    // When Supabase auth is configured, require a signed-in user.
    if (hasSupabase && !userId) {
      return NextResponse.json({ error: "Sign in to publish" }, { status: 401 });
    }

    // Throttle publish bursts (>20 in a row) to protect curators and storage.
    const key = clientKey(req, userId);
    const gate = checkPublish(key);
    if (!gate.allowed) {
      return NextResponse.json(
        { error: gate.message, retryAfter: gate.retryAfter },
        { status: 429, headers: { "Retry-After": String(gate.retryAfter ?? 60) } },
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    const metaRaw = form.get("meta");

    if (!(file instanceof File) || !file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Valid image required" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image too large (max 12MB)" }, { status: 413 });
    }
    if (typeof metaRaw !== "string") {
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }

    const parsed = publishMetaSchema.safeParse(JSON.parse(metaRaw));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid metadata" },
        { status: 400 },
      );
    }
    const meta = parsed.data;

    const original = Buffer.from(await file.arrayBuffer());
    const id = crypto.randomUUID();

    // Optimize the main image and build a thumbnail.
    const main = await sharp(original)
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
    const thumb = await sharp(original)
      .rotate()
      .resize(400, 300, { fit: "cover" })
      .jpeg({ quality: 78 })
      .toBuffer();

    const imageUrl = await putImage(`photos/${id}.jpg`, main, "image/jpeg");
    const thumbnailUrl = await putImage(`photos/${id}_thumb.jpg`, thumb, "image/jpeg");

    const photo = await insertPhoto({
      title: meta.title,
      description: meta.description,
      imageUrl,
      thumbnailUrl,
      lng: meta.lng,
      lat: meta.lat,
      city: meta.city,
      region: meta.region,
      year: meta.year,
      yearApproximate: meta.yearApproximate,
      categories: meta.categories,
      tags: meta.tags,
      source: meta.source,
      aiConfidence: meta.aiConfidence,
      uploaderId: userId,
    });

    recordPublish(key);
    return NextResponse.json({ photo });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Publish failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
