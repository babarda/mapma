import { NextResponse } from "next/server";

import { getUserIdFromRequest } from "@/lib/auth";
import { isAdmin, setUserRole } from "@/lib/db";
import { userRoleSchema } from "@/lib/schemas";

export const runtime = "nodejs";

// PATCH /api/admin/accounts/[id] — change a user's role. Admin only.
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  try {
    if (!(await isAdmin(userId))) {
      return NextResponse.json({ error: "Admins only" }, { status: 403 });
    }

    const parsed = userRoleSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid role" },
        { status: 400 },
      );
    }

    // Guard against self-lockout: an admin can't drop their own admin role.
    if (params.id === userId && parsed.data.role !== "admin") {
      return NextResponse.json(
        { error: "You can't remove your own admin role." },
        { status: 400 },
      );
    }

    const role = await setUserRole(params.id, parsed.data.role);
    return NextResponse.json({ role });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update role";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
