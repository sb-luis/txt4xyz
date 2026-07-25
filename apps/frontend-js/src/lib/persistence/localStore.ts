import { z } from "zod";

const STORAGE_KEY = "txt4xyz:doc";
const DEBOUNCE_MS = 500;

const storedDocSchema = z.string();

export function readStoredDoc(): string | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed = storedDocSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function writeStoredDoc(doc: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, doc);
  } catch {
    // Storage can be full or disabled (Safari private mode); persistence is best-effort.
  }
}

export function createDebouncedDocWriter(delayMs = DEBOUNCE_MS): {
  schedule: (doc: string) => void;
  cancel: () => void;
} {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    schedule(doc: string) {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        writeStoredDoc(doc);
      }, delayMs);
    },
    cancel() {
      if (timer !== null) clearTimeout(timer);
      timer = null;
    },
  };
}
