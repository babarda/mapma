import { NextResponse } from "next/server";
import { z } from "zod";

import { recordPageView } from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/track — one page view. Called by the <Tracker /> client component
// on every route change (sendBeacon). Public, no auth, no cookies. Bots are
// dropped server-side and a per-IP cap stops a single client from flooding
// the table. Always answers 202 so a failure never surfaces in the browser.

const bodySchema = z.object({
  path: z.string().min(1).max(512),
  referrer: z.string().max(2048).optional().default(""),
  utmSource: z.string().max(200).nullish(),
  utmMedium: z.string().max(200).nullish(),
  utmCampaign: z.string().max(200).nullish(),
  screenWidth: z.number().int().min(0).max(20000).nullish(),
});

// In-memory per-IP cap: generous for a human, tight for a script.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 150;
const hits = new Map<string, number[]>();

function overCap(ip: string, now: number): boolean {
  const cutoff = now - WINDOW_MS;
  const list = (hits.get(ip) ?? []).filter((t) => t > cutoff);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear(); // crude memory guard
  return list.length > MAX_PER_WINDOW;
}

export async function POST(req: Request) {
  try {
    // sendBeacon may post text/plain; read as text and parse ourselves.
    const raw = await req.text();
    const parsed = bodySchema.safeParse(raw ? JSON.parse(raw) : {});
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
    }
    const fwd = req.headers.get("x-forwarded-for");
    const ip = fwd ? fwd.split(",")[0].trim() : req.headers.get("x-real-ip") || "anon";
    if (overCap(ip, Date.now())) {
      return NextResponse.json({ ok: false, error: "rate" }, { status: 202 });
    }
    const result = await recordPageView(req, parsed.data);
    return NextResponse.json({ ok: result.stored, reason: result.reason }, { status: 202 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "track failed";
    // Log for the server; keep the client quiet.
    console.error("[track]", message);
    return NextResponse.json({ ok: false }, { status: 202 });
  }
}
