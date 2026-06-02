import { NextResponse } from "next/server";

import { getUserIdFromRequest } from "@/lib/auth";
import { isAdmin, listAllPhotos } from "@/lib/db";

export const runtime = "nodejs";

// GET /api/admin/photos — every photo (any status), admin only.
export async function GET(req: Request) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  try {
    if (!(await isAdmin(userId))) {
      return NextResponse.json({ error: "Admins only" }, { status: 403 });
    }
    const photos = await listAllPhotos();
    return NextResponse.json({ photos });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load photos";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
