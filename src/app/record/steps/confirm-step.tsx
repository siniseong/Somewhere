"use client";

import { MapPin } from "lucide-react";
import { COLORS } from "@/lib/colors";
import type { Draft } from "../record-flow";

type Props = {
  draft: Draft;
  placeName?: string;
  address?: string;
};

export function ConfirmStep({ draft, placeName, address }: Props) {
  const color = COLORS.find((c) => c.id === draft.colorId) ?? COLORS[0];

  return (
    <div className="flex flex-1 flex-col gap-5">
      <p className="text-[14px] leading-relaxed text-white/55">
        이 한 장면을 영원히 남길게요.
      </p>

      <div className="rounded-3xl bg-white/[0.04] ring-1 ring-white/[0.08]">
        {draft.photoPreview && (
          <div className="overflow-hidden rounded-t-3xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={draft.photoPreview}
              alt="기록할 사진"
              className="aspect-[4/3] w-full object-cover"
            />
          </div>
        )}

        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-center gap-2.5">
            <span
              className="h-3 w-3 rounded-full"
              style={{
                backgroundColor: color.hex,
                boxShadow: `0 0 0 4px ${color.hex}28`,
              }}
              aria-hidden
            />
            <span className="text-[12px] uppercase tracking-[0.08em] text-white/55">
              {color.label}
            </span>
          </div>

          <div className="text-[20px] font-medium leading-snug tracking-tight text-white">
            {draft.note.trim() || (
              <span className="text-white/35">기록 한 줄 없음</span>
            )}
          </div>

          {(placeName || address) && (
            <div className="flex items-start gap-2 border-t border-white/[0.06] pt-4 text-[13px] text-white/65">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/45" />
              <div className="min-w-0 flex-1">
                {placeName && (
                  <div className="truncate text-white">{placeName}</div>
                )}
                {address && (
                  <div className="mt-0.5 truncate text-white/55">{address}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
