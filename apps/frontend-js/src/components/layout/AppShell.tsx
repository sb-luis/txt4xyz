import { useCallback, useEffect, useRef, useState } from "react";
import { CodeEditor, MAX_DOC_LENGTH, type CodeEditorHandle } from "@/components/editor/CodeEditor";
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
import { formatPython } from "@/lib/format/ruffFormatter";
import { useFormatterStatus } from "@/lib/format/useFormatterStatus";
import { nextWorkspaceLayout, type WorkspaceLayout } from "@/lib/workspace/layout";

function AppShellInner() {
  const { status, output, run, stop, clearOutput, fetchDataframePage } = usePythonRunner();
  const formatterStatus = useFormatterStatus();
  const [roomId, setRoomId] = useState(() => resolveEditorRoomId());
  const [docLength, setDocLength] = useState(0);
  const [workspaceLayout, setWorkspaceLayout] = useState<WorkspaceLayout>("split");
  const codeRef = useRef("");
  const editorRef = useRef<CodeEditorHandle>(null);
  const [formatError, setFormatError] = useState<string | null>(null);
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

  const handleFormat = useCallback(async () => {
    if (formatterStatus !== "ready") return;
    const snapshot = codeRef.current;
    setFormatError(null);
    try {
      const formatted = await formatPython(snapshot);
      // Bail if the doc changed while formatting was in flight, so we don't
      // clobber an edit (local or remote) that landed during the await.
      if (codeRef.current !== snapshot || formatted === snapshot) return;
      editorRef.current?.replaceContent(formatted);
    } catch (error) {
      setFormatError(error instanceof Error ? error.message : String(error));
    }
  }, [formatterStatus]);

  useGlobalShortcuts({
    onRun: handleRun,
    onStop: handleStop,
    onCycleLayout: handleCycleLayout,
    onFormat: handleFormat,
  });

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
        onFormat={handleFormat}
        formatterStatus={formatterStatus}
        room={{ status: roomStatus, rejectedCode, participants }}
        workspaceLayout={workspaceLayout}
        onWorkspaceLayoutChange={setWorkspaceLayout}
      />
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background px-3 py-0">
        <Workspace
          layout={workspaceLayout}
          onLayoutChange={setWorkspaceLayout}
          formatError={formatError}
          editor={
            ytext === null ? null : (
              <CodeEditor
                key={roomId}
                ref={editorRef}
                initialDoc=""
                ytext={ytext}
                awareness={awareness}
                flashKey={flashKey}
                onChange={(doc) => {
                  codeRef.current = doc;
                  setDocLength(doc.length);
                  setFormatError(null);
                }}
              />
            )
          }
          output={
            <OutputPane status={status} output={output} fetchDataframePage={fetchDataframePage} />
          }
        />
      </main>
      <StatusBar
        runtimeStatus={status}
        formatterStatus={formatterStatus}
        docLength={docLength}
        maxDocLength={MAX_DOC_LENGTH}
      />
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
