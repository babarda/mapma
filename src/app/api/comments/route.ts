import { NextResponse } from "next/server";

import { getUserIdFromRequest } from "@/lib/auth";
import { getDisplayName, insertComment, listComments } from "@/lib/db";
import { checkComment, clientKey, recordComment } from "@/lib/rateLimit";
import { commentSchema } from "@/lib/schemas";

export const runtime = "nodejs";

// GET /api/comments?photoId=<uuid> — public list, oldest first.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const photoId = searchParams.get("photoId");
  if (!photoId) {
    return NextResponse.json({ error: "photoId is required" }, { status: 400 });
  }
  try {
    const comments = await listComments(photoId);
    return NextResponse.json({ comments });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load comments";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/comments — open to guests. Honeypot + rate limit guard spam.
export async function POST(req: Request) {
  try {
    const parsed = commentSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid comment" },
        { status: 400 },
      );
    }
    const { photoId, body, authorName, website } = parsed.data;

    // Honeypot: a filled "website" field means a bot. Pretend success.
    if (website) {
      return NextResponse.json({ comment: null, skipped: true });
    }

    const userId = await getUserIdFromRequest(req);
    const key = clientKey(req, userId);
    const gate = checkComment(key);
    if (!gate.allowed) {
      return NextResponse.json(
        { error: gate.message, retryAfter: gate.retryAfter },
        { status: 429, headers: { "Retry-After": String(gate.retryAfter ?? 60) } },
      );
    }

    // Signed-in users are credited with their chosen display name; guests use
    // the name they typed (or stay anonymous).
    let name = authorName;
    if (userId) {
      const dn = await getDisplayName(userId).catch(() => null);
      if (dn) name = dn;
    }

    const comment = await insertComment({
      photoId,
      authorId: userId,
      authorName: name,
      body,
    });
    recordComment(key);
    return NextResponse.json({ comment });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to post comment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
