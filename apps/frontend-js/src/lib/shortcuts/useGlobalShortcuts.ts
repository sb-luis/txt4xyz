import { useEffect } from "react";

export interface GlobalShortcutHandlers {
  onRun: () => void;
  onStop: () => void;
  onToggleOutput: () => void;
}

function isModifierPressed(event: KeyboardEvent): boolean {
  return event.metaKey || event.ctrlKey;
}

// Any open dialog (settings modal, participants popover) owns Escape/closing
// while it's open, so the global Stop shortcut must stand down rather than
// racing it.
function isDialogOpen(): boolean {
  return document.querySelector('[role="dialog"]') !== null;
}

export function useGlobalShortcuts({ onRun, onStop, onToggleOutput }: GlobalShortcutHandlers) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isDialogOpen()) return;

      if (isModifierPressed(event) && event.key === "Enter") {
        event.preventDefault();
        onRun();
        return;
      }
      if (isModifierPressed(event) && event.key === "\\") {
        event.preventDefault();
        onToggleOutput();
        return;
      }
      if (event.key === "Escape") {
        onStop();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onRun, onStop, onToggleOutput]);
}
