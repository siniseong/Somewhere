import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Memory } from "./types";

interface SomewhereDB extends DBSchema {
  memories: {
    key: string;
    value: Memory;
    indexes: { "by-createdAt": number };
  };
}

let dbPromise: Promise<IDBPDatabase<SomewhereDB>> | null = null;

function getDB() {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is only available in the browser.");
  }
  if (!dbPromise) {
    dbPromise = openDB<SomewhereDB>("somewhere", 1, {
      upgrade(db) {
        const store = db.createObjectStore("memories", { keyPath: "id" });
        store.createIndex("by-createdAt", "createdAt");
      },
    });
  }
  return dbPromise;
}

export async function getAllMemories(): Promise<Memory[]> {
  const db = await getDB();
  const items = await db.getAllFromIndex("memories", "by-createdAt");
  return items.reverse();
}

export async function saveMemory(memory: Memory): Promise<void> {
  const db = await getDB();
  await db.put("memories", memory);
}

export async function deleteMemory(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("memories", id);
}

export async function getMemory(id: string): Promise<Memory | undefined> {
  const db = await getDB();
  return db.get("memories", id);
}
