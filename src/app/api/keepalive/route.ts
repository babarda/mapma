import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Pinged once a day by a Vercel Cron (see vercel.json). Issuing a tiny query
// registers database activity so the free-tier Supabase project never reaches
// its 7-day inactivity pause, even during weeks with no visitors or uploads.
export async function GET() {
  const sb = getSupabaseAdmin();
  if (!sb) return NextResponse.json({ ok: true, db: false });
  try {
    const { error } = await sb.from("photos").select("id").limit(1);
    if (error) throw error;
    return NextResponse.json({ ok: true, db: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "error" },
      { status: 500 },
    );
  }
}
