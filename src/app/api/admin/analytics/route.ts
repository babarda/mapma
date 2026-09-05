import { NextResponse } from "next/server";

import { getAnalyticsSummary } from "@/lib/analytics";
import { getUserIdFromRequest } from "@/lib/auth";
import { isAdmin } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_DAYS = new Set([7, 30, 90]);

// GET /api/admin/analytics?days=30 — visitor summary, admin only.
export async function GET(req: Request) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  try {
    if (!(await isAdmin(userId))) {
      return NextResponse.json({ error: "Admins only" }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const requested = Number(searchParams.get("days") ?? 30);
    const days = ALLOWED_DAYS.has(requested) ? requested : 30;
    const summary = await getAnalyticsSummary(days);
    return NextResponse.json(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load analytics";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
