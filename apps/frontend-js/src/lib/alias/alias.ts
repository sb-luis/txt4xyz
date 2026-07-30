import { z } from "zod";

const ALIAS_STORAGE_KEY = "txt4xyz:alias";

export const MAX_ALIAS_LENGTH = 24;

const ALIAS_PATTERN = /^[a-zA-Z0-9-]+$/;

export function isValidAlias(value: string): boolean {
  return value.length > 0 && value.length <= MAX_ALIAS_LENGTH && ALIAS_PATTERN.test(value);
}

const aliasSchema = z.string().refine(isValidAlias);

export function readStoredAlias(): string | null {
  try {
    const raw = window.localStorage.getItem(ALIAS_STORAGE_KEY);
    if (raw === null) return null;
    const parsed = aliasSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function writeStoredAlias(alias: string | null): void {
  try {
    if (alias === null) {
      window.localStorage.removeItem(ALIAS_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(ALIAS_STORAGE_KEY, alias);
  } catch {
    // Storage can be full or disabled (Safari private mode); persistence is best-effort.
  }
}
