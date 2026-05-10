import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { getCurrentUser } from "./auth";
import { getSupabaseClient, PHOTO_BUCKET } from "./supabase";
import type { Memory, PhotoRecord } from "./types";
import { getDeviceId } from "./user";

interface SomewhereDB extends DBSchema {
  memories: {
    key: string;
    value: Memory;
    indexes: { "by-createdAt": number };
  };
  photos: {
    key: string;
    value: PhotoRecord;
  };
}

let dbPromise: Promise<IDBPDatabase<SomewhereDB>> | null = null;

function getDB() {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is only available in the browser.");
  }
  if (!dbPromise) {
    dbPromise = openDB<SomewhereDB>("somewhere", 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const store = db.createObjectStore("memories", { keyPath: "id" });
          store.createIndex("by-createdAt", "createdAt");
        }
        if (oldVersion < 2) {
          db.createObjectStore("photos", { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

type MemoryRow = {
  id: string;
  lat: number;
  lng: number;
  place_name: string | null;
  address: string | null;
  color: string;
  note: string;
  photo_url: string | null;
  photo_thumb: string | null;
  music_artist: string | null;
  music_title: string | null;
  owner_user_id?: string | null;
  owner_device_id?: string | null;
  created_at: string;
};

function rowToMemory(row: MemoryRow): Memory {
  const music =
    row.music_artist || row.music_title
      ? { artist: row.music_artist ?? "", title: row.music_title ?? "" }
      : undefined;
  return {
    id: row.id,
    lat: row.lat,
    lng: row.lng,
    placeName: row.place_name ?? undefined,
    address: row.address ?? undefined,
    color: row.color,
    note: row.note,
    photoUrl: row.photo_url ?? undefined,
    photoThumb: row.photo_thumb ?? undefined,
    music,
    createdAt: new Date(row.created_at).getTime(),
  };
}

async function memoryToRow(memory: Memory): Promise<MemoryRow> {
  const user = await getCurrentUser();
  return {
    id: memory.id,
    lat: memory.lat,
    lng: memory.lng,
    place_name: memory.placeName ?? null,
    address: memory.address ?? null,
    color: memory.color,
    note: memory.note,
    photo_url: memory.photoUrl ?? null,
    photo_thumb: memory.photoThumb ?? null,
    music_artist: memory.music?.artist ?? null,
    music_title: memory.music?.title ?? null,
    owner_user_id: user?.id ?? null,
    owner_device_id: typeof window !== "undefined" ? getDeviceId() : null,
    created_at: new Date(memory.createdAt).toISOString(),
  };
}

export async function getAllMemories(): Promise<Memory[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const user = await getCurrentUser();
    let query = supabase
      .from("memories")
      .select("*")
      .order("created_at", { ascending: false });
    query = user
      ? query.eq("owner_user_id", user.id)
      : query.is("owner_user_id", null).eq("owner_device_id", getDeviceId());
    const { data, error } = await query;
    if (error) {
      console.warn("Supabase select failed — falling back to IDB", error);
    } else {
      return (data as MemoryRow[]).map(rowToMemory);
    }
  }
  const db = await getDB();
  const items = await db.getAllFromIndex("memories", "by-createdAt");
  return items.reverse();
}

export async function saveMemory(memory: Memory): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const row = await memoryToRow(memory);
    const { error } = await supabase.from("memories").upsert(row);
    if (!error) return;
    console.warn("Supabase insert failed — falling back to IDB", error);
  }
  const db = await getDB();
  await db.put("memories", memory);
}

/**
 * Claim memories previously created anonymously on this device for the now-logged-in user.
 */
export async function claimDeviceMemoriesForUser(userId: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const { error } = await supabase
    .from("memories")
    .update({ owner_user_id: userId })
    .is("owner_user_id", null)
    .eq("owner_device_id", getDeviceId());
  if (error) console.warn("memories claim failed", error);
}

export async function deleteMemory(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  let memory: Memory | undefined;

  if (supabase) {
    const { data } = await supabase
      .from("memories")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (data) memory = rowToMemory(data as MemoryRow);
    const { error } = await supabase.from("memories").delete().eq("id", id);
    if (error) console.warn("Supabase delete failed", error);
  }

  const db = await getDB();
  if (!memory) memory = await db.get("memories", id);
  await db.delete("memories", id);

  if (memory?.photoId) {
    await db.delete("photos", memory.photoId);
  }
  if (memory?.photoUrl && supabase) {
    const objectName = parseSupabaseObjectName(memory.photoUrl);
    if (objectName) {
      supabase.storage
        .from(PHOTO_BUCKET)
        .remove([objectName])
        .catch((err) =>
          console.warn("Supabase storage delete failed (ignored)", err),
        );
    }
  }
}

function parseSupabaseObjectName(url: string): string | null {
  const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function getMemory(id: string): Promise<Memory | undefined> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("memories")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!error && data) return rowToMemory(data as MemoryRow);
  }
  const db = await getDB();
  return db.get("memories", id);
}

export async function savePhoto(record: PhotoRecord): Promise<void> {
  const db = await getDB();
  await db.put("photos", record);
}

export async function getPhoto(id: string): Promise<PhotoRecord | undefined> {
  const db = await getDB();
  return db.get("photos", id);
}
