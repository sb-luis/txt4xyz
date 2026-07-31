import { useCallback, useEffect, useRef, useState } from "react";
import { CodeEditor, MAX_DOC_LENGTH } from "@/components/editor/CodeEditor";
import { AppHeader } from "@/components/layout/AppHeader";
import { StatusBar } from "@/components/layout/StatusBar";
import { Workspace } from "@/components/layout/Workspace";
import { OutputPane } from "@/components/output/OutputPane";
import { usePythonRunner } from "@/lib/python/usePythonRunner";
import { resolveEditorRoomId } from "@/lib/collab/room";
import { useRoom } from "@/lib/collab/useRoom";
import { AliasProvider, useAlias } from "@/lib/alias/AliasContext";
import { ThemeProvider } from "@/lib/theme/ThemeContext";
import { VimModeProvider } from "@/lib/vim/VimModeContext";
import { useGlobalShortcuts } from "@/lib/shortcuts/useGlobalShortcuts";
import { nextWorkspaceLayout, type WorkspaceLayout } from "@/lib/workspace/layout";

function AppShellInner() {
  const { status, output, run, stop, clearOutput } = usePythonRunner();
  const [roomId, setRoomId] = useState(() => resolveEditorRoomId());
  const [docLength, setDocLength] = useState(0);
  const [workspaceLayout, setWorkspaceLayout] = useState<WorkspaceLayout>("split");
  const codeRef = useRef("");
  const { alias } = useAlias();
  const {
    ytext,
    awareness,
    status: roomStatus,
    rejectedCode,
    participants,
    lastRunBroadcast,
    broadcastRun,
  } = useRoom(roomId, alias);
  const [flashKey, setFlashKey] = useState(0);
  const prevStatusRef = useRef(status);
  const lastSeenRunBroadcastIdRef = useRef<string | null>(null);

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

  const runLocally = useCallback(() => {
    if (status !== "ready") return false;
    clearOutput();
    run(codeRef.current);
    setWorkspaceLayout("split");
    return true;
  }, [status, clearOutput, run]);

  const handleRun = useCallback(() => {
    if (!runLocally()) return;
    broadcastRun(crypto.randomUUID());
  }, [runLocally, broadcastRun]);

  const handleStop = useCallback(() => {
    if (status !== "running") return;
    stop();
  }, [status, stop]);

  const handleCycleLayout = useCallback(() => {
    setWorkspaceLayout((prev) => nextWorkspaceLayout(prev));
  }, []);

  useGlobalShortcuts({ onRun: handleRun, onStop: handleStop, onCycleLayout: handleCycleLayout });

  // a received broadcast runs locally (never re-broadcasts)
  useEffect(() => {
    if (lastRunBroadcast === null) return;
    if (lastSeenRunBroadcastIdRef.current === lastRunBroadcast.id) return;
    lastSeenRunBroadcastIdRef.current = lastRunBroadcast.id;
    runLocally();
  }, [lastRunBroadcast, runLocally]);

  // the flash means "code is executing"
  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    prevStatusRef.current = status;
    if (prevStatus !== "running" && status === "running") {
      setFlashKey((key) => key + 1);
    }
  }, [status]);

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <AppHeader
        status={status}
        onRun={handleRun}
        onStop={handleStop}
        room={{ status: roomStatus, rejectedCode, participants }}
        workspaceLayout={workspaceLayout}
        onWorkspaceLayoutChange={setWorkspaceLayout}
      />
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background px-3 py-0">
        <Workspace
          layout={workspaceLayout}
          editor={
            ytext === null ? null : (
              <CodeEditor
                key={roomId}
                initialDoc=""
                ytext={ytext}
                awareness={awareness}
                flashKey={flashKey}
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
  );
}

export function AppShell() {
  return (
    <ThemeProvider>
      <VimModeProvider>
        <AliasProvider>
          <AppShellInner />
        </AliasProvider>
      </VimModeProvider>
    </ThemeProvider>
  );
}
