import "server-only";

import { createClient } from "@supabase/supabase-js";

import { hasSupabase } from "./env";

// Resolves the authenticated user id from a request's Bearer token.
// Returns null when Supabase isn't configured (guest mode) or no valid token.
export async function getUserIdFromRequest(req: Request): Promise<string | null> {
  if (!hasSupabase) return null;
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  );
  const { data, error } = await sb.auth.getUser(token);
  if (error) return null;
  return data.user?.id ?? null;
}
