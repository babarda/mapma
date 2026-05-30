"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Browser Supabase client (anon key). Safe to expose — RLS enforces access.
// Returns null if env is not configured yet, so the app still runs on seed data.
let cached: SupabaseClient | null = null;

export function getSupabaseBrowser(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  if (!cached) cached = createClient(url, anon);
  return cached;
}
