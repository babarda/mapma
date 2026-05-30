// Centralized "is this service configured?" flags. Every feature degrades
// gracefully when its service is missing, so the app always runs:
//   - AI        -> mock analyzer when GEMINI_API_KEY absent
//   - Storage   -> local public/uploads/ when R2 absent
//   - Database  -> local .data/photos.json when Supabase absent
//   - Auth      -> guest uploads when Supabase absent

export const hasSupabase = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const hasSupabaseAdmin = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export const hasR2 = Boolean(
  process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET &&
    process.env.R2_PUBLIC_URL,
);

export const hasGemini = Boolean(process.env.GEMINI_API_KEY);
