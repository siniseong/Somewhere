import { savePhoto } from "./db";
import { getSupabaseClient, PHOTO_BUCKET } from "./supabase";
import type { PhotoRecord } from "./types";

const MAX_FULL_DIMENSION = 1600;
const THUMB_DIMENSION = 96;

function makeId() {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function fileToImageBitmap(file: Blob): Promise<ImageBitmap> {
  return createImageBitmap(file);
}

function drawToCanvas(
  source: ImageBitmap,
  maxDimension: number,
): HTMLCanvasElement {
  const ratio = source.width / source.height;
  let width = source.width;
  let height = source.height;
  if (Math.max(width, height) > maxDimension) {
    if (width >= height) {
      width = maxDimension;
      height = Math.round(maxDimension / ratio);
    } else {
      height = maxDimension;
      width = Math.round(maxDimension * ratio);
    }
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context is unavailable");
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      type,
      quality,
    );
  });
}

export type ProcessedPhoto = {
  /** Set when stored in IndexedDB locally. */
  photoId?: string;
  /** Set when uploaded to Supabase Storage (or any remote http(s) URL). */
  photoUrl?: string;
  thumbDataUrl: string;
};

/**
 * Compress a captured/uploaded image and persist it.
 * Prefers Supabase Storage when env credentials are configured; otherwise falls
 * back to IndexedDB so the app keeps working in pure-local mode.
 */
export async function processAndStorePhoto(file: Blob): Promise<ProcessedPhoto> {
  const bitmap = await fileToImageBitmap(file);
  try {
    const fullCanvas = drawToCanvas(bitmap, MAX_FULL_DIMENSION);
    const fullBlob = await canvasToBlob(fullCanvas, "image/jpeg", 0.82);

    const thumbCanvas = drawToCanvas(bitmap, THUMB_DIMENSION);
    const thumbBlob = await canvasToBlob(thumbCanvas, "image/jpeg", 0.7);
    const thumbDataUrl = await blobToDataUrl(thumbBlob);

    const supabase = getSupabaseClient();
    if (supabase) {
      const objectName = `${makeId()}.jpg`;
      const { error } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(objectName, fullBlob, {
          contentType: "image/jpeg",
          upsert: false,
        });
      if (error) {
        console.warn("Supabase upload failed — falling back to IDB", error);
      } else {
        const { data: pub } = supabase.storage
          .from(PHOTO_BUCKET)
          .getPublicUrl(objectName);
        return { photoUrl: pub.publicUrl, thumbDataUrl };
      }
    }

    const record: PhotoRecord = {
      id: makeId(),
      blob: fullBlob,
      mime: "image/jpeg",
      createdAt: Date.now(),
    };
    await savePhoto(record);
    return { photoId: record.id, thumbDataUrl };
  } finally {
    bitmap.close();
  }
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(blob);
  });
}

export function blobToObjectUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}
