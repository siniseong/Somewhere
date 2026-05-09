"use client";

import { Check } from "lucide-react";
import { COLORS } from "@/lib/colors";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (id: string) => void;
};

export function ColorStep({ value, onChange }: Props) {
  const current = COLORS.find((c) => c.id === value) ?? COLORS[0];
  return (
    <div className="flex flex-1 flex-col">
      <p className="text-[14px] leading-relaxed text-white/55">
        이곳에서의 기분을 색으로 골라주세요. 지도 위 동그라미가 이 색으로 빛나요.
      </p>

      <div className="mt-8 flex flex-1 items-center justify-center">
        <div
          className="relative flex h-[180px] w-[180px] items-center justify-center rounded-full transition"
          style={{
            backgroundColor: current.hex,
            boxShadow: `0 12px 60px ${current.hex}55, inset 0 0 0 1px rgba(255,255,255,0.18)`,
          }}
        >
          <span className="text-[15px] font-medium tracking-tight text-zinc-900/75">
            {current.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-3 pt-6">
        {COLORS.map((c) => {
          const selected = c.id === value;
          return (
            <button
              key={c.id}
              type="button"
              aria-label={c.label}
              aria-pressed={selected}
              onClick={() => onChange(c.id)}
              className={cn(
                "relative aspect-square rounded-2xl transition active:scale-95",
                selected ? "ring-2 ring-white" : "ring-1 ring-white/15",
              )}
              style={{ backgroundColor: c.hex }}
            >
              {selected && (
                <Check className="absolute inset-0 m-auto h-4 w-4 text-zinc-900" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
