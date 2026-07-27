import { useCallback, useEffect, useRef, useState } from "react";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { AppHeader } from "@/components/layout/AppHeader";
import { Pane } from "@/components/layout/Pane";
import { OutputPane } from "@/components/output/OutputPane";
import { usePythonRunner } from "@/lib/python/usePythonRunner";
import { createDebouncedDocWriter } from "@/lib/persistence/localStore";
import { resolveDocSession } from "@/lib/persistence/docSession";
import { generateRoomId, readRoomIdFromLocation, roomUrl } from "@/lib/collab/room";
import { useRoom } from "@/lib/collab/useRoom";

interface Room {
  id: string;
  seed: string | null;
}

const DEFAULT_CODE = `for i in range(5):
    print(f"hello from txt4.xyz, iteration {i}")
`;

export function AppShell() {
  const { status, output, run, stop, clearOutput } = usePythonRunner();
  const [room, setRoom] = useState<Room | null>(() => {
    const id = readRoomIdFromLocation();
    return id === null ? null : { id, seed: null };
  });
  const roomId = room?.id ?? null;
  const [session] = useState(() => (roomId === null ? resolveDocSession(DEFAULT_CODE) : null));
  const codeRef = useRef(session?.doc ?? "");
  const [writer] = useState(() =>
    session === null ? null : createDebouncedDocWriter(session.key),
  );
  const {
    ytext,
    awareness,
    status: roomStatus,
    participants,
  } = useRoom(roomId, room?.seed ?? null);

  useEffect(() => {
    return () => writer?.cancel();
  }, [writer]);

  // Without this, a fragment change (back/forward, or pasting a room link into
  // an open tab) never reloads the page, so the app keeps relaying into the
  // room it first joined while the URL claims a different one.
  useEffect(() => {
    const onHashChange = () => {
      const id = readRoomIdFromLocation();
      setRoom((prev) => {
        if (prev?.id === id) return prev;
        return id === null ? null : { id, seed: null };
      });
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const handleRun = useCallback(() => {
    clearOutput();
    run(codeRef.current);
  }, [clearOutput, run]);

  const handleStartRoom = useCallback(() => {
    const id = generateRoomId();
    window.location.hash = `room=${id}`;
    setRoom({ id, seed: codeRef.current });
    void navigator.clipboard.writeText(roomUrl(id)).catch(() => {});
  }, []);

  return (
    <div className="flex h-full flex-col bg-app-bg text-app-fg">
      <AppHeader
        status={status}
        onRun={handleRun}
        onStop={stop}
        getCode={() => codeRef.current}
        room={
          roomId === null
            ? null
            : { status: roomStatus, roomUrl: roomUrl(roomId), participants }
        }
        onStartRoom={handleStartRoom}
      />
      <main className="flex min-h-0 flex-1 flex-col gap-px overflow-hidden bg-app-border md:flex-row">
        <Pane title="editor">
          {roomId === null ? (
            <CodeEditor
              initialDoc={session!.doc}
              onChange={(doc) => {
                codeRef.current = doc;
                writer?.schedule(doc);
              }}
            />
          ) : ytext === null ? null : (
            <CodeEditor
              key={roomId}
              initialDoc=""
              ytext={ytext}
              awareness={awareness}
              onChange={(doc) => {
                codeRef.current = doc;
              }}
            />
          )}
        </Pane>
        <Pane title="output">
          <OutputPane status={status} output={output} />
        </Pane>
      </main>
    </div>
  );
}
