import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null | undefined;

/**
 * Returns a configured Supabase client when both env vars are present.
 * Otherwise returns null so callers can fall back to local storage.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient !== undefined) return cachedClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    cachedClient = null;
    return null;
  }
  cachedClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return cachedClient;
}

export const PHOTO_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_PHOTO_BUCKET ?? "memory-photos";
