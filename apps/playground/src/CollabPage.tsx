import { useMemo, useState } from "react";
import { Txt4Editor } from "@txt4/core";
import {
  useRoom,
  collabExtension,
  resolveEditorRoomId,
  createLocalDocStore,
  CLOSE_ROOM_FULL,
  CLOSE_AT_CAPACITY,
  CLOSE_INVALID_ROOM_ID,
} from "@txt4/collab";
import { navigate } from "./router";

function rejectedLabel(code: number | null): string | null {
  if (code === null) return null;
  if (code === CLOSE_ROOM_FULL) return "room full";
  if (code === CLOSE_AT_CAPACITY) return "server at capacity";
  if (code === CLOSE_INVALID_ROOM_ID) return "invalid room id";
  return `rejected (code ${code})`;
}

function CollabPane({ roomId, label, prefix }: { roomId: string; label: string; prefix: string }) {
  const [connected, setConnected] = useState(true);
  const [alias, setAlias] = useState("");

  const { ytext, awareness, status, rejectedCode, participants, lastRunBroadcast, broadcastRun } = useRoom({
    roomId: connected ? roomId : null,
    alias: alias === "" ? null : alias,
    store: createLocalDocStore({ prefix }),
  });

  // Bumped whenever useRoom mints a new Y.Doc (room change or reconnect), so
  // the editor below remounts instead of staying bound to a destroyed ytext.
  const [{ ytext: seenYtext, generation: docGeneration }, setDocGeneration] = useState(() => ({
    ytext,
    generation: 0,
  }));
  if (ytext !== seenYtext) {
    setDocGeneration({ ytext, generation: docGeneration + 1 });
  }

  const extensions = useMemo(() => (ytext ? [collabExtension(ytext, awareness)] : []), [ytext, awareness]);

  const label_ = rejectedLabel(rejectedCode);

  return (
    <div className="flex min-h-0 flex-1 flex-col border border-slate-800 bg-slate-900">
      <div className="flex flex-col gap-2 border-b border-slate-800 p-3">
        <h2 className="text-sm font-semibold text-slate-100">Pane {label}</h2>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={connected}
              onChange={(e) => setConnected(e.target.checked)}
              className="accent-sky-500"
            />
            connected
          </label>
          <label className="flex items-center gap-1.5">
            alias
            <input
              type="text"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="(auto)"
              className="w-32 rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-slate-100"
            />
          </label>
          <button
            onClick={() => broadcastRun(`${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)}
            disabled={ytext === null}
            className="rounded border border-sky-700 bg-sky-600 px-2 py-1 text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900 disabled:text-slate-600"
          >
            run
          </button>
        </div>
        <div className="text-xs text-slate-400">
          status: <span className="text-slate-200">{status}</span>
          {label_ && <span className="ml-2 text-amber-400">({label_})</span>}
        </div>
        <div className="text-xs text-slate-400">
          participants:{" "}
          {participants.length === 0 ? (
            <span className="text-slate-600">none</span>
          ) : (
            participants.map((p, i) => {
              const state = awareness?.getStates().get(p.clientId) as { user?: { color?: unknown } } | undefined;
              const color = typeof state?.user?.color === "string" ? state.user.color : undefined;
              return (
                <span key={p.clientId} style={color ? { color } : undefined} className="mr-2">
                  {p.name}
                  {i < participants.length - 1 ? "," : ""}
                </span>
              );
            })
          )}
        </div>
        <div className="text-xs text-slate-400">
          last run:{" "}
          {lastRunBroadcast ? (
            <span className="text-slate-200">
              {lastRunBroadcast.id} (by {lastRunBroadcast.requestedBy})
            </span>
          ) : (
            <span className="text-slate-600">none</span>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden font-mono text-sm">
        {ytext && (
          <Txt4Editor key={docGeneration} initialDoc="" onChange={() => {}} extensions={extensions} />
        )}
      </div>
    </div>
  );
}

export function CollabPage() {
  const [roomId] = useState(() => resolveEditorRoomId());

  return (
    <div className="flex h-screen min-h-0 flex-col bg-slate-950 text-slate-100">
      <header className="flex items-center gap-3 border-b border-slate-800 bg-slate-900 px-4 py-2">
        <a
          href="/"
          onClick={(e) => {
            if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
            e.preventDefault();
            navigate("/");
          }}
          className="text-sm text-slate-400 hover:text-slate-200"
        >
          ← playground
        </a>
        <h1 className="text-sm font-semibold text-slate-100">collab</h1>
        <span className="text-xs text-slate-500">room: {roomId}</span>
      </header>
      <div className="flex min-h-0 flex-1 gap-3 p-3">
        <CollabPane roomId={roomId} label="A" prefix="playground:collab:a:" />
        <CollabPane roomId={roomId} label="B" prefix="playground:collab:b:" />
      </div>
    </div>
  );
}
