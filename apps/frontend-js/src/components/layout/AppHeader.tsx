import type { RunnerStatus } from "@/lib/python/runner";

const STATUS_LABEL: Record<RunnerStatus, string> = {
  loading: "loading runtime…",
  ready: "ready",
  running: "running…",
  error: "runtime error",
};

export interface AppHeaderProps {
  status: RunnerStatus;
  onRun: () => void;
  onStop: () => void;
}

export function AppHeader({ status, onRun, onStop }: AppHeaderProps) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-4 border-b border-app-border bg-app-surface px-4 py-3">
      <div className="flex items-baseline gap-3 overflow-hidden">
        <span className="font-mono text-lg font-semibold text-app-fg">
          txt4.xyz
        </span>
        <span className="truncate text-sm text-app-muted">
          collaborative Python scratchpad — runs in your browser
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span
          role="status"
          className={`font-mono text-xs ${status === "error" ? "text-app-error" : "text-app-muted"}`}
        >
          {STATUS_LABEL[status]}
        </span>
        <button
          type="button"
          disabled={status !== "ready"}
          onClick={onRun}
          className="rounded border border-app-border px-3 py-1 font-mono text-xs text-app-fg disabled:cursor-not-allowed disabled:text-app-muted disabled:opacity-50"
        >
          Run
        </button>
        <button
          type="button"
          disabled={status !== "running"}
          onClick={onStop}
          className="rounded border border-app-border px-3 py-1 font-mono text-xs text-app-fg disabled:cursor-not-allowed disabled:text-app-muted disabled:opacity-50"
        >
          Stop
        </button>
      </div>
    </header>
  );
}
