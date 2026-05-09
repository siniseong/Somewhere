"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, MapPin } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

type Coords = { lng: number; lat: number };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coords: Coords | null;
  placeName?: string;
  address?: string;
};

function fallbackLabel(c: Coords) {
  return `${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}`;
}

export function LocationConfirmSheet({
  open,
  onOpenChange,
  coords,
  placeName,
  address,
}: Props) {
  const router = useRouter();

  function handleConfirm() {
    if (!coords) return;
    const params = new URLSearchParams({
      lng: String(coords.lng),
      lat: String(coords.lat),
    });
    if (placeName) params.set("place", placeName);
    if (address) params.set("addr", address);
    router.push(`/record?${params.toString()}`);
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} modal={false}>
      <DrawerContent className="max-h-[60dvh]">
        <DrawerHeader>
          <DrawerTitle>이 위치가 맞아요?</DrawerTitle>
          <DrawerDescription>
            맞다면 다음 화면에서 한 줄과 사진을 남길 수 있어요.
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-col gap-4 px-5 pb-2 pt-5">
          <div className="flex items-start gap-3 rounded-2xl bg-white/[0.05] px-4 py-3.5 ring-1 ring-white/[0.06]">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10">
              <MapPin className="h-3.5 w-3.5 text-white/85" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] tracking-tight text-white">
                {placeName || (coords ? fallbackLabel(coords) : "위치 확인 중…")}
              </div>
              {address && (
                <div className="mt-0.5 truncate text-[12.5px] text-white/55">
                  {address}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 px-5 pt-2">
          <Button
            type="button"
            size="lg"
            disabled={!coords}
            onClick={handleConfirm}
          >
            여기에 기록하기
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={() => onOpenChange(false)}
          >
            다른 곳을 고를래요
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
