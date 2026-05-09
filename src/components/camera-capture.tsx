"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, RefreshCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  onCapture: (blob: Blob) => void;
  onCancel: () => void;
};

type FacingMode = "environment" | "user";

const ERROR_MESSAGES: Record<string, string> = {
  NotAllowedError: "카메라 접근이 차단됐어요. 브라우저 설정에서 권한을 허용해주세요.",
  NotFoundError: "사용할 수 있는 카메라를 찾지 못했어요.",
  NotReadableError: "다른 앱이 카메라를 쓰고 있는 것 같아요.",
  OverconstrainedError: "요청한 카메라 모드를 사용할 수 없어요.",
  SecurityError: "안전한 연결(HTTPS)에서만 카메라를 켤 수 있어요.",
};

export function CameraCapture({ onCapture, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<FacingMode>("environment");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let canceled = false;

    async function start() {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setError("이 브라우저는 카메라 API를 지원하지 않아요.");
        return;
      }
      stop();
      setReady(false);
      setError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        if (canceled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => undefined);
          setReady(true);
        }
      } catch (err) {
        if (canceled) return;
        const name = err instanceof Error ? err.name : "";
        setError(ERROR_MESSAGES[name] ?? "카메라를 켤 수 없어요.");
      }
    }

    start();
    return () => {
      canceled = true;
      stop();
    };
  }, [facing, stop]);

  function handleShutter() {
    const video = videoRef.current;
    if (!video || !ready) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(blob);
      },
      "image/jpeg",
      0.9,
    );
  }

  function handleFlip() {
    setFacing((f) => (f === "environment" ? "user" : "environment"));
  }

  return (
    <div className="relative flex h-full w-full flex-col bg-black text-white">
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 h-full w-full object-cover"
        />
        {!ready && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-[14px] text-white/65">
            카메라 준비 중…
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
            <div className="text-[14.5px] tracking-tight text-white/85">
              {error}
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setFacing((f) => f)}
            >
              다시 시도
            </Button>
          </div>
        )}
      </div>

      <div className="absolute right-4 top-4 flex gap-2">
        <button
          type="button"
          aria-label="카메라 닫기"
          onClick={onCancel}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 backdrop-blur ring-1 ring-white/15"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex items-center justify-between gap-6 px-8 py-6">
        <div className="w-12" />
        <button
          type="button"
          aria-label="사진 촬영"
          onClick={handleShutter}
          disabled={!ready}
          className="relative flex h-[72px] w-[72px] items-center justify-center rounded-full bg-white/10 ring-2 ring-white transition active:scale-95 disabled:opacity-40"
        >
          <span className="h-[58px] w-[58px] rounded-full bg-white" />
        </button>
        <button
          type="button"
          aria-label="카메라 전환"
          onClick={handleFlip}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20"
        >
          <RefreshCcw className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

export function CameraButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="lg"
      onClick={onClick}
      className={className}
    >
      <Camera className="h-5 w-5" />
      카메라로 찍기
    </Button>
  );
}
