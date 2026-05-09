"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, MapPin } from "lucide-react";
import { COLORS } from "@/lib/colors";
import { saveMemory } from "@/lib/db";
import { processAndStorePhoto } from "@/lib/photo";
import type { Memory } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ColorStep } from "./steps/color-step";
import { NoteStep } from "./steps/note-step";
import { PhotoStep } from "./steps/photo-step";
import { ConfirmStep } from "./steps/confirm-step";

type StepId = "color" | "note" | "photo" | "confirm";

const STEPS: StepId[] = ["color", "note", "photo", "confirm"];

export type Draft = {
  colorId: string;
  note: string;
  photoFile: Blob | null;
  photoPreview: string | null;
};

function makeId() {
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function RecordFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const lng = Number(params.get("lng"));
  const lat = Number(params.get("lat"));
  const placeName = params.get("place") ?? undefined;
  const address = params.get("addr") ?? undefined;
  const validLocation = Number.isFinite(lng) && Number.isFinite(lat);

  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Draft>({
    colorId: COLORS[0].id,
    note: "",
    photoFile: null,
    photoPreview: null,
  });

  const previousPreviewRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previousPreviewRef.current) URL.revokeObjectURL(previousPreviewRef.current);
    };
  }, []);

  const currentStep = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  const canAdvance = useMemo(() => {
    switch (currentStep) {
      case "color":
        return Boolean(draft.colorId);
      case "note":
        return draft.note.trim().length > 0;
      case "photo":
        return true; // photo is optional
      case "confirm":
        return true;
    }
  }, [currentStep, draft]);

  function goNext() {
    if (!canAdvance) return;
    if (isLast) {
      void handleSave();
      return;
    }
    setDirection(1);
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function goBack() {
    if (stepIndex === 0) {
      router.back();
      return;
    }
    setDirection(-1);
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  function handlePickPhoto(file: Blob | null) {
    if (previousPreviewRef.current) {
      URL.revokeObjectURL(previousPreviewRef.current);
      previousPreviewRef.current = null;
    }
    const preview = file ? URL.createObjectURL(file) : null;
    if (preview) previousPreviewRef.current = preview;
    setDraft((d) => ({ ...d, photoFile: file, photoPreview: preview }));
  }

  async function handleSave() {
    if (saving || !validLocation) return;
    setSaving(true);
    try {
      let photoId: string | undefined;
      let photoUrl: string | undefined;
      let photoThumb: string | undefined;
      if (draft.photoFile) {
        const processed = await processAndStorePhoto(draft.photoFile);
        photoId = processed.photoId;
        photoUrl = processed.photoUrl;
        photoThumb = processed.thumbDataUrl;
      }
      const memory: Memory = {
        id: makeId(),
        lat,
        lng,
        placeName,
        address,
        colorId: draft.colorId,
        note: draft.note.trim(),
        photoId,
        photoUrl,
        photoThumb,
        createdAt: Date.now(),
      };
      await saveMemory(memory);
      router.replace("/?saved=1");
    } catch (err) {
      console.error("save failed", err);
      setSaving(false);
    }
  }

  if (!validLocation) {
    return (
      <div className="flex flex-1 items-center justify-center px-8 text-center text-[14px] text-white/55">
        위치 정보를 받아오지 못했어요. 지도에서 다시 시작해주세요.
      </div>
    );
  }

  const stepLabels: Record<StepId, string> = {
    color: "오늘의 색을 골라주세요",
    note: "한 줄로 남겨볼까요",
    photo: "이 순간을 찍어볼까요",
    confirm: "이대로 기록할게요",
  };

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex flex-col gap-3 px-5 pt-[max(env(safe-area-inset-top,0px),16px)]">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={goBack}
            aria-label="뒤로"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] ring-1 ring-white/10 active:scale-95"
          >
            <ArrowLeft className="h-4 w-4 text-white" />
          </button>
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <span
                key={s}
                className={
                  i <= stepIndex
                    ? "h-1 w-6 rounded-full bg-white transition"
                    : "h-1 w-6 rounded-full bg-white/15 transition"
                }
              />
            ))}
          </div>
          <div className="w-10" />
        </div>

        {(placeName || address) && (
          <div className="flex items-center gap-2 truncate text-[12.5px] text-white/55">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{placeName || address}</span>
          </div>
        )}

        <h1 className="mt-2 text-[24px] font-semibold leading-tight tracking-tight text-white">
          {stepLabels[currentStep]}
        </h1>
      </header>

      <div className="relative mt-6 flex-1 overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={currentStep}
            custom={direction}
            initial={{ opacity: 0, x: direction === 1 ? 24 : -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction === 1 ? -24 : 24 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            className="absolute inset-0 flex flex-col px-5 pb-4"
          >
            {currentStep === "color" && (
              <ColorStep
                value={draft.colorId}
                onChange={(id) => setDraft((d) => ({ ...d, colorId: id }))}
              />
            )}
            {currentStep === "note" && (
              <NoteStep
                value={draft.note}
                onChange={(v) => setDraft((d) => ({ ...d, note: v }))}
                onSubmit={goNext}
              />
            )}
            {currentStep === "photo" && (
              <PhotoStep
                preview={draft.photoPreview}
                onPick={handlePickPhoto}
              />
            )}
            {currentStep === "confirm" && (
              <ConfirmStep
                draft={draft}
                placeName={placeName}
                address={address}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <footer className="px-5 pb-[max(env(safe-area-inset-bottom,0px),20px)] pt-2">
        <Button
          type="button"
          size="lg"
          onClick={goNext}
          disabled={!canAdvance || saving}
          className="w-full"
        >
          {saving
            ? "저장하는 중…"
            : isLast
              ? "기록 완성"
              : currentStep === "photo" && !draft.photoFile
                ? "사진 없이 다음"
                : "다음"}
        </Button>
      </footer>
    </div>
  );
}
