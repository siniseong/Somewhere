"use client";

import { useEffect, useState } from "react";
import { MapPin, Trash2 } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { deleteMemory, getPhoto } from "@/lib/db";
import type { Memory } from "@/lib/types";
import { blobToObjectUrl } from "@/lib/photo";

type Props = {
  memory: Memory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: (id: string) => void;
};

function formatDate(ts: number) {
  const d = new Date(ts);
  const fmt = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
  return fmt.format(d);
}

export function MemoryDetailDrawer({
  memory,
  open,
  onOpenChange,
  onDeleted,
}: Props) {
  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const photoId = memory?.photoId;
  const remoteUrl = memory?.photoUrl;
  const displayUrl = remoteUrl ?? localPhotoUrl;

  useEffect(() => {
    if (!open || !photoId || remoteUrl) return;
    let revoke: string | null = null;
    let canceled = false;
    getPhoto(photoId)
      .then((p) => {
        if (canceled || !p) return;
        const url = blobToObjectUrl(p.blob);
        revoke = url;
        setLocalPhotoUrl(url);
      })
      .catch((err) => console.error("photo load failed", err));
    return () => {
      canceled = true;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [open, photoId, remoteUrl]);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setConfirmingDelete(false);
      setLocalPhotoUrl(null);
    }
    onOpenChange(next);
  }

  if (!memory) return null;

  async function handleDelete() {
    if (!memory) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    await deleteMemory(memory.id);
    onDeleted(memory.id);
    handleOpenChange(false);
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-[88dvh]">
        <DrawerHeader>
          <div className="flex items-center gap-2.5">
            <span
              className="h-3 w-3 rounded-full"
              style={{
                backgroundColor: memory.color,
                boxShadow: `0 0 0 4px ${memory.color}24`,
              }}
              aria-hidden
            />
            <span className="ml-auto text-[12px] text-white/40">
              {formatDate(memory.createdAt)}
            </span>
          </div>
          <DrawerTitle className="mt-1.5">
            {memory.note || "기록한 순간"}
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            {memory.placeName || "저장된 장소"}의 기록 상세 정보
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-col gap-4 px-5 pb-2 pt-4">
          {displayUrl && (
            <div className="overflow-hidden rounded-2xl ring-1 ring-white/[0.08]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={displayUrl}
                alt={memory.note || "기록 사진"}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
          )}

          {(memory.placeName || memory.address) && (
            <div className="flex items-start gap-2.5 rounded-2xl bg-white/[0.04] px-4 py-3 ring-1 ring-white/[0.06]">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-white/55" />
              <div className="min-w-0 flex-1">
                {memory.placeName && (
                  <div className="truncate text-[14px] tracking-tight text-white">
                    {memory.placeName}
                  </div>
                )}
                {memory.address && (
                  <div className="mt-0.5 truncate text-[12px] text-white/55">
                    {memory.address}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-col gap-2 px-5 pt-3">
          <Button
            type="button"
            variant={confirmingDelete ? "destructive" : "secondary"}
            size="lg"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
            {confirmingDelete ? "정말 삭제할까요?" : "기록 삭제"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={() => handleOpenChange(false)}
          >
            닫기
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
