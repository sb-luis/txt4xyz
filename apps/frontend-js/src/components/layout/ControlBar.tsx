import type { ReactNode } from "react";
import { BugIcon } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import type { ExecutionMode } from "@txt4/core";

export interface ControlBarProps {
  mode: ExecutionMode;
  onModeChange: (mode: ExecutionMode) => void;
  children: ReactNode;
}

export function ControlBar({ mode, onModeChange, children }: ControlBarProps) {
  return (
    <div className="relative flex shrink-0 items-center justify-center gap-1 border-b border-border px-4 py-2">
      {children}
      <Toggle
        size="sm"
        className="absolute right-4"
        pressed={mode === "debug"}
        onPressedChange={(pressed) => onModeChange(pressed ? "debug" : "run")}
        aria-label="debug mode"
      >
        <BugIcon />
      </Toggle>
    </div>
  );
}
