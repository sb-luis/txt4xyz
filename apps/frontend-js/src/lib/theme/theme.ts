import { z } from "zod";

export type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "txt4xyz:theme";

const themeSchema = z.union([z.literal("light"), z.literal("dark")]);

export function readStoredTheme(): Theme | null {
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === null) return null;
    const parsed = themeSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function writeStoredTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage can be full or disabled (Safari private mode); persistence is best-effort.
  }
}

export function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveInitialTheme(): Theme {
  return readStoredTheme() ?? systemTheme();
}
