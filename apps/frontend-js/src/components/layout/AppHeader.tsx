import { useState } from "react";
import type { RunnerStatus } from "@/lib/python/runner";
import type { ConnectionStatus } from "@/lib/collab/provider";
import type { Participant } from "@/lib/collab/useRoom";
import { buildShareUrl } from "@/lib/persistence/shareLink";

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
};

export interface AppHeaderProps {
  status: RunnerStatus;
  onRun: () => void;
  onStop: () => void;
  getCode: () => string;
  room?: { status: ConnectionStatus; roomUrl: string; participants: Participant[] } | null;
  onStartRoom?: () => void;
}

export function AppHeader({ status, onRun, onStop, getCode, room, onStartRoom }: AppHeaderProps) {
  const [shareLabel, setShareLabel] = useState<"Share" | "Copied!" | "Copy failed">("Share");
  const [collabLabel, setCollabLabel] = useState<"Collaborate" | "Copied!" | "Copy failed">(
    "Collaborate",
  );

  const handleShare = async () => {
    const url = buildShareUrl(getCode());
    try {
      await navigator.clipboard.writeText(url);
      setShareLabel("Copied!");
    } catch {
      setShareLabel("Copy failed");
    }
    window.setTimeout(() => setShareLabel("Share"), 1500);
  };

  const handleCollaborate = async () => {
    if (room) {
      try {
        await navigator.clipboard.writeText(room.roomUrl);
        setCollabLabel("Copied!");
      } catch {
        setCollabLabel("Copy failed");
      }
      window.setTimeout(() => setCollabLabel("Collaborate"), 1500);
      return;
    }
    onStartRoom?.();
  };

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
        {room && (
          <span role="status" className="font-mono text-xs text-app-muted">
            {ROOM_STATUS_LABEL[room.status]}
          </span>
        )}
        {room && room.participants.length > 0 && (
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
        {room ? (
          <button
            type="button"
            onClick={handleCollaborate}
            className="rounded border border-app-border px-3 py-1 font-mono text-xs text-app-fg"
          >
            {collabLabel}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={handleShare}
              className="rounded border border-app-border px-3 py-1 font-mono text-xs text-app-fg"
            >
              {shareLabel}
            </button>
            <button
              type="button"
              onClick={handleCollaborate}
              className="rounded border border-app-border px-3 py-1 font-mono text-xs text-app-fg"
            >
              {collabLabel}
            </button>
          </>
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
