"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addTeam, type Team } from "@/lib/teams";

export function TeamNewView() {
  const router = useRouter();
  const [step, setStep] = useState<"name" | "code">("name");
  const [name, setName] = useState("");
  const [created, setCreated] = useState<Team | null>(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (step !== "name") return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 200);
    return () => window.clearTimeout(t);
  }, [step]);

  function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const team = addTeam(trimmed);
    setCreated(team);
    setStep("code");
  }

  function handleCopy() {
    if (!created || typeof navigator === "undefined" || !navigator.clipboard)
      return;
    navigator.clipboard.writeText(created.code).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  }

  function handleBack() {
    if (step === "code") {
      router.replace("/");
      return;
    }
    router.back();
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex flex-col gap-3 px-5 pt-[max(env(safe-area-inset-top,0px),16px)]">
        <div className="flex h-10 items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            aria-label="뒤로"
            className="-ml-2 flex h-10 w-10 items-center justify-center active:scale-95"
          >
            <ChevronLeft className="h-7 w-7 text-white" strokeWidth={2.5} />
          </button>
          <span className="text-[15px] font-medium text-white">팀 만들기</span>
          <div className="w-10" />
        </div>
      </header>

      <div className="flex flex-1 flex-col px-5 pt-8">
        {step === "name" ? (
          <>
            <h1 className="text-[28px] font-medium leading-tight tracking-tight text-white">
              팀 이름을 정해주세요
            </h1>
            <p className="mt-2 text-[14px] text-white/55">
              친구들과 함께 쓸 팀이에요
            </p>
            <div className="mt-10">
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                }}
                placeholder="예: 여행 추억"
                maxLength={20}
                className="w-full bg-transparent text-[28px] font-medium tracking-tight text-white outline-none placeholder:text-white/25"
              />
            </div>
          </>
        ) : (
          <>
            <h1 className="text-[28px] font-medium leading-tight tracking-tight text-white">
              팀이 만들어졌어요
            </h1>
            <p className="mt-2 text-[14px] text-white/55">
              친구에게 코드를 공유해서 함께 써보세요
            </p>
            <div className="mt-10 flex flex-col items-start gap-5">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="flex h-14 w-12 items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] text-[24px] font-bold text-white"
                    >
                      {created?.code[i] ?? ""}
                    </div>
                  ))}
                </div>
                <span className="block h-px w-3 bg-white/30" aria-hidden />
                <div className="flex gap-1.5">
                  {[3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="flex h-14 w-12 items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] text-[24px] font-bold text-white"
                    >
                      {created?.code[i] ?? ""}
                    </div>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-[13px] text-white active:scale-95"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    복사됨
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    코드 복사
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>

      <footer className="px-5 pb-[max(env(safe-area-inset-bottom,0px),20px)] pt-2">
        {step === "name" ? (
          <Button
            type="button"
            size="lg"
            disabled={!name.trim()}
            onClick={handleCreate}
            className="w-full"
          >
            만들기
          </Button>
        ) : (
          <Button
            type="button"
            size="lg"
            onClick={() => router.replace("/")}
            className="w-full"
          >
            완료
          </Button>
        )}
      </footer>
    </div>
  );
}
