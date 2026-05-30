import "server-only";

import { hasR2 } from "./env";

// Stores an image and returns a public URL.
// Production: Cloudflare R2 (S3-compatible). Dev fallback: public/uploads/.
export async function putImage(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  if (hasR2) {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
      },
    });
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    const base = (process.env.R2_PUBLIC_URL as string).replace(/\/$/, "");
    return `${base}/${key}`;
  }

  // Dev fallback: write under public/uploads so it serves at /uploads/<key>.
  const { writeFile, mkdir } = await import("node:fs/promises");
  const path = await import("node:path");
  const filePath = path.join(process.cwd(), "public", "uploads", key);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, body);
  return `/uploads/${key}`;
}
