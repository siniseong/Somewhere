"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Map, {
  GeolocateControl,
  Marker,
  type MapRef,
  type MapMouseEvent,
} from "react-map-gl/mapbox";
import type { GeolocateControl as MapboxGeolocateControl } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Drawer } from "vaul";
import { getAllMemories } from "@/lib/db";
import { getColor } from "@/lib/colors";
import type { Memory } from "@/lib/types";
import { BottomSheet } from "./bottom-sheet";
import { MemoryCard } from "./memory-card";
import { LocationSearch, type LocationSuggestion } from "./location-search";

type Coord = { lat: number; lng: number };

function haversine(a: Coord, b: Coord): number {
  const R = 6371000;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}


type Candidate = {
  lng: number;
  lat: number;
  placeName: string;
  address?: string;
  resolving?: boolean;
};

const FALLBACK_VIEW = {
  longitude: 126.978,
  latitude: 37.5665,
  zoom: 12,
};

type ReverseResult = { name: string; address?: string };

type KakaoRoadAddress = {
  address_name?: string;
  building_name?: string;
};
type KakaoJibunAddress = {
  address_name?: string;
};
type KakaoCoord2AddressDoc = {
  road_address?: KakaoRoadAddress | null;
  address?: KakaoJibunAddress | null;
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

type MapboxGeocodeContext = { name?: string };
type MapboxGeocodeProperties = {
  name?: string;
  place_formatted?: string;
  full_address?: string;
  context?: Record<string, MapboxGeocodeContext>;
};
type MapboxGeocodeFeature = { properties?: MapboxGeocodeProperties };

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
    const feat = data?.features?.[0] as MapboxGeocodeFeature | undefined;
    const props = feat?.properties;
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
  return (await kakaoReverse(lng, lat)) ?? (await mapboxReverse(lng, lat)) ?? {
    name: "어딘가",
  };
}

