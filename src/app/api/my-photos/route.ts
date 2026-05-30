import { NextResponse } from "next/server";

import { getUserIdFromRequest } from "@/lib/auth";
import { listPhotosByUploader } from "@/lib/db";

export const runtime = "nodejs";

// Returns the signed-in contributor's own submissions (any status).
export async function GET(req: Request) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Sign in to view your contributions" }, { status: 401 });
  }
  const photos = await listPhotosByUploader(userId);
  return NextResponse.json({ photos });
}
