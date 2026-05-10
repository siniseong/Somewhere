"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Map,
  MoreVertical,
  Plus,
  Trash2,
  User,
} from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { LoginSheet } from "./login-sheet";
import { isLoggedInSync, signOut } from "@/lib/auth";
import { COLORS } from "@/lib/colors";
import { claimDeviceMemoriesForUser, getAllMemories } from "@/lib/db";
import {
  claimDeviceTeamsForUser,
  getTeams,
  removeTeam,
  updateTeamName,
  type Team,
} from "@/lib/teams";
import { getSupabaseClient } from "@/lib/supabase";
import { setUserName } from "@/lib/user";
import {
  fetchWeatherAt,
  getCachedWeather,
  WEATHER_FALLBACK,
  type Weather,
} from "@/lib/weather";

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
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("map");
  const [weather, setWeather] = useState<Weather>(() => {
    if (typeof window === "undefined") return WEATHER_FALLBACK;
    return getCachedWeather() ?? WEATHER_FALLBACK;
  });
  const [teams, setTeams] = useState<Team[]>([]);
  const [memoryCount, setMemoryCount] = useState(0);
  const [loginOpen, setLoginOpen] = useState(false);
  const [authed, setAuthed] = useState(() => isLoggedInSync());
  const [profile, setProfile] = useState<{
    name?: string;
    avatar?: string;
  } | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileWrapRef = useRef<HTMLDivElement | null>(null);
  const [actionTeamId, setActionTeamId] = useState<string | null>(null);

  function gotoCreateTeam() {
    if (!isLoggedInSync()) {
      setLoginOpen(true);
      return;
    }
    router.push("/team/new");
  }

  async function handleLogout() {
    await signOut();
    setProfileOpen(false);
  }

  useEffect(() => {
    if (!profileOpen) return;
    function handler(e: MouseEvent) {
      if (profileWrapRef.current?.contains(e.target as Node)) return;
      setProfileOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [profileOpen]);
  const [actionStep, setActionStep] = useState<
    "menu" | "code" | "edit" | "delete"
  >("menu");
  const [editName, setEditName] = useState("");
  const [copied, setCopied] = useState(false);
  const actionTeam = actionTeamId
    ? teams.find((t) => t.id === actionTeamId) ?? null
    : null;

  function openTeamMenu(team: Team) {
    setActionTeamId(team.id);
    setActionStep("menu");
    setEditName(team.name);
    setCopied(false);
  }

  async function handleSaveName() {
    if (!actionTeam) return;
    const next = editName.trim();
    if (!next || next === actionTeam.name) {
      setActionTeamId(null);
      return;
    }
    await updateTeamName(actionTeam.id, next);
    const fresh = await getTeams();
    setTeams(fresh);
    setActionTeamId(null);
  }

  async function handleDelete() {
    if (!actionTeam) return;
    await removeTeam(actionTeam.id);
    const fresh = await getTeams();
    setTeams(fresh);
    setActionTeamId(null);
  }

  function handleCopyCode(code: string) {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  }

  useEffect(() => {
    let cancelled = false;
    function refresh() {
      getTeams()
        .then((items) => {
          if (!cancelled) setTeams(items);
        })
        .catch(() => {});
    }
    refresh();
    window.addEventListener("focus", refresh);

    const supabase = getSupabaseClient();

    function applyProfile(meta?: Record<string, unknown>) {
      if (!meta) {
        setProfile(null);
        return;
      }
      const name =
        (meta.name as string | undefined) ??
        (meta.full_name as string | undefined) ??
        (meta.nickname as string | undefined) ??
        (meta.preferred_username as string | undefined);
      const avatar =
        (meta.avatar_url as string | undefined) ??
        (meta.picture as string | undefined);
      setProfile({ name, avatar });
      if (name) setUserName(name);
    }

    supabase?.auth.getSession().then(({ data }) => {
      applyProfile(
        data.session?.user?.user_metadata as
          | Record<string, unknown>
          | undefined,
      );
    });

    const sub = supabase?.auth.onAuthStateChange((event, session) => {
      setAuthed(!!session);
      if (event === "SIGNED_IN" && session?.user) {
        applyProfile(
          session.user.user_metadata as Record<string, unknown> | undefined,
        );
        Promise.all([
          claimDeviceTeamsForUser(session.user.id),
          claimDeviceMemoriesForUser(session.user.id),
        ]).then(refresh);
      } else if (event === "SIGNED_OUT") {
        setProfile(null);
        refresh();
      }
    });

    return () => {
      cancelled = true;
      window.removeEventListener("focus", refresh);
      sub?.data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getAllMemories()
      .then((items) => {
        if (!cancelled) setMemoryCount(items.length);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (getCachedWeather()) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fetchWeatherAt(pos.coords.latitude, pos.coords.longitude).then((w) => {
          if (!cancelled && w) setWeather(w);
        });
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
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="팀 만들기"
            onClick={gotoCreateTeam}
            className="flex h-10 w-10 items-center justify-center active:scale-95"
          >
            <Plus className="h-6 w-6 text-white" strokeWidth={2.2} />
          </button>
          {authed ? (
            <div className="relative" ref={profileWrapRef}>
              <button
                type="button"
                aria-label="내 프로필"
                aria-expanded={profileOpen}
                onClick={() => setProfileOpen((v) => !v)}
                className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white/10 ring-1 ring-white/15 active:scale-95"
              >
                {profile?.avatar ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={profile.avatar}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-[14px] font-semibold text-white">
                    {profile?.name?.[0]?.toUpperCase() ?? "?"}
                  </span>
                )}
              </button>
              {profileOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-30 mt-2 w-44 origin-top-right overflow-hidden rounded-2xl bg-[#1C1C1E] py-1 shadow-[0_12px_40px_rgba(0,0,0,0.55)] ring-1 ring-white/10"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setProfileOpen(false);
                      router.push("/settings");
                    }}
                    className="block w-full px-4 py-3 text-left text-[14px] font-medium text-white active:bg-white/[0.05]"
                  >
                    닉네임 변경
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="block w-full px-4 py-3 text-left text-[14px] font-medium text-rose-400 active:bg-white/[0.05]"
                  >
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              aria-label="로그인"
              onClick={() => setLoginOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15 active:scale-95"
            >
              <User
                className="h-[18px] w-[18px] text-white/75"
                strokeWidth={2}
              />
            </button>
          )}
        </div>
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
        className="mt-2 flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3.5 ring-1 ring-white/[0.06] active:bg-white/[0.06]"
      >
        <div className="flex items-center gap-2">
          <Map className="h-4 w-4 text-white/70" strokeWidth={2.2} />
          <span className="text-[14px] text-white/70">내 지도</span>
          <span className="text-[14px] font-semibold text-white">
            {memoryCount}곳
          </span>
        </div>
        <ChevronRight className="h-4 w-4 text-white/40" strokeWidth={2.2} />
      </Link>

      <div className="flex items-center gap-3 pt-2">
        <span className="h-px flex-1 bg-white/15" aria-hidden />
        <span className="text-[14px] font-medium tracking-tight text-white/70">
          Teams
        </span>
        <span className="h-px flex-1 bg-white/15" aria-hidden />
      </div>

      {teams.length === 0 ? (
        <button
          type="button"
          onClick={gotoCreateTeam}
          className="flex min-h-[280px] flex-1 flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-white/15 bg-white/[0.02] px-4 text-center active:bg-white/[0.04]"
        >
          <Plus className="h-8 w-8 text-white/45" strokeWidth={2} />
          <div>
            <div className="text-[15px] font-medium text-white/85">
              팀을 만들어볼까요?
            </div>
            <div className="mt-1 text-[13px] text-white/50">
              친구와 함께 장소를 모아요
            </div>
          </div>
        </button>
      ) : (
      <div className="grid grid-cols-2 gap-3">
        {teams.map((t) => {
          const isKorean = /[ㄱ-힝]/.test(t.name);
          const pins = generatePins(t.id, t.pinCount);
          return (
            <div
              key={t.id}
              className="relative aspect-square overflow-hidden rounded-3xl bg-[#1C1C1E]"
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
                <button
                  type="button"
                  aria-label="팀 메뉴"
                  onClick={() => openTeamMenu(t)}
                  className="float-right -mr-2 -mt-1 flex h-9 w-9 items-center justify-center rounded-full text-white/75 active:bg-white/10"
                >
                  <MoreVertical className="h-4 w-4" strokeWidth={2.2} />
                </button>
                <div
                  className="text-[18px] font-medium leading-tight tracking-tight text-white [overflow-wrap:anywhere]"
                  style={
                    isKorean
                      ? { fontFamily: "var(--font-korean)" }
                      : undefined
                  }
                >
                  {t.name}
                </div>
                <div className="clear-both mt-1 text-[11px] text-white/65">
                  {t.members}명 · {t.places}곳
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}
      </>
      )}

      <Drawer
        open={actionTeam !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActionTeamId(null);
            setCopied(false);
          }
        }}
      >
        <DrawerContent>
          <DrawerHeader className="flex flex-row items-center gap-1 pt-5">
            <DrawerTitle className="sr-only">
              {actionTeam?.name}
            </DrawerTitle>
            {actionStep !== "menu" ? (
              <button
                type="button"
                onClick={() => setActionStep("menu")}
                aria-label="뒤로"
                className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/85 active:bg-white/10"
              >
                <ChevronLeft className="h-7 w-7" strokeWidth={2.5} />
              </button>
            ) : null}
            <DrawerDescription className="text-[15px] font-medium text-white">
              {actionStep === "menu"
                ? actionTeam?.name
                : actionStep === "code"
                  ? "초대 코드"
                  : actionStep === "edit"
                    ? "팀 이름 수정"
                    : "팀 삭제"}
            </DrawerDescription>
          </DrawerHeader>

          {actionStep === "menu" && (
            <div className="flex flex-col px-2 pb-2 pt-2">
              <button
                type="button"
                onClick={() => setActionStep("code")}
                className="flex items-center justify-between rounded-2xl px-4 py-4 text-left active:bg-white/[0.05]"
              >
                <span className="text-[15px] font-medium text-white">
                  초대 코드
                </span>
                <ChevronRight
                  className="h-4 w-4 text-white/40"
                  strokeWidth={2.2}
                />
              </button>
              <button
                type="button"
                onClick={() => setActionStep("edit")}
                className="flex items-center justify-between rounded-2xl px-4 py-4 text-left active:bg-white/[0.05]"
              >
                <span className="text-[15px] font-medium text-white">
                  팀 이름 수정
                </span>
                <ChevronRight
                  className="h-4 w-4 text-white/40"
                  strokeWidth={2.2}
                />
              </button>
              <button
                type="button"
                onClick={() => setActionStep("delete")}
                className="flex items-center justify-between rounded-2xl px-4 py-4 text-left active:bg-white/[0.05]"
              >
                <span className="text-[15px] font-medium text-rose-400">
                  팀 삭제
                </span>
                <ChevronRight
                  className="h-4 w-4 text-rose-400/50"
                  strokeWidth={2.2}
                />
              </button>
            </div>
          )}

          {actionStep === "delete" && (
            <>
              <div className="px-5 pt-3">
                <p className="text-[15px] leading-relaxed text-white/75">
                  <span className="font-semibold text-white">
                    {actionTeam?.name}
                  </span>{" "}
                  팀을 정말 삭제할까요?
                </p>
                <p className="mt-2 text-[13px] text-white/45">
                  팀에 저장된 모든 기록이 사라지고 되돌릴 수 없어요.
                </p>
              </div>
              <div className="flex flex-col gap-2 px-5 pb-2 pt-5">
                <Button
                  type="button"
                  size="lg"
                  variant="destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4" />팀 삭제
                </Button>
              </div>
            </>
          )}

          {actionStep === "code" && (
            <>
              <div className="flex items-center gap-2 px-5 pt-3">
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="flex h-12 w-10 items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] text-[20px] font-bold text-white"
                    >
                      {actionTeam?.code[i] ?? ""}
                    </div>
                  ))}
                </div>
                <span className="block h-px w-3 bg-white/30" aria-hidden />
                <div className="flex gap-1.5">
                  {[3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="flex h-12 w-10 items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] text-[20px] font-bold text-white"
                    >
                      {actionTeam?.code[i] ?? ""}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2 px-5 pb-2 pt-5">
                <Button
                  type="button"
                  size="lg"
                  variant="secondary"
                  onClick={() =>
                    actionTeam && handleCopyCode(actionTeam.code)
                  }
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      복사됨
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      초대 코드 복사
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {actionStep === "edit" && (
            <>
              <div className="px-5 pt-3">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                  }}
                  maxLength={20}
                  autoFocus
                  className="w-full bg-transparent text-[24px] font-medium tracking-tight text-white outline-none placeholder:text-white/25"
                />
              </div>
              <div className="flex flex-col gap-2 px-5 pb-2 pt-5">
                <Button
                  type="button"
                  size="lg"
                  disabled={!editName.trim()}
                  onClick={handleSaveName}
                >
                  저장
                </Button>
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>

      <LoginSheet open={loginOpen} onOpenChange={setLoginOpen} />
    </div>
  );
}
