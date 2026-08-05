import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePlayback } from "./usePlayback";
import type { PlaybackStep } from "./types";

const STEPS: PlaybackStep<string>[] = [
  { line: 1, outputs: ["a"] },
  { line: 2, outputs: [] },
  { line: 3, outputs: ["b", "c"] },
];

describe("usePlayback", () => {
  it("requests recording on the first stepForward() when no timeline exists, then reveals step 0 once it arrives", () => {
    const onRequestRecording = vi.fn();
    const { result, rerender } = renderHook(
      ({ steps }: { steps: PlaybackStep<string>[] | null }) =>
        usePlayback(steps, null, onRequestRecording),
      { initialProps: { steps: null as PlaybackStep<string>[] | null } },
    );

    act(() => result.current.stepForward());
    expect(onRequestRecording).toHaveBeenCalledTimes(1);
    expect(result.current.phase).toBe("recording");
    expect(result.current.currentLine).toBeNull();

    rerender({ steps: STEPS });
    expect(result.current.phase).toBe("idle");
    expect(result.current.currentLine).toBe(1);
    expect(result.current.visibleOutputs).toEqual(["a"]);
  });

  it("exposes a 1-based stepNumber alongside currentLine, null before the first step", () => {
    const { result } = renderHook(() => usePlayback(STEPS, null, vi.fn()));
    expect(result.current.stepNumber).toBeNull();

    act(() => result.current.stepForward());
    expect(result.current.stepNumber).toBe(1);

    act(() => result.current.stepForward());
    expect(result.current.stepNumber).toBe(2);

    act(() => result.current.reset());
    expect(result.current.stepNumber).toBeNull();
  });

  it("advances exactly one step per stepForward() call and marks done on the last one", () => {
    const { result } = renderHook(() => usePlayback(STEPS, null, vi.fn()));

    act(() => result.current.stepForward());
    expect(result.current.currentLine).toBe(1);

    act(() => result.current.stepForward());
    expect(result.current.currentLine).toBe(2);
    expect(result.current.visibleOutputs).toEqual(["a"]);

    act(() => result.current.stepForward());
    expect(result.current.currentLine).toBe(3);
    expect(result.current.visibleOutputs).toEqual(["a", "b", "c"]);
    expect(result.current.phase).toBe("done");

    // Further forward steps are no-ops past the end.
    act(() => result.current.stepForward());
    expect(result.current.currentLine).toBe(3);
  });

  it("stepBack() rewinds one step at a time without re-recording, all the way past the start", () => {
    const onRequestRecording = vi.fn();
    const { result } = renderHook(() => usePlayback(STEPS, null, onRequestRecording));

    act(() => result.current.stepForward());
    act(() => result.current.stepForward());
    expect(result.current.currentLine).toBe(2);

    act(() => result.current.stepBack());
    expect(result.current.currentLine).toBe(1);

    act(() => result.current.stepBack());
    expect(result.current.currentLine).toBeNull();

    // Already at the very start -- stepping back further is a no-op.
    act(() => result.current.stepBack());
    expect(result.current.currentLine).toBeNull();
    expect(onRequestRecording).not.toHaveBeenCalled();
  });

  it("pause() freezes at the current position rather than resetting", () => {
    const { result } = renderHook(() => usePlayback(STEPS, null, vi.fn()));

    act(() => result.current.stepForward());
    act(() => result.current.stepForward());
    expect(result.current.currentLine).toBe(2);

    act(() => result.current.pause());
    expect(result.current.currentLine).toBe(2);
    expect(result.current.phase).toBe("idle");
  });

  it("reset() rewinds to before step 0 over the existing timeline, without re-recording", () => {
    const onRequestRecording = vi.fn();
    const { result } = renderHook(() => usePlayback(STEPS, null, onRequestRecording));

    act(() => result.current.stepForward());
    act(() => result.current.stepForward());
    expect(result.current.currentLine).toBe(2);

    act(() => result.current.reset());
    expect(result.current.currentLine).toBeNull();
    expect(result.current.phase).toBe("idle");
    expect(onRequestRecording).not.toHaveBeenCalled();

    // Stepping forward again replays the same timeline, not a fresh recording.
    act(() => result.current.stepForward());
    expect(result.current.currentLine).toBe(1);
    expect(onRequestRecording).not.toHaveBeenCalled();
  });

  it("reveals the trailing error only once playback reaches the end of the recorded steps", () => {
    const { result } = renderHook(() => usePlayback(STEPS, "boom", vi.fn()));

    act(() => result.current.stepForward());
    act(() => result.current.stepForward());
    act(() => result.current.stepForward());
    expect(result.current.errorRevealed).toBeNull();

    act(() => result.current.stepForward());
    expect(result.current.errorRevealed).toBe("boom");
    expect(result.current.phase).toBe("done");
  });

  it("play() resumes from the current position over an existing timeline, without re-recording", () => {
    const onRequestRecording = vi.fn();
    const { result } = renderHook(() => usePlayback(STEPS, null, onRequestRecording));

    act(() => result.current.stepForward());
    expect(result.current.currentLine).toBe(1);

    act(() => result.current.play());
    expect(result.current.phase).toBe("playing");
    expect(onRequestRecording).not.toHaveBeenCalled();
  });

  it("restart() always requests a fresh recording, discarding a stale timeline from a previous run", () => {
    const onRequestRecording = vi.fn();
    const { result } = renderHook(() => usePlayback(STEPS, null, onRequestRecording));

    act(() => result.current.stepForward());
    expect(result.current.currentLine).toBe(1);

    act(() => result.current.restart());
    expect(onRequestRecording).toHaveBeenCalledTimes(1);
    expect(result.current.phase).toBe("recording");
  });
});
