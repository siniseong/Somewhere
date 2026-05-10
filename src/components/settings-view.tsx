"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isLoggedInSync } from "@/lib/auth";
import { getSupabaseClient } from "@/lib/supabase";
import { getUserName, setUserName } from "@/lib/user";

export function SettingsView() {
  const router = useRouter();
  const [name, setName] = useState(() => {
    if (typeof window === "undefined") return "";
    return getUserName();
  });
  const [originalName, setOriginalName] = useState(name);
  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isLoggedInSync()) {
      router.replace("/");
      return;
    }
    const t = window.setTimeout(() => inputRef.current?.focus(), 200);
    return () => window.clearTimeout(t);
  }, [router]);

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed || saving || trimmed === originalName) return;
    setSaving(true);
    try {
      setUserName(trimmed);
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.auth.updateUser({ data: { name: trimmed } });
      }
      setOriginalName(trimmed);
      setSavedTick(true);
      window.setTimeout(() => setSavedTick(false), 1500);
    } finally {
      setSaving(false);
    }
  }

  const dirty = name.trim() && name.trim() !== originalName;

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex flex-col gap-3 px-5 pt-[max(env(safe-area-inset-top,0px),16px)]">
        <div className="flex h-10 items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="뒤로"
            className="-ml-2 flex h-10 w-10 items-center justify-center active:scale-95"
          >
            <ChevronLeft className="h-7 w-7 text-white" strokeWidth={2.5} />
          </button>
          <span className="text-[15px] font-medium text-white">설정</span>
          <div className="w-10" />
        </div>
      </header>

      <div className="flex-1 px-5 pt-8">
        <h1 className="text-[24px] font-medium leading-tight tracking-tight text-white">
          이름
        </h1>
        <p className="mt-1 text-[13px] text-white/55">
          somr에 나타나는 닉네임이에요
        </p>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
          }}
          className="mt-6 w-full border-b border-white/15 bg-transparent pb-2 text-[28px] font-medium tracking-tight text-white outline-none focus:border-white/55"
        />
      </div>

      <footer className="px-5 pb-[max(env(safe-area-inset-bottom,0px),20px)] pt-2">
        <Button
          type="button"
          size="lg"
          disabled={!dirty || saving}
          onClick={handleSave}
          className="w-full"
        >
          {saving ? (
            "저장 중…"
          ) : savedTick ? (
            <>
              <Check className="h-4 w-4" />
              저장됨
            </>
          ) : (
            "저장"
          )}
        </Button>
      </footer>
    </div>
  );
}
