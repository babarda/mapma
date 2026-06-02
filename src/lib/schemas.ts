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

// A visitor comment on a photo. Comments are open to guests, so the payload
// includes an optional display name and a honeypot field that must stay empty.
export const commentSchema = z.object({
  photoId: z.string().uuid("Invalid photo"),
  body: z.string().trim().min(1, "Write a comment").max(1000, "Comment is too long"),
  authorName: z
    .string()
    .trim()
    .max(40, "Name is too long")
    .optional()
    .transform((v) => (v ? v : null)),
  // Honeypot: real users never see/fill this. Bots do. Must be empty.
  website: z.string().max(0).optional(),
});

export type CommentInput = z.infer<typeof commentSchema>;

// Admin edit of any photo's metadata + location. Every field is optional so
// the dashboard can send partial updates; only provided keys are changed.
export const adminPhotoUpdateSchema = z.object({
  title: z.string().trim().min(1, "Title is required").optional(),
  description: z.string().nullable().optional(),
  city: z.string().trim().min(1, "City is required").optional(),
  region: z.string().trim().nullable().optional(),
  lng: z
    .number()
    .refine((n) => n >= -18 && n <= 1, "Longitude out of range")
    .optional(),
  lat: z
    .number()
    .refine((n) => n >= 20 && n <= 37, "Latitude out of range")
    .optional(),
  year: z.number().int().min(1800).max(1999).nullable().optional(),
  yearApproximate: z.boolean().optional(),
  categories: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  source: z.string().trim().max(55).nullable().optional(),
  status: z.enum(["draft", "pending", "verified", "flagged"]).optional(),
});

export type AdminPhotoUpdate = z.infer<typeof adminPhotoUpdateSchema>;

// Admin changing another account's role from the dashboard.
export const userRoleSchema = z.object({
  role: z.enum(["member", "moderator", "admin"]),
});

export type UserRoleInput = z.infer<typeof userRoleSchema>;

// Setting a public display name from the profile page. Empty clears it.
export const displayNameSchema = z.object({
  username: z
    .string()
    .trim()
    .max(40, "Display name is too long")
    .transform((v) => (v ? v : null))
    .nullable(),
});
