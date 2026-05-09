"use client";

import {
  Suspense,
  useEffect,
  useState,
  type ChangeEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { COLORS, getColor } from "@/lib/colors";
import { fileToCompressedDataUrl } from "@/lib/photo";
import { saveMemory } from "@/lib/db";
import type { Memory } from "@/lib/types";

type Suggestion = {
  id: string;
  primary: string;
  secondary: string;
  lng: number;
  lat: number;
};

type ReverseResult = { name: string; address?: string };

type KakaoCoord2AddressDoc = {
  road_address?: { address_name?: string; building_name?: string } | null;
  address?: { address_name?: string } | null;
};

async function kakaoReverse(
  lng: number,
  lat: number,
): Promise<ReverseResult | null> {
  const key = process.env.NEXT_PUBLIC_KAKAO_REST_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${lng}&y=${lat}`,
      { headers: { Authorization: `KakaoAK ${key}` } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const doc = (data?.documents?.[0] ?? null) as KakaoCoord2AddressDoc | null;
    if (!doc) return null;
    const building = doc.road_address?.building_name?.trim();
    const roadAddr = doc.road_address?.address_name?.trim();
    const jibunAddr = doc.address?.address_name?.trim();
    if (building && roadAddr) return { name: building, address: roadAddr };
    if (building && jibunAddr) return { name: building, address: jibunAddr };
    if (roadAddr) return { name: roadAddr, address: jibunAddr };
    if (jibunAddr) return { name: jibunAddr };
    return null;
  } catch {
    return null;
  }
}

type MapboxGeocodeProperties = {
  name?: string;
  place_formatted?: string;
  full_address?: string;
  context?: Record<string, { name?: string }>;
};

function buildMapboxName(props: MapboxGeocodeProperties | undefined): string {
  if (!props) return "어딘가";
  const ctx = props.context ?? {};
  const parts: string[] = [];
  if (ctx.locality?.name) parts.push(ctx.locality.name);
  if (ctx.neighborhood?.name) parts.push(ctx.neighborhood.name);
  if (parts.length === 0 && ctx.place?.name) parts.push(ctx.place.name);
  return parts.join(" ") || props.name || "어딘가";
}

async function mapboxReverse(
  lng: number,
  lat: number,
): Promise<ReverseResult | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(
      `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${lng}&latitude=${lat}&language=ko&access_token=${token}`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const props = data?.features?.[0]?.properties as
      | MapboxGeocodeProperties
      | undefined;
    return {
      name: buildMapboxName(props),
      address: props?.full_address || props?.place_formatted,
    };
  } catch {
    return null;
  }
}

async function reverseGeocode(
  lng: number,
  lat: number,
): Promise<ReverseResult> {
  return (
    (await kakaoReverse(lng, lat)) ?? (await mapboxReverse(lng, lat)) ?? {
      name: "어딘가",
    }
  );
}

type Step = "location" | "color" | "message" | "music" | "photo";
const STEPS: readonly Step[] = [
  "location",
  "color",
  "message",
  "music",
  "photo",
];

const STEP_LABELS: Record<Step, string> = {
  location: "위치",
  color: "색",
  message: "글",
  music: "음악",
  photo: "사진",
};

const PROMPTS: Record<Step, string> = {
  location: "어디에 다녀왔어?",
  color: "어떤 색이었어?",
  message: "어떤 느낌이었어?",
  music: "어떤 음악이 어울려?",
  photo: "사진을 남겨볼까?",
};

const HELPERS: Record<Step, string> = {
  location: "검색해서 정확한 장소를 찾을 수도 있어요",
  color: "그 순간 마음에 떠오른 색을 골라주세요",
  message: "한 문장이라도 좋아요",
  music: "이 기억에 함께 남길 곡이 있다면",
  photo: "이 순간을 또렷하게 기억할 수 있게",
};

const PRIMARY_LABEL: Record<Step, string> = {
  location: "이 위치에 기록하기",
  color: "다음",
  message: "다음",
  music: "다음",
  photo: "기록하기",
};

const SKIPPABLE: Record<Step, boolean> = {
  location: false,
  color: false,
  message: false,
  music: true,
  photo: true,
};

function NewMemoryForm() {
  const router = useRouter();
  const params = useSearchParams();
  const initialLat = parseFloat(params.get("lat") ?? "");
  const initialLng = parseFloat(params.get("lng") ?? "");
  const initialPlaceName = params.get("placeName");
  const initialAddress = params.get("address");
  const validCoords = !Number.isNaN(initialLat) && !Number.isNaN(initialLng);

  const [step, setStep] = useState<Step>("location");
  const [lat, setLat] = useState(initialLat);
  const [lng, setLng] = useState(initialLng);
  const [colorId, setColorId] = useState(COLORS[0].id);
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();
  const [artist, setArtist] = useState("");
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [placeName, setPlaceName] = useState<string | null>(initialPlaceName);
  const [address, setAddress] = useState<string | null>(initialAddress);
  const [searchFocused, setSearchFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [reverseGeocoded, setReverseGeocoded] = useState(
    initialPlaceName != null,
  );

  // Initial reverse geocoding (mount only) — skip if placeName came from query
  useEffect(() => {
    if (!validCoords || initialPlaceName != null) return;

    let canceled = false;
    reverseGeocode(initialLng, initialLat)
      .then((geo) => {
        if (canceled) return;
        setPlaceName(geo.name);
        if (geo.address) setAddress(geo.address);
        setReverseGeocoded(true);
      })
      .catch((err) => {
        console.error(err);
        if (!canceled) {
          setPlaceName("어딘가");
          setReverseGeocoded(true);
        }
      });

    return () => {
      canceled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Forward search via Kakao Local API (debounced)
  useEffect(() => {
    if (!searchFocused || !reverseGeocoded || step !== "location") return;
    const q = (placeName ?? "").trim();
    if (q.length < 2) return;
    const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_REST_KEY;
    if (!kakaoKey) return;

    let canceled = false;
    const handle = window.setTimeout(() => {
      const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(
        q,
      )}&size=8&x=${lng}&y=${lat}&radius=20000`;
      fetch(url, { headers: { Authorization: `KakaoAK ${kakaoKey}` } })
        .then((r) => r.json())
        .then((data) => {
          if (canceled) return;
          const documents = (data?.documents ?? []) as Array<{
            id?: string;
            place_name?: string;
            address_name?: string;
            road_address_name?: string;
            x?: string;
            y?: string;
          }>;
          setSuggestions(
            documents
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
              .filter((s): s is Suggestion => s !== null),
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
  }, [placeName, searchFocused, reverseGeocoded, lat, lng, step]);

  function selectSuggestion(s: Suggestion) {
    setPlaceName(s.primary);
    setAddress(s.secondary || null);
    setLat(s.lat);
    setLng(s.lng);
    setSuggestions([]);
    setSearchFocused(false);
  }

  async function handlePhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      setPhoto(dataUrl);
    } catch (err) {
      console.error(err);
    } finally {
      e.target.value = "";
    }
  }

  async function handleSubmit() {
    if (!validCoords || submitting) return;
    setSubmitting(true);
    try {
      const memory: Memory = {
        id: crypto.randomUUID(),
        lat,
        lng,
        placeName: placeName?.trim() || undefined,
        address: address?.trim() || undefined,
        colorId,
        note: note.trim(),
        photo,
        music:
          artist.trim() || title.trim()
            ? { artist: artist.trim(), title: title.trim() }
            : undefined,
        createdAt: Date.now(),
      };
      await saveMemory(memory);
      router.replace("/");
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
  }

  const stepIndex = STEPS.indexOf(step);
  const selectedColor = getColor(colorId);
  // After the user has chosen a color, the progress fills with that color
  const progressColor = stepIndex >= 1 ? selectedColor.hex : null;

  function handleBack() {
    if (stepIndex === 0) router.back();
    else setStep(STEPS[stepIndex - 1]);
  }

  function handleNext() {
    if (step === "photo") {
      handleSubmit();
      return;
    }
    setStep(STEPS[stepIndex + 1]);
  }

  function handleSkip() {
    handleNext();
  }

  if (!validCoords) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="text-sm text-zinc-400">위치 정보가 없어요.</p>
        <button
          type="button"
          onClick={() => router.replace("/")}
          className="mt-6 rounded-2xl bg-white px-6 py-2.5 text-sm font-semibold text-zinc-900"
        >
          지도로 돌아가기
        </button>
      </main>
    );
  }

  const showPlaceContext = step !== "location";

  return (
    <main className="flex min-h-dvh flex-1 flex-col bg-[var(--background)]">
      {/* Top bar */}
      <header
        className="sticky top-0 z-20 bg-[var(--background)]/85 backdrop-blur-xl"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="flex items-center justify-between px-4 pb-3 pt-3">
          <button
            type="button"
            onClick={handleBack}
            aria-label={stepIndex === 0 ? "닫기" : "뒤로"}
            className="-ml-1 flex h-10 w-10 items-center justify-center rounded-full text-zinc-200 transition hover:bg-white/[0.06] active:scale-95"
          >
            {stepIndex === 0 ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            ) : (
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            )}
          </button>
          <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-500">
            {stepIndex + 1} / {STEPS.length} · {STEP_LABELS[step]}
          </span>
          <span className="h-10 w-10" aria-hidden />
        </div>
        <div className="flex items-center gap-1.5 px-5 pb-3">
          {STEPS.map((_, i) => {
            const done = i <= stepIndex;
            return (
              <span
                key={i}
                className="h-[3px] flex-1 rounded-full transition-all duration-500 ease-out"
                style={{
                  backgroundColor: done
                    ? progressColor ?? "rgba(255,255,255,0.85)"
                    : "rgba(255,255,255,0.12)",
                  boxShadow:
                    done && progressColor
                      ? `0 0 12px ${progressColor}66`
                      : undefined,
                }}
              />
            );
          })}
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 flex-col px-6 pb-6 pt-4">
        {showPlaceContext && (
          <div className="mb-5 flex items-start gap-2 text-zinc-500">
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-1 shrink-0"
              aria-hidden
            >
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-zinc-300">
                {placeName ?? (
                  <span className="text-zinc-600">위치 가져오는 중…</span>
                )}
              </p>
              {address && address !== placeName && (
                <p className="mt-0.5 truncate text-[11px] text-zinc-600">
                  {address}
                </p>
              )}
            </div>
          </div>
        )}

        <div key={step} className="motion-safe:animate-[fadeUp_280ms_ease-out]">
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-zinc-100">
            {step === "location"
              ? "어디에 다녀왔어?"
              : PROMPTS[step]}
          </h1>
          <p className="mt-2 text-[14px] leading-6 text-zinc-500">
            {HELPERS[step]}
          </p>

          <div className="mt-8">
            {step === "location" && (
              <LocationStep
                placeName={placeName}
                setPlaceName={setPlaceName}
                address={address}
                reverseGeocoded={reverseGeocoded}
                searchFocused={searchFocused}
                setSearchFocused={setSearchFocused}
                suggestions={suggestions}
                onPickSuggestion={selectSuggestion}
              />
            )}
            {step === "color" && (
              <ColorStep colorId={colorId} setColorId={setColorId} />
            )}
            {step === "message" && (
              <MessageStep
                note={note}
                setNote={setNote}
                color={selectedColor.hex}
              />
            )}
            {step === "music" && (
              <MusicStep
                title={title}
                setTitle={setTitle}
                artist={artist}
                setArtist={setArtist}
                color={selectedColor.hex}
              />
            )}
            {step === "photo" && (
              <PhotoStep
                photo={photo}
                setPhoto={setPhoto}
                handlePhoto={handlePhoto}
              />
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="sticky bottom-0 z-10 bg-gradient-to-t from-[var(--background)] via-[var(--background)] to-transparent px-6 pb-6 pt-4"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)" }}
      >
        {SKIPPABLE[step] && (
          <div className="mb-3 flex justify-center">
            <button
              type="button"
              onClick={handleSkip}
              className="px-4 py-1 text-[13px] text-zinc-500 transition hover:text-zinc-300"
            >
              건너뛰기
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={handleNext}
          disabled={submitting}
          className="w-full rounded-2xl bg-white py-4 text-[15px] font-semibold tracking-tight text-zinc-900 shadow-[0_10px_30px_-12px_rgba(255,255,255,0.3)] transition hover:bg-zinc-100 active:scale-[0.99] disabled:opacity-60"
        >
          {submitting ? "저장 중…" : PRIMARY_LABEL[step]}
        </button>
      </div>
    </main>
  );
}

/* =====================  Step components  ===================== */

type LocationStepProps = {
  placeName: string | null;
  setPlaceName: (s: string | null) => void;
  address: string | null;
  reverseGeocoded: boolean;
  searchFocused: boolean;
  setSearchFocused: (b: boolean) => void;
  suggestions: Suggestion[];
  onPickSuggestion: (s: Suggestion) => void;
};

function LocationStep(props: LocationStepProps) {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-white/[0.05] ring-1 ring-white/[0.06] focus-within:ring-white/20 transition">
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 text-zinc-500"
            aria-hidden
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={props.placeName ?? ""}
            onChange={(e) => props.setPlaceName(e.target.value)}
            onFocus={() => props.setSearchFocused(true)}
            onBlur={() =>
              window.setTimeout(() => props.setSearchFocused(false), 120)
            }
            placeholder={
              props.reverseGeocoded ? "장소 이름 또는 검색어" : "위치 가져오는 중…"
            }
            className="flex-1 bg-transparent text-[16px] font-medium tracking-tight text-zinc-100 outline-none placeholder:text-zinc-600"
          />
        </div>
        {props.address && props.address !== props.placeName && (
          <p className="px-4 pb-3 pl-[42px] text-[12px] text-zinc-500">
            {props.address}
          </p>
        )}
      </div>

      {props.searchFocused &&
        (props.placeName ?? "").trim().length >= 2 &&
        props.suggestions.length > 0 && (
        <ul className="overflow-hidden rounded-2xl bg-zinc-900/80 ring-1 ring-white/[0.06] backdrop-blur">
          {props.suggestions.map((s, i) => (
            <li
              key={s.id}
              className={
                i === props.suggestions.length - 1
                  ? ""
                  : "border-b border-white/[0.04]"
              }
            >
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  props.onPickSuggestion(s);
                }}
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-white/[0.04]"
              >
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.05]">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-white/75"
                    aria-hidden
                  >
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] tracking-tight text-zinc-100">
                    {s.primary}
                  </span>
                  {s.secondary && (
                    <span className="mt-0.5 block truncate text-[12px] text-zinc-500">
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

type ColorStepProps = {
  colorId: string;
  setColorId: (id: string) => void;
};

function ColorStep({ colorId, setColorId }: ColorStepProps) {
  return (
    <div className="grid grid-cols-3 gap-x-3 gap-y-6 px-1 pt-2">
      {COLORS.map((c) => {
        const active = colorId === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => setColorId(c.id)}
            aria-pressed={active}
            aria-label={c.label}
            className="group flex flex-col items-center gap-2.5 outline-none"
          >
            <span
              className={`relative grid h-[72px] w-[72px] place-items-center rounded-full transition-all duration-300 ease-out ${
                active ? "scale-[1.06]" : "group-hover:scale-[1.03]"
              }`}
              style={{
                backgroundColor: c.hex,
                boxShadow: active
                  ? `0 0 0 2px #ededed, 0 0 0 6px rgba(10,10,10,1), 0 0 0 8px ${c.hex}55, 0 0 36px ${c.hex}77, 0 6px 18px rgba(0,0,0,0.5)`
                  : `0 4px 14px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06)`,
              }}
            >
              {active && (
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-zinc-900/70"
                  aria-hidden
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              )}
            </span>
            <span
              className={`text-[13px] tracking-tight transition-colors ${
                active ? "text-zinc-100" : "text-zinc-500 group-hover:text-zinc-300"
              }`}
            >
              {c.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

type MessageStepProps = {
  note: string;
  setNote: (s: string) => void;
  color: string;
};

function MessageStep({ note, setNote, color }: MessageStepProps) {
  return (
    <div className="relative">
      <span
        className="pointer-events-none absolute left-0 top-0 h-full w-[3px] rounded-full"
        style={{
          backgroundColor: color,
          boxShadow: `0 0 14px ${color}88`,
        }}
        aria-hidden
      />
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="짧게라도 좋아요"
        rows={7}
        autoFocus
        className="w-full resize-none rounded-2xl bg-white/[0.04] p-5 pl-6 text-[15px] leading-7 tracking-tight text-zinc-100 outline-none ring-1 ring-white/[0.06] placeholder:text-zinc-600 transition focus:bg-white/[0.06] focus:ring-white/20"
      />
      <p className="mt-2 text-right text-[11px] text-zinc-600">
        {note.length} 자
      </p>
    </div>
  );
}

type MusicStepProps = {
  title: string;
  setTitle: (s: string) => void;
  artist: string;
  setArtist: (s: string) => void;
  color: string;
};

function MusicStep({ title, setTitle, artist, setArtist, color }: MusicStepProps) {
  return (
    <div
      className="overflow-hidden rounded-2xl ring-1 ring-white/[0.06]"
      style={{
        background: `linear-gradient(150deg, ${color}14 0%, rgba(24,24,27,0.5) 60%)`,
      }}
    >
      <div className="flex items-center gap-3 px-4 py-3.5">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{
            backgroundColor: `${color}22`,
            boxShadow: `inset 0 0 0 1px ${color}44`,
          }}
          aria-hidden
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color }}
          >
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="곡명"
          autoFocus
          className="flex-1 bg-transparent text-[15px] tracking-tight text-zinc-100 outline-none placeholder:text-zinc-500"
        />
      </div>
      <div className="h-px bg-white/[0.06]" />
      <div className="flex items-center gap-3 px-4 py-3.5">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.04] ring-1 ring-white/[0.06]"
          aria-hidden
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-zinc-300"
          >
            <path d="M20 21a8 8 0 1 0-16 0" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </span>
        <input
          type="text"
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          placeholder="아티스트"
          className="flex-1 bg-transparent text-[15px] tracking-tight text-zinc-100 outline-none placeholder:text-zinc-500"
        />
      </div>
    </div>
  );
}

type PhotoStepProps = {
  photo: string | undefined;
  setPhoto: (s: string | undefined) => void;
  handlePhoto: (e: ChangeEvent<HTMLInputElement>) => void;
};

function PhotoStep({ photo, setPhoto, handlePhoto }: PhotoStepProps) {
  if (photo) {
    return (
      <div className="relative overflow-hidden rounded-2xl ring-1 ring-white/10 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo}
          alt=""
          className="aspect-square w-full object-cover"
        />
        <button
          type="button"
          onClick={() => setPhoto(undefined)}
          className="absolute right-3 top-3 flex h-8 items-center gap-1.5 rounded-full bg-black/60 px-3 text-[12px] font-medium text-white backdrop-blur-md transition hover:bg-black/75"
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
          제거
        </button>
      </div>
    );
  }
  return (
    <label className="group relative flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-3.5 overflow-hidden rounded-2xl border-2 border-dashed border-white/15 bg-white/[0.025] transition hover:border-white/30 hover:bg-white/[0.04]">
      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhoto}
        className="hidden"
      />
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.06] ring-1 ring-white/10 transition group-hover:bg-white/[0.1]">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-zinc-300"
          aria-hidden
        >
          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
          <circle cx="12" cy="13" r="3.5" />
        </svg>
      </span>
      <p className="text-[15px] font-medium tracking-tight text-zinc-200">
        사진 추가하기
      </p>
      <p className="text-[12px] text-zinc-500">
        탭해서 카메라 또는 라이브러리 열기
      </p>
    </label>
  );
}

export default function NewMemoryPage() {
  return (
    <Suspense>
      <NewMemoryForm />
    </Suspense>
  );
}
