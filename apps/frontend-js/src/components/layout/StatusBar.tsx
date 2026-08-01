import type { FormatterStatus } from "@/lib/format/useFormatterStatus";
import type { RunnerStatus } from "@/lib/python/runner";

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
  docLength: number;
  maxDocLength: number;
}

function formatCount(value: number): string {
  return value >= 1000 ? `${Math.floor(value / 1000)}K` : value.toLocaleString();
}

export function StatusBar({ runtimeStatus, formatterStatus, docLength, maxDocLength }: StatusBarProps) {
  return (
    <footer className="flex shrink-0 items-center justify-between gap-4 px-4 py-2 text-xs text-muted-foreground">
      <span>
        {RUNTIME_STATUS_LABEL[runtimeStatus]} · {FORMATTER_STATUS_LABEL[formatterStatus]}
      </span>
      <span>
        {formatCount(docLength)} / {formatCount(maxDocLength)} chars
      </span>
    </footer>
  );
}
