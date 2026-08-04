import { useCallback, useEffect, useRef, useState } from "react";
import type { PlaybackStep } from "./types";

export type PlaybackPhase = "idle" | "recording" | "playing" | "done";

// Fixed per-step delay for short programs; shrinks for longer ones so total
// playback never exceeds MAX_TOTAL_ANIMATION_MS.
const FIXED_STEP_MS = 120;
const MAX_TOTAL_ANIMATION_MS = 2500;

export interface UsePlaybackResult<TOutput> {
  phase: PlaybackPhase;
  currentLine: number | null;
  // 1-based, for display; null before the first step. No total shown, same as
  // the doc-size cap.
  stepNumber: number | null;
  visibleOutputs: TOutput[];
  errorRevealed: string | null;
  canStepBack: boolean;
  canStepForward: boolean;
  canReset: boolean;
  // Records first if there's no timeline yet (steps === null).
  stepForward: () => void;
  stepBack: () => void;
  // Resumes from the current position -- a "continue", not a "start over".
  // Records first if there's no timeline yet.
  play: () => void;
  // Freezes at the current position rather than resetting.
  pause: () => void;
  // Rewinds to before step 0 over the *existing* timeline -- no re-execution.
  reset: () => void;
  // Unconditionally records fresh and plays, ignoring any existing timeline.
  // Not wired to a button; used to replay an incoming collab broadcast.
  restart: () => void;
}

// `steps`/`error` are owned by the caller and passed in as `null` until a run
// finishes recording; the caller must also null them out on any code change,
// or a stale timeline could get replayed as if it still matched the code.
export function usePlayback<TOutput>(
  steps: PlaybackStep<TOutput>[] | null,
  error: string | null,
  onRequestRecording: () => void,
): UsePlaybackResult<TOutput> {
  const [phase, setPhase] = useState<PlaybackPhase>("idle");
  const [index, setIndex] = useState(-1);
  const pendingIntentRef = useRef<"play" | "step" | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  // Reset the index when steps goes back to null. Adjusted during render, not
  // in an effect: https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevSteps, setPrevSteps] = useState(steps);
  if (prevSteps !== steps) {
    setPrevSteps(steps);
    if (steps === null && index !== -1) setIndex(-1);
  }

  const lastIndex = steps === null ? -1 : steps.length - 1 + (error ? 1 : 0);

  const requestRecording = useCallback(
    (intent: "play" | "step") => {
      clearTimer();
      pendingIntentRef.current = intent;
      setPhase("recording");
      onRequestRecording();
    },
    [clearTimer, onRequestRecording],
  );

  const play = useCallback(() => {
    if (steps === null) {
      requestRecording("play");
      return;
    }
    clearTimer();
    setPhase("playing");
  }, [steps, clearTimer, requestRecording]);

  const restart = useCallback(() => {
    requestRecording("play");
  }, [requestRecording]);

  const stepForward = useCallback(() => {
    if (steps === null) {
      requestRecording("step");
      return;
    }
    clearTimer();
    setPhase("idle");
    setIndex((i) => Math.min(i + 1, lastIndex));
  }, [steps, lastIndex, clearTimer, requestRecording]);

  const stepBack = useCallback(() => {
    if (steps === null) return;
    clearTimer();
    setPhase("idle");
    setIndex((i) => Math.max(i - 1, -1));
  }, [steps, clearTimer]);

  const pause = useCallback(() => {
    clearTimer();
    pendingIntentRef.current = null;
    setPhase((prev) => (prev === "playing" ? "idle" : prev));
  }, [clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    pendingIntentRef.current = null;
    setPhase("idle");
    setIndex(-1);
  }, [clearTimer]);

  // Once a pending play()/stepForward() request's recording finishes, honor it.
  useEffect(() => {
    if (steps === null) return;
    const intent = pendingIntentRef.current;
    pendingIntentRef.current = null;
    if (intent === "play") {
      setPhase("playing");
    } else if (intent === "step") {
      setIndex(0);
      setPhase("idle");
    }
  }, [steps]);

  // Auto-advance while playing. "done" is derived below, not set here, so
  // reaching the end just stops scheduling rather than calling setPhase.
  useEffect(() => {
    if (phase !== "playing" || steps === null || index >= lastIndex) return;
    const totalSteps = steps.length + (error ? 1 : 0);
    const delay = Math.min(FIXED_STEP_MS, MAX_TOTAL_ANIMATION_MS / Math.max(totalSteps, 1));
    timerRef.current = setTimeout(() => setIndex((i) => i + 1), delay);
    return clearTimer;
  }, [phase, index, steps, error, lastIndex, clearTimer]);

  const reachedEnd = steps !== null && index >= lastIndex && lastIndex >= 0;
  const derivedPhase: PlaybackPhase = reachedEnd && phase !== "recording" ? "done" : phase;

  const currentLine = steps !== null && index >= 0 && index < steps.length ? steps[index].line : null;
  const stepNumber = index >= 0 ? index + 1 : null;

  const visibleOutputs =
    steps === null ? [] : steps.slice(0, Math.min(index, steps.length - 1) + 1).flatMap((s) => s.outputs);

  const errorRevealed = steps !== null && error !== null && index >= steps.length ? error : null;

  const busy = derivedPhase === "recording" || derivedPhase === "playing";
  const canStepBack = !busy && steps !== null && index > -1;
  const canStepForward = !busy && !reachedEnd;
  const canReset = derivedPhase === "recording" || (steps !== null && index > -1);

  return {
    phase: derivedPhase,
    currentLine,
    stepNumber,
    visibleOutputs,
    errorRevealed,
    canStepBack,
    canStepForward,
    canReset,
    stepForward,
    stepBack,
    play,
    pause,
    reset,
    restart,
  };
}
