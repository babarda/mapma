import { NextResponse } from "next/server";

import { getUserIdFromRequest } from "@/lib/auth";
import { getDisplayName, getUserRole, setDisplayName } from "@/lib/db";
import { displayNameSchema } from "@/lib/schemas";

export const runtime = "nodejs";

// GET /api/profile — the signed-in user's current public display name.
export async function GET(req: Request) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  try {
    const [username, role] = await Promise.all([
      getDisplayName(userId),
      getUserRole(userId),
    ]);
    return NextResponse.json({ username, role });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/profile — set/clear the signed-in user's public display name.
export async function PUT(req: Request) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  try {
    const parsed = displayNameSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid display name" },
        { status: 400 },
      );
    }
    const username = await setDisplayName(userId, parsed.data.username);
    return NextResponse.json({ username });
  } catch (err) {
    const message =
      err instanceof Error && /duplicate key|unique/i.test(err.message)
        ? "That display name is already taken."
        : err instanceof Error
          ? err.message
          : "Failed to save display name";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
