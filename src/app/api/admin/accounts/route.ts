import { NextResponse } from "next/server";

import { getUserIdFromRequest } from "@/lib/auth";
import { getUserRole, listAccounts } from "@/lib/db";

export const runtime = "nodejs";

// GET /api/admin/accounts — admin-only roster of all accounts + summary stats.
export async function GET(req: Request) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  let role: string | null;
  try {
    role = await getUserRole(userId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to check role";
    return NextResponse.json({ error: message }, { status: 500 });
  }
  if (role !== "admin") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  try {
    const accounts = await listAccounts();
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;
    const stats = {
      total: accounts.length,
      newThisWeek: accounts.filter(
        (a) => now - new Date(a.createdAt).getTime() <= 7 * DAY,
      ).length,
      activeThisMonth: accounts.filter(
        (a) =>
          a.lastSignInAt != null &&
          now - new Date(a.lastSignInAt).getTime() <= 30 * DAY,
      ).length,
      contributors: accounts.filter((a) => a.photoCount > 0).length,
    };
    return NextResponse.json({ accounts, stats });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load accounts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
