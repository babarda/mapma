import { NextResponse } from "next/server";

import { getUserIdFromRequest } from "@/lib/auth";
import { deletePhotoById, isAdmin, updatePhotoAdmin } from "@/lib/db";
import { adminPhotoUpdateSchema } from "@/lib/schemas";

export const runtime = "nodejs";

async function requireAdmin(req: Request): Promise<string | NextResponse> {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  if (!(await isAdmin(userId))) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }
  return userId;
}

// PATCH /api/admin/photos/[id] — edit any field/location of a photo.
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const guard = await requireAdmin(req);
  if (guard instanceof NextResponse) return guard;

  try {
    const parsed = adminPhotoUpdateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid update" },
        { status: 400 },
      );
    }
    const photo = await updatePhotoAdmin(params.id, parsed.data);
    return NextResponse.json({ photo });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update photo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/admin/photos/[id] — remove the photo and its stored images.
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  const guard = await requireAdmin(req);
  if (guard instanceof NextResponse) return guard;

  try {
    await deletePhotoById(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete photo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
