import { useCallback, useEffect, useRef, useState } from "react";
import { CodeEditor, type CodeEditorHandle } from "@/components/editor/CodeEditor";
import { AppHeader } from "@/components/layout/AppHeader";
import { ControlBar } from "@/components/layout/ControlBar";
import { PlaybackControls } from "@/components/layout/PlaybackControls";
import { RunControls } from "@/components/layout/RunControls";
import { StatusBar } from "@/components/layout/StatusBar";
import { Workspace } from "@/components/layout/Workspace";
import { OutputPane } from "@/components/output/OutputPane";
import { formatLangPy, useFormatterStatus } from "@txt4/lang-py";
import { useRoom, resolveEditorRoomId, createLocalDocStore } from "@txt4/collab";
import { AliasProvider, useAlias } from "@/components/settings/AliasContext";
import { ThemeProvider } from "@/components/settings/ThemeContext";
import { VimModeProvider } from "@/components/settings/VimModeContext";
import { ExecutionModeProvider } from "@/components/settings/ExecutionModeContext";
import { useExecutionSession } from "@/lib/execution/useExecutionSession";
import { useGlobalShortcuts } from "@/lib/shortcuts/useGlobalShortcuts";
import { nextWorkspaceLayout, type WorkspaceLayout } from "@/lib/workspace/layout";
import { createDebouncedOfflineDocWriter, readOfflineDoc } from "@/lib/persistence/localStore";
import { byteLength } from "@/lib/utils";

export type AppShellMode = "collab" | "offline";

