"use client";

import { useState } from "react";
import { deleteMemory } from "@/lib/db";
import { getColor } from "@/lib/colors";
import type { Memory } from "@/lib/types";

type Props = {
  memory: Memory;
  onDeleted: () => void;
};

export function MemoryCard({ memory, onDeleted }: Props) {
  const color = getColor(memory.colorId);
  const [deleting, setDeleting] = useState(false);

  const dateObj = new Date(memory.createdAt);
  const dateStr = dateObj.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = dateObj.toLocaleTimeString("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
  });

  async function handleDelete() {
    if (deleting) return;
    if (!window.confirm("이 기록을 지울까요?")) return;
    setDeleting(true);
    try {
      await deleteMemory(memory.id);
      onDeleted();
    } catch (err) {
      console.error(err);
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{
              backgroundColor: color.hex,
              boxShadow: `0 0 0 4px ${color.hex}22, 0 0 12px ${color.hex}55`,
            }}
            aria-hidden
          />
          <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500">
            {color.label}
          </span>
        </div>
        {memory.placeName && (
          <h2 className="text-[22px] font-semibold leading-tight tracking-tight text-zinc-100">
            {memory.placeName}
          </h2>
        )}
        {memory.address && memory.address !== memory.placeName && (
          <p className="text-[12px] text-zinc-500">{memory.address}</p>
        )}
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          <span>
            {dateStr} · {timeStr}
          </span>
        </div>
      </div>

      {memory.photo && (
        <div className="overflow-hidden rounded-[20px] ring-1 ring-white/10 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={memory.photo}
            alt=""
            className="aspect-square w-full object-cover"
          />
        </div>
      )}

      {memory.note && (
        <p className="whitespace-pre-wrap text-[15px] leading-7 tracking-tight text-zinc-100">
          {memory.note}
        </p>
      )}

      {memory.music && (memory.music.title || memory.music.artist) && (
        <div
          className="relative overflow-hidden rounded-2xl ring-1 ring-white/[0.06]"
          style={{
            background: `linear-gradient(135deg, ${color.hex}1a 0%, rgba(24,24,27,0.6) 60%)`,
          }}
        >
          <div className="flex items-center gap-3.5 px-4 py-3.5">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
              style={{
                backgroundColor: `${color.hex}28`,
                boxShadow: `inset 0 0 0 1px ${color.hex}44`,
              }}
              aria-hidden
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: color.hex }}
              >
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-500">
                어울리는 음악
              </p>
              <p className="mt-0.5 truncate text-[14px] tracking-tight text-zinc-100">
                {memory.music.title || (
                  <span className="text-zinc-500">제목 없음</span>
                )}
                {memory.music.artist && (
                  <span className="text-zinc-500">
                    {memory.music.title ? " · " : ""}
                    {memory.music.artist}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="pt-1">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs text-zinc-500 transition hover:text-zinc-300 disabled:opacity-50"
        >
          {deleting ? "삭제 중..." : "이 기록 지우기"}
        </button>
      </div>
    </div>
  );
}
