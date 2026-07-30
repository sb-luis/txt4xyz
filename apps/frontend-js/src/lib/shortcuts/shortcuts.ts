export interface ShortcutDef {
  id: string;
  keys: string;
  description: string;
}

export const SHORTCUTS: readonly ShortcutDef[] = [
  { id: "run", keys: "Ctrl/⌘ + Enter", description: "Run code" },
  { id: "stop", keys: "Esc", description: "Stop execution" },
  { id: "toggle-output", keys: "Ctrl/⌘ + \\", description: "Collapse/expand output" },
];
