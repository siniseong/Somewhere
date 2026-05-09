"use client";

import { useEffect, useRef, useState } from "react";

export type LocationSuggestion = {
  id: string;
  primary: string;
  secondary: string;
  lng: number;
  lat: number;
};

type KakaoDocument = {
  id?: string;
  place_name?: string;
  address_name?: string;
  road_address_name?: string;
  x?: string;
  y?: string;
};

type Props = {
  onSelect: (s: LocationSuggestion) => void;
  proximityLng?: number;
  proximityLat?: number;
  placeholder?: string;
};

export function LocationSearch({
  onSelect,
  proximityLng,
  proximityLat,
  placeholder = "장소 검색",
}: Props) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!focused || query.trim().length < 2) return;
    const key = process.env.NEXT_PUBLIC_KAKAO_REST_KEY;
    if (!key) return;

    let canceled = false;
    const handle = window.setTimeout(() => {
      const proximity =
        proximityLng != null && proximityLat != null
          ? `&x=${proximityLng}&y=${proximityLat}&radius=20000`
          : "";
      const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=8${proximity}`;
      fetch(url, { headers: { Authorization: `KakaoAK ${key}` } })
        .then((r) => r.json())
        .then((data) => {
          if (canceled) return;
          const docs = (data?.documents ?? []) as KakaoDocument[];
          setSuggestions(
            docs
              .map((d, i) => {
                const dx = parseFloat(d.x ?? "");
                const dy = parseFloat(d.y ?? "");
                if (Number.isNaN(dx) || Number.isNaN(dy)) return null;
                return {
                  id: d.id ?? `${i}`,
                  primary: d.place_name ?? "",
                  secondary: d.road_address_name || d.address_name || "",
                  lng: dx,
                  lat: dy,
                };
              })
              .filter((s): s is LocationSuggestion => s !== null),
          );
        })
        .catch(() => {
          /* swallow — render-time guards hide stale suggestions */
        });
    }, 300);

    return () => {
      canceled = true;
      window.clearTimeout(handle);
    };
  }, [query, focused, proximityLng, proximityLat]);

  function handleSelect(s: LocationSuggestion) {
    setQuery("");
    setSuggestions([]);
    setFocused(false);
    inputRef.current?.blur();
    onSelect(s);
  }

  function handleClear() {
    setQuery("");
    setSuggestions([]);
    inputRef.current?.focus();
  }

  const glass =
    "bg-white/[0.14] ring-1 ring-white/[0.14] backdrop-blur-2xl backdrop-saturate-[180%] shadow-[0_14px_44px_rgba(0,0,0,0.5),0_2px_6px_rgba(0,0,0,0.25)]";

  return (
    <div className="w-full">
      <div className={`overflow-hidden rounded-full ${glass}`}>
        <div className="flex h-12 items-center gap-2.5 px-4">
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 text-white/75"
            aria-hidden
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => window.setTimeout(() => setFocused(false), 150)}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-[16px] tracking-tight text-white outline-none placeholder:text-white/65"
          />
          {query && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleClear();
              }}
              aria-label="입력 지우기"
              className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-white/30 text-zinc-900 transition hover:bg-white/50"
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {focused && query.trim().length >= 2 && suggestions.length > 0 && (
        <ul
          className={`mt-2 max-h-72 divide-y divide-white/[0.06] overflow-y-auto rounded-3xl ${glass}`}
        >
          {suggestions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(s);
                }}
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-white/[0.05] active:bg-white/[0.08]"
              >
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-white/80"
                    aria-hidden
                  >
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] tracking-tight text-white">
                    {s.primary}
                  </span>
                  {s.secondary && (
                    <span className="mt-0.5 block truncate text-[13px] text-white/55">
                      {s.secondary}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
