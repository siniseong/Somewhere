"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      router.replace("/");
      return;
    }
    // detectSessionInUrl: true automatically exchanges ?code= in URL.
    // Wait for the session to land then redirect home.
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (data.session) {
          router.replace("/");
        } else {
          // sometimes session arrives slightly after first call; subscribe.
          const { data: sub } = supabase.auth.onAuthStateChange(
            (_event, session) => {
              if (session) router.replace("/");
            },
          );
          // Safety timeout
          window.setTimeout(() => {
            sub.subscription.unsubscribe();
            setError("로그인 처리에 실패했어요. 다시 시도해주세요.");
          }, 8000);
        }
      })
      .catch(() => setError("로그인 처리에 실패했어요. 다시 시도해주세요."));
  }, [router]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-[#141414] px-6 text-center">
      {error ? (
        <>
          <div className="text-[15px] text-rose-400">{error}</div>
          <button
            type="button"
            onClick={() => router.replace("/")}
            className="mt-4 rounded-full bg-white/10 px-4 py-2 text-[13px] text-white"
          >
            홈으로
          </button>
        </>
      ) : (
        <div className="text-[14px] text-white/55">로그인 중…</div>
      )}
    </main>
  );
}
