// MAPMA backup — exports the database (the metadata "treasure") AND downloads
// every R2 image into a single dated folder under ./backups/.
//
// Run:  node --env-file=.env.local scripts/backup.mjs
//   (or: npm run backup)
//
// Requires these in .env.local (copy the values from Vercel if missing):
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
//
// Output: ./backups/<timestamp>/
//   db/photos.json, profiles.json, comments.json, suggestions.json, auth_users.json
//   images/photos/<...>.jpg            (every object in the bucket)
//   manifest.json                      (counts + timestamp)
//
// After it runs, copy the dated folder to a cloud drive / external disk. With
// this in hand you could rebuild the whole archive even if Supabase vanished.

import { createClient } from "@supabase/supabase-js";
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const root = path.join(process.cwd(), "backups", stamp);
const dbDir = path.join(root, "db");
await mkdir(dbDir, { recursive: true });

const summary = { tables: {}, images: 0 };

// ---------------------------------------------------------------------------
// 1) Database tables (data export — schema already lives in supabase/migrations)
// ---------------------------------------------------------------------------
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("✗ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

const TABLES = ["photos", "profiles", "comments", "suggestions"];
for (const table of TABLES) {
  const { data, error } = await sb.from(table).select("*");
  if (error) {
    console.warn(`! ${table}: ${error.message}`);
    summary.tables[table] = `error: ${error.message}`;
    continue;
  }
  await writeFile(path.join(dbDir, `${table}.json`), JSON.stringify(data, null, 2));
  summary.tables[table] = data.length;
  console.log(`✓ ${table}: ${data.length} rows`);
}

// Auth users (emails + sign-in times) via the admin API.
try {
  const { data, error } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  const users = data.users.map((u) => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at,
  }));
  await writeFile(path.join(dbDir, "auth_users.json"), JSON.stringify(users, null, 2));
  summary.tables.auth_users = users.length;
  console.log(`✓ auth_users: ${users.length}`);
} catch (e) {
  console.warn(`! auth_users: ${e.message}`);
}

// ---------------------------------------------------------------------------
// 2) R2 images — list the whole bucket and download every object
// ---------------------------------------------------------------------------
if (process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_BUCKET) {
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
  const bucket = process.env.R2_BUCKET;
  let token;
  do {
    const list = await s3.send(
      new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }),
    );
    for (const obj of list.Contents || []) {
      const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: obj.Key }));
      const bytes = Buffer.from(await res.Body.transformToByteArray());
      const dest = path.join(root, "images", obj.Key);
      await mkdir(path.dirname(dest), { recursive: true });
      await writeFile(dest, bytes);
      summary.images++;
    }
    token = list.IsTruncated ? list.NextContinuationToken : undefined;
  } while (token);
  console.log(`✓ images: ${summary.images} files`);
} else {
  console.warn("! R2 env missing — skipped image download");
}

// ---------------------------------------------------------------------------
// 3) Manifest
// ---------------------------------------------------------------------------
await writeFile(
  path.join(root, "manifest.json"),
  JSON.stringify({ createdAt: new Date().toISOString(), ...summary }, null, 2),
);

console.log(`\n✅ Backup complete → ${root}`);
console.log("   Copy this folder to a cloud drive or external disk to keep it safe.");
