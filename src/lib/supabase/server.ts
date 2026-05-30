import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-side admin client (service role key). NEVER import into client code.
// Used by API routes / server actions for trusted operations.
export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    // supabase-js uses the global fetch, which Next.js caches in its Data
    // Cache by default. That made server-rendered reads (the map) serve a
    // stale empty result after a publish. Force every read to be uncached.
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}
