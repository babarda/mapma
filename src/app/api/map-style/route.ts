import { NextResponse } from "next/server";

// Serves the MapLibre style for the map. We proxy MapTiler's style JSON so we
// can strip the "disputed border" layer — that layer draws the dashed line
// between Morocco and Western Sahara, and MAPMA renders Morocco as a single
// uninterrupted territory. Falls back to OpenFreeMap when no MapTiler key.

export const runtime = "nodejs";
export const revalidate = 86400; // cache the upstream style for a day

// Base style id. "dataviz" is a clean, warm, low-clutter style that suits the
// archival aesthetic. Swap for "bright-v2" / "basic-v2" to taste.
const STYLE = "dataviz";
const OPENFREEMAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

interface StyleLayer {
  id?: string;
  type?: string;
  filter?: unknown;
  [k: string]: unknown;
}

// True when a layer renders a disputed boundary (Morocco / Western Sahara, etc.).
function isDisputedBoundary(layer: StyleLayer): boolean {
  const id = String(layer.id ?? "").toLowerCase();
  if (id.includes("disputed")) return true;
  const filter = JSON.stringify(layer.filter ?? "");
  return /"disputed",\s*1/.test(filter);
}

// Name variants MapTiler may use for the Western Sahara label. MAPMA renders
// Morocco as a single territory, so this label is suppressed everywhere.
const WESTERN_SAHARA_NAMES = [
  "Western Sahara",
  "Sahara occidental",
  "Sáhara Occidental",
  "Sahara Occidental",
  "الصحراء الغربية",
  "الصحراء",
];

// Property keys MapTiler may store the place name under (the text-field reads
// from these).
const NAME_KEYS = ["name:latin", "name", "name:en", "name:fr", "name:es", "name:ar"];

// Hide the Western Sahara place label by AND-ing an exclusion into every symbol
// layer's filter. MapTiler's upstream filters use *legacy* filter syntax, and
// MapLibre treats an ["all", ...] as legacy if any branch is legacy — which
// would silently coerce a modern expression branch to `true`. So the exclusion
// must also be legacy syntax: exclude features whose name matches a variant.
function suppressWesternSaharaLabel(layer: StyleLayer): StyleLayer {
  if (layer.type !== "symbol") return layer;
  const exclusion: unknown = [
    "all",
    ...NAME_KEYS.map((k) => ["!in", k, ...WESTERN_SAHARA_NAMES]),
  ];
  const filter =
    layer.filter == null ? exclusion : ["all", layer.filter, exclusion];
  return { ...layer, filter };
}

export async function GET() {
  const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  const upstream = key
    ? `https://api.maptiler.com/maps/${STYLE}/style.json?key=${key}`
    : OPENFREEMAP_STYLE;

  const res = await fetch(upstream);
  if (!res.ok) {
    return NextResponse.json(
      { error: `Upstream style fetch failed (${res.status})` },
      { status: 502 },
    );
  }

  const style = (await res.json()) as { layers?: StyleLayer[] };
  if (Array.isArray(style.layers)) {
    style.layers = style.layers
      .filter((l) => !isDisputedBoundary(l))
      .map(suppressWesternSaharaLabel);
  }

  return NextResponse.json(style, {
    headers: { "Cache-Control": "public, max-age=86400" },
  });
}
