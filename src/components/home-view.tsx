"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, Map, Plus } from "lucide-react";
import { MapPreview } from "./map-preview";
import { COLORS } from "@/lib/colors";

const MOCK_TEAMS = [
  { id: "1", name: "여행 추억", members: 3, places: 12, pinCount: 5 },
  { id: "2", name: "주말 맛집", members: 2, places: 5, pinCount: 3 },
  { id: "3", name: "Date Course", members: 4, places: 18, pinCount: 5 },
  { id: "4", name: "산책길", members: 2, places: 7, pinCount: 4 },
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function generatePins(seed: string, count: number) {
  let s = hash(seed);
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  return Array.from({ length: count }, () => ({
    color: COLORS[Math.floor(rand() * COLORS.length)],
    x: `${rand() * 76 + 12}%`,
    y: `${rand() * 48 + 40}%`,
  }));
}

type Weather = { emoji: string; label: string };
const WEATHER_FALLBACK: Weather = { emoji: "🌤️", label: "Mild" };

function weatherFromCode(code: number): Weather {
  if (code === 0) return { emoji: "☀️", label: "Sunny" };
  if (code === 1) return { emoji: "🌤️", label: "Mostly Sunny" };
  if (code === 2) return { emoji: "⛅", label: "Partly Cloudy" };
  if (code === 3) return { emoji: "☁️", label: "Cloudy" };
  if (code >= 45 && code <= 48) return { emoji: "🌫️", label: "Foggy" };
  if (code >= 51 && code <= 57) return { emoji: "🌦️", label: "Drizzle" };
  if (code >= 61 && code <= 67) return { emoji: "🌧️", label: "Rainy" };
  if (code >= 71 && code <= 77) return { emoji: "🌨️", label: "Snowy" };
  if (code >= 80 && code <= 86) return { emoji: "🌧️", label: "Showers" };
  if (code >= 95) return { emoji: "⛈️", label: "Thunderstorm" };
  return WEATHER_FALLBACK;
}

function formatDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

type Tab = "map" | "report";

function ReportPlaceholder() {
  const [dots, setDots] = useState(1);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setDots((prev) => (prev % 3) + 1);
    }, 500);
    return () => window.clearInterval(interval);
  }, []);

  const dotsText = Array(dots).fill(".").join(" ");

  return (
    <div className="flex flex-1 items-center justify-center text-[28px] font-medium tracking-tight text-white/70">
      develop {dotsText}
    </div>
  );
}

export function HomeView() {
  const [tab, setTab] = useState<Tab>("map");
  const [weather, setWeather] = useState<Weather>(WEATHER_FALLBACK);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&current_weather=true`;
        fetch(url)
          .then((r) => r.json())
          .then((data) => {
            if (cancelled) return;
            const code = data?.current_weather?.weathercode;
            if (typeof code === "number") setWeather(weatherFromCode(code));
          })
          .catch(() => {});
      },
      () => {},
      { enableHighAccuracy: false, timeout: 8000 },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-1 flex-col gap-4 px-5 pt-[max(env(safe-area-inset-top,0px),20px)] pb-[max(env(safe-area-inset-bottom,0px),20px)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <svg
            width="32"
            height="32"
            viewBox="0 0 166 162"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <path
              d="M84 0L113.5 55.5L166 38L128.286 89.3731L146 140L96.5 113.422L62 161.5L64.7137 89.3731L0 63.5L76.855 50.461L84 0Z"
              fill="white"
            />
          </svg>
          <span className="text-[24px] font-semibold tracking-tight text-white">
            somr
          </span>
        </div>
        <button
          type="button"
          aria-label="그룹 만들기"
          className="flex h-10 w-10 items-center justify-center active:scale-95"
        >
          <Plus className="h-6 w-6 text-white" strokeWidth={2.2} />
        </button>
      </div>

      <div className="relative mt-2 grid grid-cols-2 pt-1">
        <button
          type="button"
          onClick={() => setTab("map")}
          className={`flex items-center gap-1.5 pb-3 text-left text-[15px] transition-colors ${
            tab === "map" ? "font-bold text-white" : "text-white/55"
          }`}
        >
          <Map className="h-4 w-4" strokeWidth={2.2} />
          <span style={{ fontFamily: "var(--font-korean)" }}>Map</span>
        </button>
        <button
          type="button"
          onClick={() => setTab("report")}
          className={`flex items-center gap-1.5 pb-3 text-left text-[15px] transition-colors ${
            tab === "report" ? "font-bold text-white" : "text-white/55"
          }`}
        >
          <BarChart3 className="h-4 w-4" strokeWidth={2.2} />
          <span style={{ fontFamily: "var(--font-korean)" }}>Report</span>
        </button>
        <span
          className="absolute inset-x-0 bottom-0 h-px bg-white/15"
          aria-hidden
        />
        <span
          className={`absolute bottom-0 h-0.5 bg-white transition-all duration-300 ${
            tab === "map" ? "left-0 w-24" : "left-1/2 w-28"
          }`}
          aria-hidden
        />
      </div>

      {tab === "report" ? (
        <ReportPlaceholder />
      ) : (
      <>
      <div className="mt-4 flex flex-col gap-1">
        <div className="text-[40px] font-medium leading-tight tracking-tight text-white">
          Today&apos;s mood
        </div>
        <div
          className="whitespace-nowrap text-[14px] text-white/55"
          suppressHydrationWarning
        >
          {formatDate()} · {weather.emoji} {weather.label}
        </div>
      </div>

      <Link
        href="/map"
        className="relative block aspect-[5/3] overflow-hidden rounded-3xl bg-[#1C1C1E]"
      >
        <MapPreview />
        <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/55 to-transparent p-5">
          <div className="text-[28px] font-medium tracking-tight text-white">
            Me
          </div>
        </div>
      </Link>

      <div className="flex items-center gap-3 py-1">
        <span className="h-px flex-1 bg-white/15" aria-hidden />
        <span className="text-[14px] font-medium tracking-tight text-white/70">
          Teams
        </span>
        <span className="h-px flex-1 bg-white/15" aria-hidden />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {MOCK_TEAMS.map((t) => {
          const isKorean = /[ㄱ-힝]/.test(t.name);
          const pins = generatePins(t.id, t.pinCount);
          return (
            <button
              key={t.id}
              type="button"
              className="relative block aspect-square overflow-hidden rounded-3xl bg-[#1C1C1E] active:scale-[0.98]"
            >
              {pins.map((pin, i) => (
                <span
                  key={i}
                  className="absolute block h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor: pin.color,
                    left: pin.x,
                    top: pin.y,
                    transform: "translate(-50%, -50%)",
                    boxShadow:
                      "0 0 0 1.5px rgba(10,10,10,0.55), 0 4px 10px rgba(0,0,0,0.5)",
                  }}
                  aria-hidden
                />
              ))}
              <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/55 to-transparent p-4 text-left">
                <div
                  className="text-[18px] font-medium tracking-tight text-white"
                  style={
                    isKorean
                      ? { fontFamily: "var(--font-korean)" }
                      : undefined
                  }
                >
                  {t.name}
                </div>
                <div className="mt-0.5 text-[11px] text-white/65">
                  {t.members}명 · {t.places}곳
                </div>
              </div>
            </button>
          );
        })}
      </div>
      </>
      )}
    </div>
  );
}
