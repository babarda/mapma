// Deletes all objects under photos/ in the R2 bucket. Test-data cleanup helper.
// Run: node --env-file=.env.local scripts/r2-cleanup.mjs
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";

const c = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
const B = process.env.R2_BUCKET;

const l = await c.send(new ListObjectsV2Command({ Bucket: B, Prefix: "photos/" }));
const keys = (l.Contents || []).map((o) => ({ Key: o.Key }));
console.log("objects in bucket:", keys.length, keys.map((k) => k.Key));
if (keys.length) {
  await c.send(new DeleteObjectsCommand({ Bucket: B, Delete: { Objects: keys } }));
  console.log("deleted", keys.length, "object(s)");
}