export function MapView() {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const router = useRouter();
  const mapRef = useRef<MapRef | null>(null);
  const geolocateRef = useRef<MapboxGeolocateControl | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [selected, setSelected] = useState<Memory | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [proximity, setProximity] = useState<{
    lng: number;
    lat: number;
  } | null>(null);

  const nearby = useMemo(() => {
    if (!candidate) return [];
    const here: Coord = { lat: candidate.lat, lng: candidate.lng };
    return memories
      .map((m) => ({ m, d: haversine({ lat: m.lat, lng: m.lng }, here) }))
      .filter((x) => x.d <= 300)
      .sort((a, b) => a.d - b.d);
  }, [candidate, memories]);

  useEffect(() => {
    let canceled = false;
    getAllMemories()
      .then((items) => {
        if (!canceled) setMemories(items);
      })
      .catch((err) => console.error("failed to load memories", err));
    return () => {
      canceled = true;
    };
  }, []);

  function handleSearchSelect(s: LocationSuggestion) {
    const map = mapRef.current?.getMap();
    if (map) {
      map.flyTo({ center: [s.lng, s.lat], zoom: 16, duration: 800 });
    }
    setCandidate({
      lng: s.lng,
      lat: s.lat,
      placeName: s.primary,
      address: s.secondary || undefined,
    });
  }

  function handleMapDoubleClick(e: MapMouseEvent) {
    const { lng, lat } = e.lngLat;
    setCandidate({
      lng,
      lat,
      placeName: "위치 가져오는 중…",
      resolving: true,
    });
    reverseGeocode(lng, lat).then((geo) => {
      setCandidate((c) =>
        c && c.lng === lng && c.lat === lat
          ? {
              ...c,
              placeName: geo.name,
              address: geo.address,
              resolving: false,
            }
          : c,
      );
    });
  }

  function handleConfirm() {
    if (!candidate) return;
    const query: Record<string, string> = {
      lat: candidate.lat.toFixed(6),
      lng: candidate.lng.toFixed(6),
      placeName: candidate.placeName,
    };
    if (candidate.address) query.address = candidate.address;
    const params = new URLSearchParams(query);
    router.push(`/record/new?${params.toString()}`);
  }

  if (!token) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-zinc-400">
        지도를 불러올 수 없어요.
        <br />
        <code className="text-xs text-zinc-500">
          NEXT_PUBLIC_MAPBOX_TOKEN
        </code>{" "}
        을 확인해주세요.
      </div>
    );
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <Map
        ref={mapRef}
        mapboxAccessToken={token}
        initialViewState={FALLBACK_VIEW}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        doubleClickZoom={false}
        onLoad={(e) => {
          geolocateRef.current?.trigger();
          const c = e.target.getCenter();
          setProximity({ lng: c.lng, lat: c.lat });
        }}
        onMoveEnd={(e) => {
          const c = e.target.getCenter();
          setProximity({ lng: c.lng, lat: c.lat });
        }}
        onDblClick={handleMapDoubleClick}
        style={{ width: "100%", height: "100%" }}
      >
        <GeolocateControl
          ref={geolocateRef}
          position="bottom-left"
          positionOptions={{ enableHighAccuracy: true, timeout: 8000 }}
          trackUserLocation
          showUserHeading
          fitBoundsOptions={{ maxZoom: 17 }}
          onError={(e) => {
            if (e.code === 1) setPermissionDenied(true);
          }}
        />

        {memories.map((m) => {
          const color = getColor(m.colorId);
          return (
            <Marker
              key={m.id}
              longitude={m.lng}
              latitude={m.lat}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setCandidate(null);
                setSelected(m);
              }}
            >
              <button
                type="button"
                aria-label={`${color.label} 기록`}
                className="block h-11 w-11 overflow-hidden rounded-full p-[3px] transition-transform hover:scale-[1.04] active:scale-95"
                style={{
                  backgroundColor: color.hex,
                  boxShadow: `0 0 0 1.5px rgba(10,10,10,0.55), 0 0 0 3.5px ${color.hex}33, 0 6px 18px rgba(0,0,0,0.55)`,
                }}
              >
                {m.photo ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={m.photo}
                    alt=""
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <span
                    className="block h-full w-full rounded-full"
                    style={{ backgroundColor: color.hex }}
                    aria-hidden
                  />
                )}
              </button>
            </Marker>
          );
        })}

        {candidate && (
          <Marker
            longitude={candidate.lng}
            latitude={candidate.lat}
            anchor="bottom"
          >
            <div className="pointer-events-none relative flex flex-col items-center">
              {/* drop pin shape: small circle on a tail */}
              <span
                className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-[0_8px_24px_rgba(0,0,0,0.55)] ring-1 ring-black/30"
                style={{
                  filter:
                    "drop-shadow(0 0 0 5px rgba(255,255,255,0.14))",
                }}
              >
                <span className="absolute inset-0 animate-ping rounded-full bg-white/35" />
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="relative text-zinc-900"
                  aria-hidden
                >
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </span>
              <span className="-mt-0.5 h-3 w-1 rounded-b-full bg-white/85" />
            </div>
          </Marker>
        )}
      </Map>

      <div
        className="absolute inset-x-4 z-10"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
      >
        <LocationSearch
          onSelect={handleSearchSelect}
          proximityLng={proximity?.lng}
          proximityLat={proximity?.lat}
        />
      </div>

      {/* Bottom sheet — modal so dragging or background tap dismisses */}
      <Drawer.Root
        open={Boolean(candidate)}
        onOpenChange={(open) => {
          if (!open) setCandidate(null);
        }}
        dismissible
      >
        <Drawer.Portal>
          {/* invisible overlay catches background taps to dismiss */}
          <Drawer.Overlay className="fixed inset-0 z-30 bg-transparent" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-[440px] flex-col rounded-t-[28px] bg-[#0d0d0e]/95 outline-none ring-1 ring-white/[0.08] backdrop-blur-2xl backdrop-saturate-[180%] shadow-[0_-16px_48px_rgba(0,0,0,0.55)]">
            <Drawer.Title className="sr-only">선택한 위치</Drawer.Title>
            <Drawer.Description className="sr-only">
              선택한 위치의 정보와 기록 남기기 옵션입니다. 아래로 드래그하거나
              배경을 탭해 닫을 수 있어요.
            </Drawer.Description>

            <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-white/30" />

            <div
              className="px-6 pt-4"
              style={{
                paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 22px)",
              }}
            >
              {candidate && (
                <>
                  <h2 className="break-keep text-[28px] font-semibold leading-[1.18] tracking-tight text-white">
                    {candidate.placeName}
                  </h2>
                  {candidate.address &&
                    candidate.address !== candidate.placeName && (
                      <p className="mt-1.5 text-[13px] leading-relaxed text-white/55">
                        {candidate.address}
                      </p>
                    )}

                  <div className="mt-5 rounded-2xl bg-white/[0.05] px-4 py-3.5 ring-1 ring-white/[0.06]">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/45">
                        주변 기록
                      </p>
                      {nearby.length > 0 && (
                        <div className="flex gap-1.5">
                          {nearby.slice(0, 6).map((x, i) => (
                            <span
                              key={i}
                              className="h-2.5 w-2.5 rounded-full"
                              style={{
                                backgroundColor: getColor(x.m.colorId).hex,
                                boxShadow: `0 0 0 2px rgba(255,255,255,0.04)`,
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="mt-1.5 text-[20px] font-semibold tracking-tight text-white">
                      {nearby.length > 0
                        ? `${nearby.length}개`
                        : "아직 비어 있어요"}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-white/45">
                      {nearby.length > 0
                        ? "반경 300m 안에 남겨진 흔적들이에요"
                        : "이곳의 첫 흔적이 됩니다"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={candidate.resolving}
                    className="mt-5 w-full rounded-2xl bg-white py-4 text-[15px] font-semibold tracking-tight text-zinc-900 shadow-[0_8px_24px_-8px_rgba(255,255,255,0.25)] transition hover:bg-zinc-100 active:scale-[0.99] disabled:opacity-70"
                  >
                    여기에 기록 남기기
                  </button>
                </>
              )}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      <BottomSheet
        open={Boolean(selected)}
        onOpenChange={(o) => {
          if (!o) setSelected(null);
        }}
      >
        {selected && (
          <MemoryCard
            memory={selected}
            onDeleted={() => {
              setMemories((prev) => prev.filter((m) => m.id !== selected.id));
              setSelected(null);
            }}
          />
        )}
      </BottomSheet>

      {permissionDenied && !candidate && (
        <div className="pointer-events-none absolute inset-x-4 bottom-24 rounded-2xl bg-zinc-900/90 px-4 py-3 text-center text-xs leading-5 text-zinc-300 shadow-lg backdrop-blur">
          위치 권한이 거부되어 기본 위치(서울)를 보여드려요.
          <br />
          브라우저 설정에서 위치 권한을 허용해주세요.
        </div>
      )}

      {/* First-time hint — appears when user has no memories and no candidate */}
      {memories.length === 0 && !candidate && (
        <div
          className="pointer-events-none absolute inset-x-4 z-10"
          style={{
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
          }}
        >
          <div className="rounded-[28px] bg-white/[0.06] px-5 py-4 text-center ring-1 ring-white/[0.08] backdrop-blur-2xl">
            <p className="text-[13px] leading-5 text-white/70">
              지도 어디든 두 번 탭해서
              <br />
              그 순간의 색과 글을 남겨보세요
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
