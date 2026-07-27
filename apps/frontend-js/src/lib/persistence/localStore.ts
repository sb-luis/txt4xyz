import { z } from "zod";

const DEBOUNCE_MS = 500;

const storedDocSchema = z.string();

export function readStoredDoc(key: string): string | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;
    const parsed = storedDocSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
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

export function createDebouncedDocWriter(
  key: string,
  delayMs = DEBOUNCE_MS,
): {
  schedule: (doc: string) => void;
  cancel: () => void;
} {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    schedule(doc: string) {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        writeStoredDoc(key, doc);
      }, delayMs);
    },
    cancel() {
      if (timer !== null) clearTimeout(timer);
      timer = null;
    },
  };
}

const ROOM_KEY_PREFIX = "txt4xyz:room:";
const ROOM_INDEX_KEY = "txt4xyz:room-index";
const MAX_STORED_ROOMS = 20;

export function roomStorageKey(roomId: string): string {
  return `${ROOM_KEY_PREFIX}${roomId}`;
}

export function readStoredRoomDoc(roomId: string): string | null {
  return readStoredDoc(roomStorageKey(roomId));
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
    const raw = window.localStorage.getItem(ROOM_INDEX_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeRoomIndex(ids: string[]): void {
  try {
    window.localStorage.setItem(ROOM_INDEX_KEY, JSON.stringify(ids));
  } catch {
    // Storage can be full or disabled (Safari private mode); persistence is best-effort.
  }
}

// Bearer-credential-shaped room ids are already only ever written to this
// client's own storage, so keeping the most-recently-touched ids here is safe
// — the point of the index is purely to bound growth, not to track anything.
function touchRoomIndex(roomId: string): void {
  const ids = readRoomIndex().filter((id) => id !== roomId);
  ids.unshift(roomId);
  for (const evicted of ids.slice(MAX_STORED_ROOMS)) {
    removeStoredDoc(roomStorageKey(evicted));
  }
  writeRoomIndex(ids.slice(0, MAX_STORED_ROOMS));
}

export function writeStoredRoomDoc(roomId: string, doc: string): void {
  writeStoredDoc(roomStorageKey(roomId), doc);
  touchRoomIndex(roomId);
}

export function createDebouncedRoomDocWriter(
  roomId: string,
  delayMs = DEBOUNCE_MS,
): {
  schedule: (doc: string) => void;
  cancel: () => void;
} {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    schedule(doc: string) {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        writeStoredRoomDoc(roomId, doc);
      }, delayMs);
    },
    cancel() {
      if (timer !== null) clearTimeout(timer);
      timer = null;
    },
  };
}
