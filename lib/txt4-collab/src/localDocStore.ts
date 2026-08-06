import type { DocStore } from "./useRoom";

export interface LocalDocStoreOptions {
  prefix?: string;
  indexKey?: string;
  maxDocs?: number;
}

const DEFAULT_PREFIX = "txt4xyz:room:";
// Not derived from the prefix: deriving it changes the live key and orphans deployed users' saved docs.
const DEFAULT_INDEX_KEY = "txt4xyz:room-index";
const DEFAULT_MAX_DOCS = 20;

export function createLocalDocStore(options: LocalDocStoreOptions = {}): DocStore {
  const prefix = options.prefix ?? DEFAULT_PREFIX;
  const indexKey = options.indexKey ?? DEFAULT_INDEX_KEY;
  const maxDocs = options.maxDocs ?? DEFAULT_MAX_DOCS;

  function storageKey(roomId: string): string {
    return `${prefix}${roomId}`;
  }

  function readStoredDoc(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function writeStoredDoc(key: string, doc: string): void {
    try {
      window.localStorage.setItem(key, doc);
    } catch {
      // Storage can be full or disabled (Safari private mode); persistence is best-effort.
    }
  }

  function removeStoredDoc(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Storage can be full or disabled (Safari private mode); persistence is best-effort.
    }
  }

  function readRoomIndex(): string[] {
    try {
      const raw = window.localStorage.getItem(indexKey);
      if (raw === null) return [];
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
    } catch {
      return [];
    }
  }

  function writeRoomIndex(ids: string[]): void {
    try {
      window.localStorage.setItem(indexKey, JSON.stringify(ids));
    } catch {
      // Storage can be full or disabled (Safari private mode); persistence is best-effort.
    }
  }

  function touchRoomIndex(roomId: string): void {
    const ids = readRoomIndex().filter((id) => id !== roomId);
    ids.unshift(roomId);
    for (const evicted of ids.slice(maxDocs)) {
      removeStoredDoc(storageKey(evicted));
    }
    writeRoomIndex(ids.slice(0, maxDocs));
  }

  return {
    read(roomId: string): string | null {
      return readStoredDoc(storageKey(roomId));
    },
    write(roomId: string, doc: string): void {
      writeStoredDoc(storageKey(roomId), doc);
      touchRoomIndex(roomId);
    },
  };
}
