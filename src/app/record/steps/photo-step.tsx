"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, X } from "lucide-react";
import { motion } from "framer-motion";
import { CameraCapture } from "@/components/camera-capture";

type Props = {
  preview: string | null;
  onPick: (file: Blob | null) => void;
};

type Mode = "camera" | "gallery";

export function PhotoStep({ preview, onPick }: Props) {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("camera");
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onPick(file);
    e.target.value = "";
  }

  function handleCapture(blob: Blob) {
    setCameraOpen(false);
    onPick(blob);
  }

  if (cameraOpen) {
    return (
      <div className="fixed inset-0 z-[60]">
        <CameraCapture
          onCapture={handleCapture}
          onCancel={() => setCameraOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <p className="text-[14px] leading-relaxed text-white/55">
        지금 보이는 풍경을 한 장 찍어주세요. 갤러리에서 골라도 괜찮아요.
      </p>

      {!preview && (
        <div className="mt-6 flex rounded-full bg-white/[0.06] p-1 ring-1 ring-white/10">
          {(["camera", "gallery"] as const).map((m) => {
            const active = mode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className="relative flex-1 rounded-full py-2 text-[14px] font-medium"
              >
                {active && (
                  <motion.span
                    layoutId="photo-mode-indicator"
                    className="absolute inset-0 rounded-full bg-white/[0.16] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span
                  className={`relative ${active ? "text-white" : "text-white/55"}`}
                >
                  {m === "camera" ? "촬영" : "선택"}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-5 flex-1">
        {preview ? (
          <div className="relative h-full w-full overflow-hidden rounded-3xl ring-1 ring-white/[0.08]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="첨부 미리보기"
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() => onPick(null)}
              aria-label="사진 제거"
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-md ring-1 ring-white/10 active:scale-95"
            >
              <X className="h-4 w-4" strokeWidth={2.4} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={
              mode === "camera"
                ? () => setCameraOpen(true)
                : () => galleryInputRef.current?.click()
            }
            className="group flex h-full w-full flex-col items-center justify-center gap-4 overflow-hidden rounded-3xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] ring-1 ring-white/[0.08] transition active:scale-[0.99]"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.08] ring-1 ring-white/10 transition group-active:scale-95">
              {mode === "camera" ? (
                <Camera
                  className="h-7 w-7 text-white/85"
                  strokeWidth={1.8}
                />
              ) : (
                <ImagePlus
                  className="h-7 w-7 text-white/85"
                  strokeWidth={1.8}
                />
              )}
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-[16px] font-medium tracking-tight text-white">
                {mode === "camera" ? "탭해서 촬영" : "갤러리에서 선택"}
              </span>
              <span className="text-[12.5px] text-white/45">
                {mode === "camera"
                  ? "지금 이 순간을 카메라로"
                  : "이미 담아둔 한 컷을 불러와요"}
              </span>
            </div>
          </button>
        )}
      </div>

      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleFile}
      />
    </div>
  );
}
