import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseClient } from "./supabase";

export async function getSession(): Promise<Session | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  return session?.user ?? null;
}

export async function isLoggedInAsync(): Promise<boolean> {
  const session = await getSession();
  return !!session;
}

/**
 * Sync best-effort check (reads cached session from supabase-js localStorage).
 * For first render guards. May briefly mismatch real state until getSession resolves.
 */
export function isLoggedInSync(): boolean {
  if (typeof window === "undefined") return false;
  for (const key of Object.keys(window.localStorage)) {
    if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.access_token) return true;
      } catch {
        // ignore
      }
    }
  }
  return false;
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) await supabase.auth.signOut();
}

export async function signInWithKakao(redirectTo?: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  await supabase.auth.signInWithOAuth({
    provider: "kakao",
    options: {
      redirectTo:
        redirectTo ??
        (typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback`
          : undefined),
    },
  });
}
