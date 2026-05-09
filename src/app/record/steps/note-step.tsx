"use client";

import { useEffect, useRef } from "react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: () => void;
};

const NOTE_LIMIT = 60;

export function NoteStep({ value, onChange, onSubmit }: Props) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => ref.current?.focus(), 250);
    return () => window.clearTimeout(id);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit?.();
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <p className="text-[14px] leading-relaxed text-white/55">
        이곳에서 떠오른 짧은 한 줄을 적어보세요.
      </p>

      <div className="mt-8 flex-1">
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, NOTE_LIMIT))}
          onKeyDown={handleKeyDown}
          placeholder="예) 노을이 유난히 진했던 날"
          rows={3}
          className="w-full resize-none bg-transparent text-[28px] font-medium leading-tight tracking-tight text-white outline-none placeholder:text-white/25"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
        />
      </div>

      <div className="self-end pb-2 text-[12px] tabular-nums text-white/40">
        {value.length}/{NOTE_LIMIT}
      </div>
    </div>
  );
}
