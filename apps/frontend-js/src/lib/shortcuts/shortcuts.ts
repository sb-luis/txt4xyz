export interface ShortcutDef {
  id: string;
  keys: string;
  description: string;
}

export const SHORTCUTS: readonly ShortcutDef[] = [
  { id: "run", keys: "Ctrl/⌘ + Enter", description: "Run code" },
  { id: "stop", keys: "Esc", description: "Stop execution" },
  { id: "cycle-layout", keys: "Ctrl/⌘ + \\", description: "Cycle workspace layout" },
];