function AppShellInner({ mode }: { mode: AppShellMode }) {
  const formatterStatus = useFormatterStatus();
  const [roomId, setRoomId] = useState(() => (mode === "collab" ? resolveEditorRoomId() : null));
  const [initialOfflineDoc] = useState(() => (mode === "offline" ? (readOfflineDoc() ?? "") : ""));
  const offlineWriterRef = useRef(mode === "offline" ? createDebouncedOfflineDocWriter() : null);
  const [docBytes, setDocBytes] = useState(() => byteLength(initialOfflineDoc));
  const [workspaceLayout, setWorkspaceLayout] = useState<WorkspaceLayout>("split");
  const codeRef = useRef(initialOfflineDoc);
  const editorRef = useRef<CodeEditorHandle>(null);
  const [formatError, setFormatError] = useState<string | null>(null);
  const { alias } = useAlias();
  const [docStore] = useState(() => createLocalDocStore());
  const {
    ytext,
    awareness,
    status: roomStatus,
    rejectedCode,
    participants,
    lastRunBroadcast,
    broadcastRun,
  } = useRoom({ roomId, alias, store: docStore });

  // Bumped whenever useRoom mints a new Y.Doc (room change or reconnect), so
  // the editor below remounts instead of staying bound to a destroyed ytext.
  const [{ ytext: seenYtext, generation: docGeneration }, setDocGeneration] = useState(() => ({
    ytext,
    generation: 0,
  }));
  if (ytext !== seenYtext) {
    setDocGeneration({ ytext, generation: docGeneration + 1 });
  }

  const session = useExecutionSession(codeRef, broadcastRun);

  const [flashKey, setFlashKey] = useState(0);
  const prevStatusRef = useRef(session.status);
  const lastSeenRunBroadcastIdRef = useRef<string | null>(null);

  const handleDocChange = useCallback(
    (doc: string) => {
      codeRef.current = doc;
      setDocBytes(byteLength(doc));
      setFormatError(null);
      session.invalidate();
      offlineWriterRef.current?.schedule(doc);
    },
    [session],
  );

  // Without this, a fragment change (back/forward, or pasting a room link into
  // an open tab) never reloads the page, so the app keeps relaying into the
  // room it first joined while the URL claims a different one. Offline mode
  // has no room to resync against.
  useEffect(() => {
    if (mode !== "collab") return;
    const onHashChange = () => {
      const id = resolveEditorRoomId();
      setRoomId((prev) => (prev === id ? prev : id));
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [mode]);

  useEffect(() => {
    const writer = offlineWriterRef.current;
    return () => writer?.cancel();
  }, []);

  const handlePlayPause = useCallback(() => {
    const transport = session.transport;
    if (!transport) return;
    if (transport.phase === "playing") {
      transport.pause();
    } else {
      transport.play();
    }
  }, [session]);

  const handleRun = useCallback(() => {
    session.run();
  }, [session]);

  const handleCycleLayout = useCallback(() => {
    setWorkspaceLayout((prev) => nextWorkspaceLayout(prev));
  }, []);

  const handleFormat = useCallback(async () => {
    if (formatterStatus !== "ready") return;
    const snapshot = codeRef.current;
    setFormatError(null);
    try {
      const formatted = await formatLangPy(snapshot);
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
    onStop: session.stop,
    onCycleLayout: handleCycleLayout,
    onFormat: handleFormat,
  });

  // A received broadcast always replays fresh, regardless of this client's
  // own playback state, and never re-broadcasts.
  useEffect(() => {
    if (lastRunBroadcast === null) return;
    if (lastSeenRunBroadcastIdRef.current === lastRunBroadcast.id) return;
    lastSeenRunBroadcastIdRef.current = lastRunBroadcast.id;
    session.run({ broadcast: false });
  }, [lastRunBroadcast, session]);

  // the flash means "code is executing"; a run starting is also the moment
  // the split view should reveal output, so both mode's runs land here.
  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    prevStatusRef.current = session.status;
    if (prevStatus !== "running" && session.status === "running") {
      setFlashKey((key) => key + 1);
      setWorkspaceLayout("split");
    }
  }, [session.status]);

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <AppHeader
        onFormat={handleFormat}
        formatterStatus={formatterStatus}
        room={mode === "offline" ? undefined : { status: roomStatus, rejectedCode, participants }}
        workspaceLayout={workspaceLayout}
        onWorkspaceLayoutChange={setWorkspaceLayout}
      />
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background px-3 py-0">
        <Workspace
          layout={workspaceLayout}
          onLayoutChange={setWorkspaceLayout}
          formatError={formatError}
          controls={
            <ControlBar mode={session.mode} onModeChange={session.setMode}>
              {session.transport ? (
                <PlaybackControls
                  phase={session.transport.phase}
                  canStepBack={session.transport.canStepBack}
                  canStepForward={session.transport.canStepForward}
                  canReset={session.transport.canReset}
                  onStepBack={session.transport.stepBack}
                  onStepForward={session.transport.stepForward}
                  onPlayPause={handlePlayPause}
                  onReset={session.transport.reset}
                />
              ) : (
                <RunControls status={session.status} onRun={handleRun} onStop={session.stop} />
              )}
            </ControlBar>
          }
          editor={
            mode === "offline" ? (
              <CodeEditor
                key="offline"
                ref={editorRef}
                initialDoc={initialOfflineDoc}
                flashKey={flashKey}
                currentLine={session.currentLine}
                onChange={handleDocChange}
              />
            ) : ytext === null ? null : (
              <CodeEditor
                key={docGeneration}
                ref={editorRef}
                initialDoc=""
                ytext={ytext}
                awareness={awareness}
                flashKey={flashKey}
                currentLine={session.currentLine}
                onChange={handleDocChange}
              />
            )
          }
          output={
            <OutputPane status={session.status} output={session.output} fetchDataframePage={session.fetchDataframePage} />
          }
        />
      </main>
      <StatusBar
        runtimeStatus={session.status}
        formatterStatus={formatterStatus}
        docBytes={docBytes}
        stepNumber={session.stepNumber}
      />
    </div>
  );
}

export function AppShell({ mode = "collab" }: { mode?: AppShellMode } = {}) {
  return (
    <ThemeProvider>
      <VimModeProvider>
        <ExecutionModeProvider>
          <AliasProvider>
            <AppShellInner mode={mode} />
          </AliasProvider>
        </ExecutionModeProvider>
      </VimModeProvider>
    </ThemeProvider>
  );
}
