import { useCallback, useEffect, useRef, useState } from "react";
import { CodeEditor, MAX_DOC_LENGTH } from "@/components/editor/CodeEditor";
import { AppHeader } from "@/components/layout/AppHeader";
import { StatusBar } from "@/components/layout/StatusBar";
import { Workspace } from "@/components/layout/Workspace";
import { OutputPane } from "@/components/output/OutputPane";
import { usePythonRunner } from "@/lib/python/usePythonRunner";
import { resolveEditorRoomId } from "@/lib/collab/room";
import { useRoom } from "@/lib/collab/useRoom";
import { ThemeProvider } from "@/lib/theme/ThemeContext";
import { useGlobalShortcuts } from "@/lib/shortcuts/useGlobalShortcuts";

export function AppShell() {
  const { status, output, run, stop, clearOutput } = usePythonRunner();
  const [roomId, setRoomId] = useState(() => resolveEditorRoomId());
  const [docLength, setDocLength] = useState(0);
  const [outputCollapsed, setOutputCollapsed] = useState(false);
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
    if (status !== "ready") return;
    clearOutput();
    run(codeRef.current);
    setOutputCollapsed(false);
  }, [status, clearOutput, run]);

  const handleStop = useCallback(() => {
    if (status !== "running") return;
    stop();
  }, [status, stop]);

  const handleToggleOutput = useCallback(() => {
    setOutputCollapsed((prev) => !prev);
  }, []);

  useGlobalShortcuts({ onRun: handleRun, onStop: handleStop, onToggleOutput: handleToggleOutput });

  return (
    <ThemeProvider>
      <div className="flex h-full flex-col bg-app-bg text-app-fg">
        <AppHeader
          status={status}
          onRun={handleRun}
          onStop={handleStop}
          room={{ status: roomStatus, rejectedCode, participants }}
        />
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-app-bg px-3 py-0">
          <Workspace
            outputCollapsed={outputCollapsed}
            onToggleOutput={handleToggleOutput}
            editor={
              ytext === null ? null : (
                <CodeEditor
                  key={roomId}
                  initialDoc=""
                  ytext={ytext}
                  awareness={awareness}
                  onChange={(doc) => {
                    codeRef.current = doc;
                    setDocLength(doc.length);
                  }}
                />
              )
            }
            output={<OutputPane status={status} output={output} />}
          />
        </main>
        <StatusBar runtimeStatus={status} docLength={docLength} maxDocLength={MAX_DOC_LENGTH} />
      </div>
    </ThemeProvider>
  );
}
