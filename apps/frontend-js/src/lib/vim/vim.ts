import { z } from "zod";

const VIM_MODE_STORAGE_KEY = "txt4xyz:vim-mode";

const vimModeSchema = z.boolean();

export function readStoredVimMode(): boolean {
  try {
    const raw = window.localStorage.getItem(VIM_MODE_STORAGE_KEY);
    if (raw === null) return false;
    const parsed = vimModeSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : false;
  } catch {
    return false;
  }
}

export function writeStoredVimMode(enabled: boolean): void {
  try {
    window.localStorage.setItem(VIM_MODE_STORAGE_KEY, JSON.stringify(enabled));
  } catch {
    // Storage can be full or disabled (Safari private mode); persistence is best-effort.
  }
}
