import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Forward-geocoding proxy. Turns a free-text query ("Place Jemaa el-Fna",
// "Avenue Mohammed V Rabat") into candidate coordinates so the uploader can
// jump the map to the right spot and then drop/drag the pin precisely.
//
// Uses MapTiler (same key as the map style), biased to Morocco. Degrades to an
// empty result list when no key is configured, so the UI never errors.
interface GeoResult {
  name: string;
  lng: number;
  lat: number;
  bbox?: [number, number, number, number];
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ results: [] });

  const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  if (!key) return NextResponse.json({ results: [] });

  const url =
    `https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json` +
    `?key=${key}&country=ma&autocomplete=true&limit=6&language=en`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return NextResponse.json({ results: [] });
    const data = (await res.json()) as {
      features?: Array<{
        place_name?: string;
        text?: string;
        center?: [number, number];
        bbox?: [number, number, number, number];
      }>;
    };
    const results: GeoResult[] = (data.features ?? [])
      .map((f) => ({
        name: f.place_name ?? f.text ?? "",
        lng: f.center?.[0] ?? NaN,
        lat: f.center?.[1] ?? NaN,
        bbox: f.bbox,
      }))
      .filter((r) => Number.isFinite(r.lng) && Number.isFinite(r.lat));
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
