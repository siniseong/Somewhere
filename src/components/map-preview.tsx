"use client";

import { useEffect, useRef, useState } from "react";
import Map, { Marker, type MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { getAllMemories } from "@/lib/db";
import type { Memory } from "@/lib/types";

const FALLBACK_VIEW = {
  longitude: 126.978,
  latitude: 37.5665,
  zoom: 11,
};

export function MapPreview() {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const mapRef = useRef<MapRef | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);

  useEffect(() => {
    getAllMemories()
      .then(setMemories)
      .catch((err) => console.error("failed to load memories", err));
  }, []);

  if (!token) {
    return (
      <div className="flex h-full w-full items-center justify-center text-[12px] text-white/40">
        지도를 불러올 수 없어요
      </div>
    );
  }

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={token}
      initialViewState={FALLBACK_VIEW}
      mapStyle="mapbox://styles/mapbox/dark-v11"
      interactive={false}
      attributionControl={false}
      onLoad={() => {
        if (typeof navigator === "undefined" || !navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            mapRef.current?.getMap().jumpTo({
              center: [pos.coords.longitude, pos.coords.latitude],
              zoom: 14,
            });
          },
          () => {},
          { enableHighAccuracy: true, timeout: 8000 },
        );
      }}
      style={{ width: "100%", height: "100%" }}
    >
      {memories.map((m) => (
        <Marker key={m.id} longitude={m.lng} latitude={m.lat} anchor="center">
          {m.photoThumb ? (
            <span
              className="relative block h-12 w-12 overflow-hidden rounded-full"
              style={{
                boxShadow: `inset 0 0 0 2.5px ${m.color}, 0 6px 16px rgba(0,0,0,0.5)`,
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
              className="block h-7 w-7 rounded-full"
              style={{
                backgroundColor: m.color,
                boxShadow:
                  "0 0 0 1.5px rgba(10,10,10,0.55), 0 4px 10px rgba(0,0,0,0.5)",
              }}
              aria-hidden
            />
          )}
        </Marker>
      ))}
    </Map>
  );
}
