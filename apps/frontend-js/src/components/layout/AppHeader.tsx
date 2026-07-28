import type { RunnerStatus } from "@/lib/python/runner";
import {
  CLOSE_ROOM_FULL,
  CLOSE_AT_CAPACITY,
  CLOSE_INVALID_ROOM_ID,
  type ConnectionStatus,
} from "@/lib/collab/provider";
import type { Participant } from "@/lib/collab/useRoom";

const STATUS_LABEL: Record<RunnerStatus, string> = {
  loading: "loading runtime…",
  ready: "ready",
  running: "running…",
  error: "runtime error",
};

const ROOM_STATUS_LABEL: Record<ConnectionStatus, string> = {
  connecting: "connecting…",
  connected: "connected",
  disconnected: "disconnected",
  rejected: "room unavailable",
};

const REJECTED_CODE_LABEL: Record<number, string> = {
  [CLOSE_ROOM_FULL]: "room is full",
  [CLOSE_AT_CAPACITY]: "server at capacity",
  [CLOSE_INVALID_ROOM_ID]: "invalid room link",
};

function roomStatusLabel(status: ConnectionStatus, rejectedCode: number | null): string {
  if (status === "rejected" && rejectedCode !== null) {
    return REJECTED_CODE_LABEL[rejectedCode] ?? ROOM_STATUS_LABEL.rejected;
  }
  return ROOM_STATUS_LABEL[status];
}

export interface AppHeaderProps {
  status: RunnerStatus;
  onRun: () => void;
  onStop: () => void;
  room: { status: ConnectionStatus; rejectedCode: number | null; participants: Participant[] };
}

export function AppHeader({ status, onRun, onStop, room }: AppHeaderProps) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-4 border-b border-app-border bg-app-surface px-4 py-3">
      <div className="flex items-baseline gap-3 overflow-hidden">
        <span className="font-mono text-lg font-semibold text-app-fg">
          txt4.xyz
        </span>
        <span className="truncate text-sm text-app-muted">
          collaborative Python scratchpad
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span
          role="status"
          aria-label="runtime status"
          className={`font-mono text-xs ${status === "error" ? "text-app-error" : "text-app-muted"}`}
        >
          {STATUS_LABEL[status]}
        </span>
        <span role="status" aria-label="room status" className="font-mono text-xs text-app-muted">
          {roomStatusLabel(room.status, room.rejectedCode)}
        </span>
        {room.participants.length > 0 && (
          <ul aria-label="participants" className="flex items-center gap-1.5">
            {room.participants.map((participant) => (
              <li
                key={participant.clientId}
                title={participant.name}
                className="flex h-5 w-5 items-center justify-center rounded-full font-mono text-[10px] font-semibold text-app-bg"
                style={{ backgroundColor: participant.color }}
              >
                {participant.name.slice(0, 1).toUpperCase()}
              </li>
            ))}
          </ul>
        )}
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
