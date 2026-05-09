"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CameraCapture } from "@/components/camera-capture";

type Props = {
  preview: string | null;
  onPick: (file: Blob | null) => void;
};

export function PhotoStep({ preview, onPick }: Props) {
  const [cameraOpen, setCameraOpen] = useState(false);
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

      <div className="mt-6 flex-1">
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
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex h-full flex-col gap-3">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => setCameraOpen(true)}
              className="h-[120px] flex-col gap-2 rounded-3xl text-[15px]"
            >
              <Camera className="h-6 w-6" />
              카메라로 찍기
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => galleryInputRef.current?.click()}
              className="h-[88px] flex-col gap-2 rounded-3xl text-[14px]"
            >
              <ImagePlus className="h-5 w-5" />
              갤러리에서 가져오기
            </Button>
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleFile}
            />
          </div>
        )}
      </div>
    </div>
  );
}
