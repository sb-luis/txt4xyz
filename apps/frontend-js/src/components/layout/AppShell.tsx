import { useCallback, useEffect, useRef, useState } from "react";
import { CodeEditor, type CodeEditorHandle } from "@/components/editor/CodeEditor";
import { AppHeader } from "@/components/layout/AppHeader";
import { PlaybackControls } from "@/components/layout/PlaybackControls";
import { StatusBar } from "@/components/layout/StatusBar";
import { Workspace } from "@/components/layout/Workspace";
import { OutputPane } from "@/components/output/OutputPane";
import { useLangPyRunner, timelineToPlaybackSteps, formatLangPy, useFormatterStatus } from "@txt4/lang-py";
import type { OutputEntry } from "@txt4/lang-py";
import { usePlayback } from "@txt4/core";
import type { PlaybackStep } from "@txt4/core";
import { useRoom, resolveEditorRoomId, createLocalDocStore } from "@txt4/collab";
import { AliasProvider, useAlias } from "@/components/settings/AliasContext";
import { ThemeProvider } from "@/components/settings/ThemeContext";
import { VimModeProvider } from "@/components/settings/VimModeContext";
import { useGlobalShortcuts } from "@/lib/shortcuts/useGlobalShortcuts";
import { nextWorkspaceLayout, type WorkspaceLayout } from "@/lib/workspace/layout";
import { createDebouncedOfflineDocWriter, readOfflineDoc } from "@/lib/persistence/localStore";
import { byteLength } from "@/lib/utils";

export type AppShellMode = "collab" | "offline";

function AppShellInner({ mode }: { mode: AppShellMode }) {
  const [timelineSteps, setTimelineSteps] = useState<PlaybackStep<OutputEntry>[] | null>(null);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const { status, runTraced, stop, fetchDataframePage } = useLangPyRunner({
    onTimeline: (steps) => setTimelineSteps(timelineToPlaybackSteps(steps)),
    onTracedError: (traceback) => setTimelineError(traceback),
  });
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

  const [flashKey, setFlashKey] = useState(0);
  const prevStatusRef = useRef(status);
  const lastSeenRunBroadcastIdRef = useRef<string | null>(null);
  // Set right before replaying an incoming broadcast, so it doesn't itself
  // broadcast and ping-pong back and forth between tabs.
  const suppressBroadcastRef = useRef(false);

  const onRequestRecording = useCallback(() => {
    setTimelineSteps(null);
    setTimelineError(null);
    runTraced(codeRef.current);
    setWorkspaceLayout("split");
    if (suppressBroadcastRef.current) {
      suppressBroadcastRef.current = false;
    } else {
      broadcastRun(crypto.randomUUID());
    }
  }, [runTraced, broadcastRun]);

  const playback = usePlayback<OutputEntry>(timelineSteps, timelineError, onRequestRecording);

  // Any doc edit, local or a collaborator's, makes the recording stale.
  const invalidateTimeline = useCallback(() => {
    setTimelineSteps((prev) => (prev === null ? prev : null));
    setTimelineError((prev) => (prev === null ? prev : null));
  }, []);

  const handleDocChange = useCallback(
    (doc: string) => {
      codeRef.current = doc;
      setDocBytes(byteLength(doc));
      setFormatError(null);
      invalidateTimeline();
      offlineWriterRef.current?.schedule(doc);
    },
    [invalidateTimeline],
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
    if (playback.phase === "playing") {
      playback.pause();
    } else {
      playback.play();
    }
  }, [playback]);

  const handleRun = useCallback(() => {
    playback.restart();
  }, [playback]);

  const handleReset = useCallback(() => {
    // A recording that's still in flight has no other way to be aborted --
    // the same hard worker-terminate the old Stop control used.
    if (playback.phase === "recording" && status === "running") stop();
    playback.reset();
  }, [playback, status, stop]);

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
    onStop: handleReset,
    onCycleLayout: handleCycleLayout,
    onFormat: handleFormat,
  });

  // A received broadcast always replays fresh, regardless of this client's
  // own playback state, and never re-broadcasts.
  useEffect(() => {
    if (lastRunBroadcast === null) return;
    if (lastSeenRunBroadcastIdRef.current === lastRunBroadcast.id) return;
    lastSeenRunBroadcastIdRef.current = lastRunBroadcast.id;
    suppressBroadcastRef.current = true;
    playback.restart();
  }, [lastRunBroadcast, playback]);

  // the flash means "code is executing"
  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    prevStatusRef.current = status;
    if (prevStatus !== "running" && status === "running") {
      setFlashKey((key) => key + 1);
    }
  }, [status]);

  // Playback may still be animating after the worker itself reports "ready".
  const isPlaybackBusy = playback.phase === "recording" || playback.phase === "playing";
  const displayStatus = isPlaybackBusy && status === "ready" ? "running" : status;
  const visibleOutput: OutputEntry[] = playback.errorRevealed
    ? [...playback.visibleOutputs, { kind: "traceback", text: playback.errorRevealed }]
    : playback.visibleOutputs;

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
            <PlaybackControls
              phase={playback.phase}
              canStepBack={playback.canStepBack}
              canStepForward={playback.canStepForward}
              canReset={playback.canReset}
              onStepBack={playback.stepBack}
              onStepForward={playback.stepForward}
              onPlayPause={handlePlayPause}
              onReset={handleReset}
            />
          }
          editor={
            mode === "offline" ? (
              <CodeEditor
                key="offline"
                ref={editorRef}
                initialDoc={initialOfflineDoc}
                flashKey={flashKey}
                currentLine={playback.currentLine}
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
                currentLine={playback.currentLine}
                onChange={handleDocChange}
              />
            )
          }
          output={
            <OutputPane status={displayStatus} output={visibleOutput} fetchDataframePage={fetchDataframePage} />
          }
        />
      </main>
      <StatusBar
        runtimeStatus={displayStatus}
        formatterStatus={formatterStatus}
        docBytes={docBytes}
        stepNumber={playback.stepNumber}
      />
    </div>
  );
}

export function AppShell({ mode = "collab" }: { mode?: AppShellMode } = {}) {
  return (
    <ThemeProvider>
      <VimModeProvider>
        <AliasProvider>
          <AppShellInner mode={mode} />
        </AliasProvider>
      </VimModeProvider>
    </ThemeProvider>
  );
}
