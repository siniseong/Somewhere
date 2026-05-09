"use client";

import { useRef, useState } from "react";
import Map, { GeolocateControl } from "react-map-gl/mapbox";
import type { GeolocateControl as MapboxGeolocateControl } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const FALLBACK_VIEW = {
  longitude: 126.978,
  latitude: 37.5665,
  zoom: 12,
};

export function MapView() {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const geolocateRef = useRef<MapboxGeolocateControl | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

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
        mapboxAccessToken={token}
        initialViewState={FALLBACK_VIEW}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        onLoad={() => geolocateRef.current?.trigger()}
        reuseMaps
        style={{ width: "100%", height: "100%" }}
      >
        <GeolocateControl
          ref={geolocateRef}
          position="top-right"
          positionOptions={{ enableHighAccuracy: true, timeout: 8000 }}
          trackUserLocation
          showUserHeading
          fitBoundsOptions={{ maxZoom: 17 }}
          onError={(e) => {
            if (e.code === 1) setPermissionDenied(true);
          }}
        />
      </Map>

      {permissionDenied && (
        <div className="pointer-events-none absolute inset-x-4 bottom-6 rounded-2xl bg-zinc-900/90 px-4 py-3 text-center text-xs leading-5 text-zinc-300 shadow-lg backdrop-blur">
          위치 권한이 거부되어 기본 위치(서울)를 보여드려요.
          <br />
          브라우저 설정에서 위치 권한을 허용해주세요.
        </div>
      )}
    </div>
  );
}
