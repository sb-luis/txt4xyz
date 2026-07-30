import type { RunnerStatus } from "@/lib/python/runner";

const RUNTIME_STATUS_LABEL: Record<RunnerStatus, string> = {
  loading: "loading runtime…",
  ready: "runtime ready",
  running: "running…",
  error: "runtime error",
};

export interface StatusBarProps {
  runtimeStatus: RunnerStatus;
  docLength: number;
  maxDocLength: number;
}

function formatCount(value: number): string {
  return value >= 1000 ? `${Math.floor(value / 1000)}K` : value.toLocaleString();
}

export function StatusBar({ runtimeStatus, docLength, maxDocLength }: StatusBarProps) {
  return (
    <footer className="flex shrink-0 items-center justify-between gap-4 px-4 py-2 font-mono text-xs text-app-fg/70">
      <span>{RUNTIME_STATUS_LABEL[runtimeStatus]}</span>
      <span>
        {formatCount(docLength)} / {formatCount(maxDocLength)} chars
      </span>
    </footer>
  );
}
