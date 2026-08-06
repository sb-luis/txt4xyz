import type { FormatterStatus, RunnerStatus } from "@txt4/lang-py";

const RUNTIME_STATUS_LABEL: Record<RunnerStatus, string> = {
  loading: "loading runtime…",
  ready: "runtime ready",
  running: "running…",
  error: "runtime error",
};

const FORMATTER_STATUS_LABEL: Record<FormatterStatus, string> = {
  loading: "loading formatter…",
  ready: "formatter ready",
  error: "formatter error",
};

export interface StatusBarProps {
  runtimeStatus: RunnerStatus;
  formatterStatus: FormatterStatus;
  docBytes: number;
  stepNumber: number | null;
}

// Bytes, not characters. Shows only the current size, never the (real) cap.
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  return `${kb % 1 === 0 ? kb : kb.toFixed(1)} KB`;
}

export function StatusBar({ runtimeStatus, formatterStatus, docBytes, stepNumber }: StatusBarProps) {
  return (
    <footer className="flex shrink-0 items-center justify-between gap-4 px-4 py-2 text-xs text-muted-foreground">
      <span>
        {RUNTIME_STATUS_LABEL[runtimeStatus]} · {FORMATTER_STATUS_LABEL[formatterStatus]}
      </span>
      <span className="flex items-center gap-4">
        {stepNumber !== null && <span>Step {stepNumber}</span>}
        <span>{formatBytes(docBytes)}</span>
      </span>
    </footer>
  );
}
