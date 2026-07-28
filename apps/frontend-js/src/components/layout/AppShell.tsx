import { useCallback, useEffect, useRef, useState } from "react";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { AppHeader } from "@/components/layout/AppHeader";
import { Pane } from "@/components/layout/Pane";
import { OutputPane } from "@/components/output/OutputPane";
import { usePythonRunner } from "@/lib/python/usePythonRunner";
import { resolveEditorRoomId } from "@/lib/collab/room";
import { useRoom } from "@/lib/collab/useRoom";

export function AppShell() {
  const { status, output, run, stop, clearOutput } = usePythonRunner();
  const [roomId, setRoomId] = useState(() => resolveEditorRoomId());
  const codeRef = useRef("");
  const { ytext, awareness, status: roomStatus, rejectedCode, participants } = useRoom(roomId);

  // Without this, a fragment change (back/forward, or pasting a room link into
  // an open tab) never reloads the page, so the app keeps relaying into the
  // room it first joined while the URL claims a different one.
  useEffect(() => {
    const onHashChange = () => {
      const id = resolveEditorRoomId();
      setRoomId((prev) => (prev === id ? prev : id));
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const handleRun = useCallback(() => {
    clearOutput();
    run(codeRef.current);
  }, [clearOutput, run]);

  return (
    <div className="flex h-full flex-col bg-app-bg text-app-fg">
      <AppHeader
        status={status}
        onRun={handleRun}
        onStop={stop}
        room={{ status: roomStatus, rejectedCode, participants }}
      />
      <main className="flex min-h-0 flex-1 flex-col gap-px overflow-hidden bg-app-border md:flex-row">
        <Pane title="editor">
          {ytext === null ? null : (
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
