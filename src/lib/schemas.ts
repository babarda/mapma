import { z } from "zod";

// What the AI returns for an uploaded photo. Everything tolerates null AND
// missing keys, because models return explicit null for fields they can't
// infer (e.g. an unidentifiable city); the validation UI lets the user fix.
export const aiSuggestionSchema = z.object({
  title: z.string().nullish().transform((v) => v ?? ""),
  description: z.string().nullish().transform((v) => v ?? ""),
  city: z.string().nullish().transform((v) => v ?? ""),
  region: z.string().nullish().transform((v) => v ?? null),
  lng: z.number().nullish().transform((v) => v ?? null),
  lat: z.number().nullish().transform((v) => v ?? null),
  year: z.number().int().nullish().transform((v) => v ?? null),
  landmarks: z.array(z.string()).nullish().transform((v) => v ?? []),
  architectureStyle: z.string().nullish().transform((v) => v ?? null),
  categories: z.array(z.string()).nullish().transform((v) => v ?? []),
  tags: z.array(z.string()).nullish().transform((v) => v ?? []),
  confidence: z.number().min(0).max(1).nullish().transform((v) => v ?? 0.5),
  // Scope verdict — the model judges whether the image belongs in MAPMA.
  isMorocco: z.boolean().nullish().transform((v) => v ?? false),
  isPre2000: z.boolean().nullish().transform((v) => v ?? false),
  isHeritage: z.boolean().nullish().transform((v) => v ?? false),
  accepted: z.boolean().nullish().transform((v) => v ?? false),
  rejectionReason: z.string().nullish().transform((v) => v ?? null),
});

export type AiSuggestion = z.infer<typeof aiSuggestionSchema>;

// What the client sends when publishing (after the user reviews/edits).
export const publishMetaSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().default(""),
  city: z.string().min(1, "City is required"),
  region: z.string().nullable().default(null),
  lng: z.number().refine((n) => n >= -18 && n <= 1, "Longitude out of range"),
  lat: z.number().refine((n) => n >= 20 && n <= 37, "Latitude out of range"),
  // MAPMA only archives material dating before 2000. A known year is
  // required so we can enforce that; modern photos are out of scope.
  year: z.number().int().min(1800).max(1999),
  // True when the year is a best-guess approximation ("circa").
  yearApproximate: z.boolean().default(false),
  categories: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  // Provenance / credit line (e.g. an archive name). Kept short.
  source: z.string().max(55).nullable().default(null),
  aiConfidence: z.number().min(0).max(1).nullable().default(null),
});

export type PublishMeta = z.infer<typeof publishMetaSchema>;
