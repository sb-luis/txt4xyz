import { useCallback, useMemo, useRef, useState, type RefObject } from "react";
import { usePlayback } from "@txt4/core";
import type { ExecutionMode, PlaybackPhase, PlaybackStep } from "@txt4/core";
import { useLangPyRunner, timelineToPlaybackSteps } from "@txt4/lang-py";
import type { DataframePage, DataframeSort, OutputEntry, RunnerStatus } from "@txt4/lang-py";
import { useExecutionMode } from "@/components/settings/ExecutionModeContext";

export interface PlaybackTransport {
  phase: PlaybackPhase;
  canStepBack: boolean;
  canStepForward: boolean;
  canReset: boolean;
  stepBack: () => void;
  stepForward: () => void;
  play: () => void;
  pause: () => void;
  reset: () => void;
}

export interface ExecutionSession {
  status: RunnerStatus;
  output: OutputEntry[];
  currentLine: number | null;
  stepNumber: number | null;
  transport: PlaybackTransport | null;
  mode: ExecutionMode;
  setMode: (mode: ExecutionMode) => void;
  run: (opts?: { broadcast?: boolean }) => void;
  stop: () => void;
  invalidate: () => void;
  fetchDataframePage: (
    handle: string,
    offset: number,
    limit: number,
    sort: DataframeSort | null,
  ) => Promise<DataframePage>;
}

export function useExecutionSession(
  codeRef: RefObject<string>,
  broadcastRun: (runId: string) => void,
): ExecutionSession {
  const { mode, setMode: persistMode } = useExecutionMode();
  const [timelineSteps, setTimelineSteps] = useState<PlaybackStep<OutputEntry>[] | null>(null);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [frozenOutput, setFrozenOutput] = useState<OutputEntry[] | null>(null);

  // Set right before replaying an incoming broadcast (or the debug re-record
  // triggered by a mode switch would otherwise never see it), and cleared the
  // moment a run of either mode actually starts. That single read/clear point
  // -- maybeBroadcast below -- is what keeps this flag from getting stuck
  // `true` and silently swallowing the *next* local run's broadcast.
  const suppressBroadcastRef = useRef(false);

  const maybeBroadcast = useCallback(() => {
    if (suppressBroadcastRef.current) {
      suppressBroadcastRef.current = false;
      return;
    }
    broadcastRun(crypto.randomUUID());
  }, [broadcastRun]);

  const {
    status,
    output: runOutput,
    run: runPlain,
    runTraced,
    stop: stopRunner,
    clearOutput,
    fetchDataframePage,
  } = useLangPyRunner({
    onTimeline: (steps) => setTimelineSteps(timelineToPlaybackSteps(steps)),
    onTracedError: (traceback) => setTimelineError(traceback),
  });

  const startDebugRun = useCallback(() => {
    setFrozenOutput(null);
    setTimelineSteps(null);
    setTimelineError(null);
    runTraced(codeRef.current);
    maybeBroadcast();
  }, [runTraced, maybeBroadcast, codeRef]);

  const playback = usePlayback<OutputEntry>(timelineSteps, timelineError, startDebugRun);

  const startRunModeRun = useCallback(() => {
    setFrozenOutput(null);
    clearOutput();
    runPlain(codeRef.current);
    maybeBroadcast();
  }, [runPlain, clearOutput, maybeBroadcast, codeRef]);

  const run = useCallback(
    (opts?: { broadcast?: boolean }) => {
      if (opts?.broadcast === false) {
        suppressBroadcastRef.current = true;
      }
      if (mode === "debug") {
        playback.restart();
      } else {
        startRunModeRun();
      }
    },
    [mode, playback, startRunModeRun],
  );

  const stop = useCallback(() => {
    if (status === "running") stopRunner();
    if (mode === "debug") playback.reset();
  }, [status, stopRunner, mode, playback]);

  const debugOutput: OutputEntry[] = useMemo(
    () =>
      playback.errorRevealed
        ? [...playback.visibleOutputs, { kind: "traceback" as const, text: playback.errorRevealed }]
        : playback.visibleOutputs,
    [playback.errorRevealed, playback.visibleOutputs],
  );

  const setMode = useCallback(
    (next: ExecutionMode) => {
      if (next === mode) return;
      const snapshot = mode === "debug" ? debugOutput : runOutput;
      if (status === "running") stopRunner();
      setTimelineSteps(null);
      setTimelineError(null);
      // Switching mode never executes. It clears the recording and leaves the
      // last output frozen on screen; the next explicit Run replaces both.
      playback.reset();
      setFrozenOutput(snapshot);
      persistMode(next);
    },
    [mode, debugOutput, runOutput, status, stopRunner, playback, persistMode],
  );

  const isPlaybackBusy = playback.phase === "recording" || playback.phase === "playing";
  const displayStatus = isPlaybackBusy && status === "ready" ? "running" : status;

  const output = frozenOutput ?? (mode === "debug" ? debugOutput : runOutput);
  const currentLine = mode === "debug" ? playback.currentLine : null;
  const stepNumber = mode === "debug" ? playback.stepNumber : null;

  const transport: PlaybackTransport | null = useMemo(
    () =>
      mode === "debug"
        ? {
            phase: playback.phase,
            canStepBack: playback.canStepBack,
            canStepForward: playback.canStepForward,
            canReset: playback.canReset,
            stepBack: playback.stepBack,
            stepForward: playback.stepForward,
            play: playback.play,
            pause: playback.pause,
            reset: stop,
          }
        : null,
    [mode, playback, stop],
  );

  const invalidate = useCallback(() => {
    setTimelineSteps((prev) => (prev === null ? prev : null));
    setTimelineError((prev) => (prev === null ? prev : null));
  }, []);

  // Memoized so consumers can safely key effects on the session itself; an
  // object rebuilt every render would fire them on every render.
  return useMemo(
    () => ({
      status: displayStatus,
      output,
      currentLine,
      stepNumber,
      transport,
      mode,
      setMode,
      run,
      stop,
      invalidate,
      fetchDataframePage,
    }),
    [
      displayStatus,
      output,
      currentLine,
      stepNumber,
      transport,
      mode,
      setMode,
      run,
      stop,
      invalidate,
      fetchDataframePage,
    ],
  );
}
