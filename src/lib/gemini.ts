import "server-only";

import { GoogleGenerativeAI } from "@google/generative-ai";

import { hasGemini } from "./env";
import { aiSuggestionSchema, type AiSuggestion } from "./schemas";
import { CATEGORIES } from "./types";

export interface AnalyzeResult extends AiSuggestion {
  /** True when the suggestion is a heuristic placeholder (no Gemini key). */
  mock: boolean;
}

const PROMPT = `You are the AI Historian Guide for MAPMA, an archive of Morocco's
historical photographic heritage. You are a professional historian specialized
in Moroccan history, Moroccan and Islamic architecture, and the French/Spanish
colonial period in Morocco. You are also a strict gatekeeper, NOT a generic
image describer. Most images people try to upload do NOT belong here — reject
them firmly.

MAPMA accepts an image ONLY if ALL THREE of these are true:
1. LOCATION: the photograph/painting was taken in Morocco (a Moroccan city,
   landscape, street, building, or clearly Moroccan people/scene).
2. AGE: it dates from BEFORE the year 2000. Modern/recent photos are rejected.
3. SUBJECT (heritage): it depicts historical heritage — architecture and
   places, medinas, kasbahs, ports, railways, markets/souks, groups of people
   dancing or in traditional dress, anthropological/daily-life scenes, or
   historical events. Reject selfies, memes, screenshots, documents, products,
   modern street photos, random objects, pets, food close-ups, AI art, etc.

CONFIDENCE — THE MOST IMPORTANT RULE. Be EXTREMELY conservative and humble.
Confidence is the probability that your specific claims (city, coordinates,
year) are actually CORRECT, not how detailed your guess is. Calibrate strictly:
- 0.85-1.0: ONLY when an unmistakable, famous landmark is clearly identifiable
  (e.g. Koutoubia, Hassan Tower, Bab Bou Jeloud) AND the date is well supported.
- 0.5-0.7: a confident region/city but the exact spot or year is uncertain.
- 0.2-0.4: a plausible but speculative guess from generic visual cues.
- 0.0-0.2: you are essentially guessing, or the image is ambiguous/unclear.
It is far better to under-state confidence and let a human historian correct
you than to assert a wrong answer with false certainty. When unsure of the
city, coordinates, or year, leave them null rather than inventing a value.
Never output a confidence above 0.5 unless you can name the concrete evidence
in the image that justifies it.

Give the best, most accurate estimate you genuinely can as a Moroccan-history
specialist — but reflect your true uncertainty in the confidence number.

Judge the image, then return ONLY a JSON object (no markdown, no commentary):
- "isMorocco": boolean — is this in Morocco?
- "isPre2000": boolean — does it date before the year 2000?
- "isHeritage": boolean — is the subject historical Moroccan heritage?
- "accepted": boolean — true ONLY if isMorocco AND isPre2000 AND isHeritage.
- "rejectionReason": if accepted is false, ONE short sentence (max 140 chars)
  telling the contributor why this is out of MAPMA's scope; else null.
- "title": short English title (max 80 chars).
- "description": 1-2 sentence historical description (max 280 chars).
- "city": Moroccan city name (only if reasonably sure), or null.
- "region": Moroccan administrative region, or null.
- "lng": longitude (number) within Morocco [-13.5..-1], or null if unsure.
- "lat": latitude (number) within Morocco [21..36], or null if unsure.
- "year": best estimate year (integer, must be < 2000), or null if unsure.
- "landmarks": array of recognizable landmark names (max 5).
- "architectureStyle": architecture style string or null.
- "categories": array, each one of: ${CATEGORIES.join(", ")}.
- "tags": array of short keyword strings (max 6).
- "confidence": number 0..1 — calibrated per the strict rules above.

If not accepted, you may still fill best-guess metadata, but accepted MUST
reflect the 3 rules.`;

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in response");
  return JSON.parse(raw.slice(start, end + 1));
}

// Plausible placeholder used when no Gemini key is set, so the upload +
// validation flow is fully exercisable in development.
function mockSuggestion(): AnalyzeResult {
  const samples = [
    { city: "Casablanca", region: "Casablanca-Settat", lng: -7.5898, lat: 33.5731 },
    { city: "Marrakech", region: "Marrakech-Safi", lng: -7.9811, lat: 31.6295 },
    { city: "Fes", region: "Fès-Meknès", lng: -4.9998, lat: 34.0331 },
    { city: "Tangier", region: "Tanger-Tétouan-Al Hoceïma", lng: -5.8129, lat: 35.7595 },
    { city: "Rabat", region: "Rabat-Salé-Kénitra", lng: -6.8498, lat: 34.0209 },
  ];
  const s = samples[Math.floor(Math.random() * samples.length)];
  const year = 1900 + Math.floor(Math.random() * 90);
  return {
    title: `Historical view of ${s.city}`,
    description: `A historical photograph that appears to show ${s.city} in the early-to-mid 20th century. (AI key not configured — this is a placeholder suggestion you can edit.)`,
    city: s.city,
    region: s.region,
    lng: s.lng,
    lat: s.lat,
    year,
    landmarks: [],
    architectureStyle: null,
    categories: ["Daily Life"],
    tags: [s.city.toLowerCase(), "historical"],
    confidence: 0.3,
    isMorocco: true,
    isPre2000: true,
    isHeritage: true,
    accepted: true,
    rejectionReason: null,
    mock: true,
  };
}

function clamp(s: string, max: number): string {
  return s.length > max ? s.slice(0, max).trimEnd() : s;
}

export async function analyzeImage(
  base64: string,
  mimeType: string,
): Promise<AnalyzeResult> {
  if (!hasGemini) return mockSuggestion();

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
  });

  const result = await model.generateContent([
    { inlineData: { data: base64, mimeType } },
    { text: PROMPT },
  ]);

  const parsed = aiSuggestionSchema.parse(extractJson(result.response.text()));
  // Keep only categories we recognize.
  const allowed = new Set<string>(CATEGORIES);
  parsed.categories = parsed.categories.filter((c) => allowed.has(c));
  // Enforce character limits and the scope rules server-side, regardless of
  // what the model returned, so the verdict can be trusted by callers.
  parsed.title = clamp(parsed.title, 80);
  parsed.description = clamp(parsed.description, 280);
  if (parsed.rejectionReason) parsed.rejectionReason = clamp(parsed.rejectionReason, 140);
  parsed.landmarks = parsed.landmarks.slice(0, 5);
  parsed.tags = parsed.tags.slice(0, 6);
  if (parsed.year != null && parsed.year >= 2000) parsed.isPre2000 = false;
  const accepted = parsed.isMorocco && parsed.isPre2000 && parsed.isHeritage;
  parsed.accepted = accepted;
  if (!accepted && !parsed.rejectionReason) {
    parsed.rejectionReason = !parsed.isMorocco
      ? "This image does not appear to be from Morocco, so it is outside MAPMA's scope."
      : !parsed.isPre2000
        ? "This image appears to date from 2000 or later; MAPMA only archives material from before 2000."
        : "This subject is not historical Moroccan heritage, so it is outside MAPMA's scope.";
  }
  return { ...parsed, mock: false };
}
