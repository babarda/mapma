// Quick end-to-end check of the upload pipeline against the dev server.
// Generates a test image, runs /api/analyze, /api/photos (publish), and GET list.
import sharp from "sharp";

const BASE = "http://localhost:3000";

async function makeImage() {
  return sharp({
    create: { width: 600, height: 400, channels: 3, background: { r: 120, g: 100, b: 70 } },
  })
    .jpeg()
    .toBuffer();
}

async function main() {
  const img = await makeImage();

  // 1) analyze
  const f1 = new FormData();
  f1.append("file", new Blob([img], { type: "image/jpeg" }), "test.jpg");
  const r1 = await fetch(`${BASE}/api/analyze`, { method: "POST", body: f1 });
  const a = await r1.json();
  console.log("ANALYZE", r1.status, JSON.stringify({ mock: a.mock, city: a.city, year: a.year, lng: a.lng, lat: a.lat }));

  // 2) publish
  const meta = {
    title: "E2E Test Photo",
    description: "Inserted by e2e script.",
    city: a.city || "Casablanca",
    region: a.region ?? null,
    lng: a.lng ?? -7.5898,
    lat: a.lat ?? 33.5731,
    year: a.year ?? 1950,
    categories: a.categories?.slice(0, 1) ?? ["Daily Life"],
    tags: ["e2e"],
    aiConfidence: a.confidence ?? 0.3,
  };
  const f2 = new FormData();
  f2.append("file", new Blob([img], { type: "image/jpeg" }), "test.jpg");
  f2.append("meta", JSON.stringify(meta));
  const r2 = await fetch(`${BASE}/api/photos`, { method: "POST", body: f2 });
  const p = await r2.json();
  console.log("PUBLISH", r2.status, JSON.stringify({ id: p.photo?.id, imageUrl: p.photo?.imageUrl, thumb: p.photo?.thumbnailUrl, status: p.photo?.status }));

  // 3) list
  const r3 = await fetch(`${BASE}/api/photos`);
  const l = await r3.json();
  console.log("LIST", r3.status, "count:", l.photos?.length, "hasE2E:", l.photos?.some((x) => x.title === "E2E Test Photo"));
}

main().catch((e) => {
  console.error("E2E FAILED:", e.message);
  process.exit(1);
});
