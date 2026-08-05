import type { Extension } from "@codemirror/state";

export type ExtensionInput = Extension | { extension: Extension; position?: "before" | "after" };

export function splitExtensions(input: ExtensionInput[]): { before: Extension[]; after: Extension[] } {
  const before: Extension[] = [];
  const after: Extension[] = [];
  for (const item of input) {
    if (item !== null && typeof item === "object" && "extension" in item) {
      const position = "position" in item ? item.position : undefined;
      (position === "before" ? before : after).push(item.extension);
    } else {
      after.push(item as Extension);
    }
  }
  return { before, after };
}
