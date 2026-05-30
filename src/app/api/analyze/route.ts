import { NextResponse } from "next/server";

import { getUserIdFromRequest } from "@/lib/auth";
import { analyzeImage } from "@/lib/gemini";
import { checkAnalyze, clientKey, recordVerdict } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 12 * 1024 * 1024; // 12MB

// POST multipart/form-data with field `file` (image). Returns AI suggestions.
export async function POST(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req);
    const key = clientKey(req, userId);

    // Protect the Gemini budget from rapid-fire dumps.
    const gate = checkAnalyze(key);
    if (!gate.allowed) {
      return NextResponse.json(
        { error: gate.message, retryAfter: gate.retryAfter },
        { status: 429, headers: { "Retry-After": String(gate.retryAfter ?? 60) } },
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image too large (max 12MB)" }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const suggestion = await analyzeImage(base64, file.type);

    // Track out-of-scope uploads; repeated rejections flag a suspension risk.
    const tracking = recordVerdict(key, suggestion.accepted);
    return NextResponse.json({ ...suggestion, ...tracking });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
