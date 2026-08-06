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

const OFFLINE_DOC_KEY = "txt4xyz:offline-doc";

export function readOfflineDoc(): string | null {
  return readStoredDoc(OFFLINE_DOC_KEY);
}

export function createDebouncedOfflineDocWriter(delayMs = DEBOUNCE_MS): {
  schedule: (doc: string) => void;
  cancel: () => void;
} {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    schedule(doc: string) {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        writeStoredDoc(OFFLINE_DOC_KEY, doc);
      }, delayMs);
    },
    cancel() {
      if (timer !== null) clearTimeout(timer);
      timer = null;
    },
  };
}
