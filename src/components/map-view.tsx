"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Map, {
  GeolocateControl,
  Marker,
  type MapMouseEvent,
  type MapRef,
} from "react-map-gl/mapbox";
import type { GeolocateControl as MapboxGeolocateControl } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { getAllMemories } from "@/lib/db";
import { getColor } from "@/lib/colors";
import { reverseGeocode } from "@/lib/geocode";
import type { Memory } from "@/lib/types";
import { LocationSearch, type LocationSuggestion } from "./location-search";
import { LocationConfirmSheet } from "./location-confirm-sheet";
import { MemoryDetailDrawer } from "./memory-detail-drawer";

const FALLBACK_VIEW = {
  longitude: 126.978,
  latitude: 37.5665,
  zoom: 12,
};

type DraftPin = {
  lng: number;
  lat: number;
  placeName?: string;
  address?: string;
};

export function MapView() {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const mapRef = useRef<MapRef | null>(null);
  const geolocateRef = useRef<MapboxGeolocateControl | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [proximity, setProximity] = useState<{
    lng: number;
    lat: number;
  } | null>(null);
  const [draft, setDraft] = useState<DraftPin | null>(null);
  const [recordOpen, setRecordOpen] = useState(false);
  const [selected, setSelected] = useState<Memory | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

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
  }

  const handleDoubleClick = useCallback((e: MapMouseEvent) => {
    e.preventDefault();
    const { lng, lat } = e.lngLat;
    if (typeof document !== "undefined") {
      const active = document.activeElement;
      if (active instanceof HTMLElement) active.blur();
    }
    setDraft({ lng, lat });
    setRecordOpen(true);
    const map = mapRef.current?.getMap();
    if (map) {
      map.easeTo({ center: [lng, lat], duration: 500, padding: { bottom: 360 } });
    }
    reverseGeocode(lng, lat)
      .then((r) => {
        setDraft((current) =>
          current && current.lng === lng && current.lat === lat
            ? { ...current, placeName: r.placeName, address: r.address }
            : current,
        );
      })
      .catch(() => {
        /* swallow — drawer still works without place metadata */
      });
  }, []);

  function handleRecordOpenChange(open: boolean) {
    setRecordOpen(open);
    if (!open) setDraft(null);
  }

  function handleMarkerClick(memory: Memory) {
    if (typeof document !== "undefined") {
      const active = document.activeElement;
      if (active instanceof HTMLElement) active.blur();
    }
    setSelected(memory);
    setDetailOpen(true);
    const map = mapRef.current?.getMap();
    if (map) {
      map.easeTo({
        center: [memory.lng, memory.lat],
        duration: 500,
        padding: { bottom: 320 },
      });
    }
  }

  function handleDeleted(id: string) {
    setMemories((prev) => prev.filter((m) => m.id !== id));
    setSelected(null);
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
        onDblClick={handleDoubleClick}
        style={{ width: "100%", height: "100%" }}
      >
        <GeolocateControl
          ref={geolocateRef}
          position="bottom-left"
          positionOptions={{ enableHighAccuracy: true, timeout: 8000 }}
          trackUserLocation
          showUserHeading
          fitBoundsOptions={{ maxZoom: 17 }}
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
                handleMarkerClick(m);
              }}
            >
              <button
                type="button"
                aria-label={`${color.label} 기록 보기`}
                className="group relative flex items-center justify-center"
              >
                {m.photoThumb ? (
                  <span
                    className="relative h-12 w-12 overflow-hidden rounded-full transition group-hover:scale-105"
                    style={{
                      boxShadow: `inset 0 0 0 2.5px ${color.hex}, 0 6px 16px rgba(0,0,0,0.5)`,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.photoThumb}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </span>
                ) : (
                  <span
                    className="relative h-7 w-7 rounded-full transition group-hover:scale-110"
                    style={{
                      backgroundColor: color.hex,
                      boxShadow: `0 0 0 1.5px rgba(10,10,10,0.55), 0 4px 10px rgba(0,0,0,0.5)`,
                    }}
                    aria-hidden
                  />
                )}
              </button>
            </Marker>
          );
        })}

        {draft && (
          <Marker
            longitude={draft.lng}
            latitude={draft.lat}
            anchor="bottom"
            style={{ pointerEvents: "none" }}
          >
            <div
              className="origin-bottom"
              style={{ animation: "pinDrop 360ms cubic-bezier(0.2,0.9,0.3,1.2) both" }}
            >
              <div className="relative flex h-9 w-9 items-center justify-center">
                <span
                  className="absolute inset-0 rounded-full bg-white/20"
                  style={{ animation: "pulseRing 1.6s ease-out infinite" }}
                  aria-hidden
                />
                <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-white text-zinc-900 shadow-[0_8px_24px_rgba(0,0,0,0.55)]">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M12 5v14" />
                    <path d="M5 12h14" />
                  </svg>
                </span>
              </div>
              <div
                className="mx-auto -mt-1 h-3 w-[3px] rounded-full bg-white/70"
                aria-hidden
              />
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

      {!recordOpen && !detailOpen && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center pb-[max(env(safe-area-inset-bottom,0px),20px)]"
        >
          <div className="pointer-events-auto rounded-full bg-black/55 px-4 py-2 text-[12px] tracking-tight text-white/75 backdrop-blur-md ring-1 ring-white/10">
            지도를 두 번 두드리면 그곳에 기록할 수 있어요
          </div>
        </div>
      )}

      <LocationConfirmSheet
        open={recordOpen}
        onOpenChange={handleRecordOpenChange}
        coords={draft ? { lng: draft.lng, lat: draft.lat } : null}
        placeName={draft?.placeName}
        address={draft?.address}
      />

      <MemoryDetailDrawer
        memory={selected}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setSelected(null);
        }}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
