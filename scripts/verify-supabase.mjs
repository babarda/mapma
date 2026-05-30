// Live verification against a configured Supabase project.
// Creates a confirmed test user (admin), signs in for a token, then runs the
// analyze -> publish -> list pipeline against the dev server.
// Run: node --env-file=.env.local scripts/verify-supabase.mjs
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const BASE = process.env.BASE || "http://localhost:3001";
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !ANON || !SERVICE) {
  console.error("Missing Supabase env. Run with: node --env-file=.env.local scripts/verify-supabase.mjs");
  process.exit(1);
}

const TEST_EMAIL = `mapma-verify+${Date.now()}@example.com`;
const TEST_PASSWORD = "Test-Verify-123!";

async function main() {
  const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

  // 1) Create a confirmed user via admin API.
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (cErr) throw new Error(`createUser: ${cErr.message}`);
  const userId = created.user.id;
  console.log("USER", userId, TEST_EMAIL);

  // 2) Sign in to obtain an access token.
  const anon = createClient(URL, ANON, { auth: { persistSession: false } });
  const { data: signIn, error: sErr } = await anon.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  if (sErr) throw new Error(`signIn: ${sErr.message}`);
  const token = signIn.session.access_token;
  console.log("TOKEN", token ? "obtained" : "MISSING");

  // 3) Make a test image.
  const img = await sharp({
    create: { width: 600, height: 400, channels: 3, background: { r: 120, g: 100, b: 70 } },
  }).jpeg().toBuffer();

  // 4) analyze
  const f1 = new FormData();
  f1.append("file", new Blob([img], { type: "image/jpeg" }), "test.jpg");
  const r1 = await fetch(`${BASE}/api/analyze`, { method: "POST", body: f1 });
  const a = await r1.json();
  console.log("ANALYZE", r1.status, JSON.stringify({ mock: a.mock, city: a.city, year: a.year }));

  // 5) publish (authenticated)
  const meta = {
    title: "Supabase Verify Photo",
    description: "Inserted by verify-supabase script.",
    city: a.city || "Casablanca",
    region: a.region ?? null,
    lng: a.lng ?? -7.5898,
    lat: a.lat ?? 33.5731,
    year: a.year ?? 1950,
    categories: a.categories?.slice(0, 1) ?? ["Daily Life"],
    tags: ["verify"],
    aiConfidence: a.confidence ?? 0.3,
  };
  const f2 = new FormData();
  f2.append("file", new Blob([img], { type: "image/jpeg" }), "test.jpg");
  f2.append("meta", JSON.stringify(meta));
  const r2 = await fetch(`${BASE}/api/photos`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: f2,
  });
  const p = await r2.json();
  console.log("PUBLISH", r2.status, JSON.stringify({ id: p.photo?.id, status: p.photo?.status, imageUrl: p.photo?.imageUrl }));

  // 6) list (should include the new photo)
  const r3 = await fetch(`${BASE}/api/photos`);
  const l = await r3.json();
  console.log("LIST", r3.status, "count:", l.photos?.length, "hasVerify:", l.photos?.some((x) => x.title === "Supabase Verify Photo"));

  // 7) confirm row exists directly in Supabase, then clean up.
  const { data: rows } = await admin.from("photos").select("id,title,status").eq("id", p.photo?.id);
  console.log("DB ROW", JSON.stringify(rows));

  if (p.photo?.id) {
    await admin.from("photos").delete().eq("id", p.photo.id);
    console.log("CLEANUP photo deleted");
  }
  await admin.auth.admin.deleteUser(userId);
  console.log("CLEANUP user deleted");
}

main().catch((e) => {
  console.error("VERIFY FAILED:", e.message);
  process.exit(1);
});
