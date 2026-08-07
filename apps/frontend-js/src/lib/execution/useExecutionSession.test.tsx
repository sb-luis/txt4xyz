import { act } from "react";
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { ExecutionModeProvider } from "@/components/settings/ExecutionModeContext";
import { useExecutionSession } from "./useExecutionSession";

let lastFakeWorker: FakeWorker | null = null;

interface RunTimelineStep {
  line: number;
  stdout: string[];
  stderr: string[];
  display: never[];
}

class FakeWorker {
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  runCalls: Array<{ id: string; type: string }> = [];
  terminateCalls = 0;
  nextTimelineSteps: RunTimelineStep[] = [];
  nextError: string | null = null;

  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- captures the instance for test assertions
    lastFakeWorker = this;
    queueMicrotask(() => {
      this.onmessage?.({ data: { type: "ready" } } as MessageEvent<unknown>);
    });
  }

  postMessage(message: unknown) {
    const { type, id } = message as { type: string; id: string };
    if (type !== "run" && type !== "run-traced") return;
    this.runCalls.push({ id, type });
    queueMicrotask(() => {
      if (type === "run-traced") {
        this.onmessage?.({
          data: { type: "run-timeline", id, steps: this.nextTimelineSteps },
        } as MessageEvent<unknown>);
      }
      if (this.nextError !== null) {
        this.onmessage?.({
          data: { type: "run-error", id, traceback: this.nextError },
        } as MessageEvent<unknown>);
      } else {
        this.onmessage?.({ data: { type: "run-result", id } } as MessageEvent<unknown>);
      }
    });
  }

  terminate() {
    this.terminateCalls += 1;
  }
}

function wrapper({ children }: { children: ReactNode }) {
  return <ExecutionModeProvider>{children}</ExecutionModeProvider>;
}

async function flushMicrotasks() {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

function setup(broadcastRun = vi.fn()) {
  const codeRef = { current: "print(1)" };
  const rendered = renderHook(() => useExecutionSession(codeRef, broadcastRun), { wrapper });
  return { ...rendered, codeRef, broadcastRun };
}

beforeEach(() => {
  vi.stubGlobal("Worker", FakeWorker);
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
  lastFakeWorker = null;
});

describe("useExecutionSession", () => {
  it("defaults to run mode, with a null transport and no line tracking", async () => {
    const { result } = setup();
    await act(async () => {
      await flushMicrotasks();
    });

    expect(result.current.mode).toBe("run");
    expect(result.current.transport).toBeNull();
    expect(result.current.currentLine).toBeNull();
    expect(result.current.stepNumber).toBeNull();
  });

  it("run mode: run() streams into output and broadcasts", async () => {
    const { result, broadcastRun } = setup();
    await act(async () => {
      await flushMicrotasks();
    });

    act(() => {
      result.current.run();
    });
    await act(async () => {
      await flushMicrotasks();
    });

    expect(lastFakeWorker!.runCalls).toEqual([{ id: expect.any(String), type: "run" }]);
    expect(broadcastRun).toHaveBeenCalledTimes(1);
  });

  it("setMode('debug') switches without executing; running is a separate second step", async () => {
    const { result, broadcastRun } = setup();
    await act(async () => {
      await flushMicrotasks();
    });

    act(() => {
      result.current.setMode("debug");
    });
    await act(async () => {
      await flushMicrotasks();
    });

    expect(result.current.mode).toBe("debug");
    expect(result.current.transport).not.toBeNull();
    expect(lastFakeWorker!.runCalls).toEqual([]);
    expect(broadcastRun).not.toHaveBeenCalled();

    act(() => {
      result.current.run();
    });
    await act(async () => {
      await flushMicrotasks();
    });

    expect(lastFakeWorker!.runCalls).toEqual([{ id: expect.any(String), type: "run-traced" }]);
  });

  it("setMode aborts an in-flight execution", async () => {
    const { result } = setup();
    await act(async () => {
      await flushMicrotasks();
    });

    const runningWorker = lastFakeWorker!;
    act(() => {
      result.current.run();
    });
    expect(result.current.status).toBe("running");

    act(() => {
      result.current.setMode("debug");
    });

    // Mode switch respawns the runner (new worker), so the assertion must
    // target the specific worker instance that was mid-run, not whichever
    // instance is current by the time the assertion runs.
    expect(runningWorker.terminateCalls).toBeGreaterThan(0);
  });

  it("setMode invalidates the timeline: switching to run and back to debug re-records", async () => {
    const { result } = setup();
    await act(async () => {
      await flushMicrotasks();
    });

    act(() => {
      result.current.setMode("debug");
    });
    act(() => {
      result.current.run();
    });
    await act(async () => {
      await flushMicrotasks();
    });
    expect(lastFakeWorker!.runCalls.length).toBe(1);

    act(() => {
      result.current.setMode("run");
    });
    act(() => {
      result.current.setMode("debug");
    });
    act(() => {
      result.current.run();
    });
    await act(async () => {
      await flushMicrotasks();
    });

    // A fresh recording was requested rather than replaying the stale one.
    expect(lastFakeWorker!.runCalls.length).toBe(2);
  });

  it("setMode retains visible output across the toggle instead of clearing it", async () => {
    vi.useFakeTimers();
    try {
      const { result } = setup();
      await act(async () => {
        vi.advanceTimersByTime(0);
        await flushMicrotasks();
      });

      // Produce a real, revealed traceback in debug mode: an empty traced
      // timeline plus an error, then let playback's auto-advance animate
      // through to the point where the error is revealed.
      lastFakeWorker!.nextTimelineSteps = [];
      lastFakeWorker!.nextError = "boom";
      act(() => {
        result.current.setMode("debug");
      });
      act(() => {
        result.current.run();
      });
      await act(async () => {
        vi.advanceTimersByTime(0);
        await flushMicrotasks();
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      expect(result.current.output).toEqual([{ kind: "traceback", text: "boom" }]);
      const preToggleOutput = result.current.output;

      // Switching to run does not itself start a run, so the debug output
      // just seen must still be showing afterwards.
      act(() => {
        result.current.setMode("run");
      });

      expect(result.current.transport).toBeNull();
      expect(result.current.output).toEqual(preToggleOutput);

      // The next run starting is what clears it.
      lastFakeWorker!.nextError = null;
      act(() => {
        result.current.run();
      });
      expect(result.current.output).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("invalidate() clears a recorded timeline's projected output", async () => {
    const { result } = setup();
    await act(async () => {
      await flushMicrotasks();
    });

    lastFakeWorker!.nextTimelineSteps = [{ line: 1, stdout: ["hi"], stderr: [], display: [] }];
    act(() => {
      result.current.setMode("debug");
    });
    act(() => {
      result.current.run();
    });
    await act(async () => {
      await flushMicrotasks();
    });
    act(() => {
      result.current.transport?.stepForward();
    });
    expect(result.current.output.length).toBeGreaterThan(0);

    act(() => {
      result.current.invalidate();
    });

    expect(result.current.output).toEqual([]);
  });

  it("§6.4 regression: replaying an incoming broadcast does not swallow the next local run's broadcast", async () => {
    const { result, broadcastRun } = setup();
    await act(async () => {
      await flushMicrotasks();
    });

    act(() => {
      result.current.run({ broadcast: false });
    });
    await act(async () => {
      await flushMicrotasks();
    });
    expect(broadcastRun).not.toHaveBeenCalled();

    act(() => {
      result.current.run();
    });
    await act(async () => {
      await flushMicrotasks();
    });
    expect(broadcastRun).toHaveBeenCalledTimes(1);
  });

  it("§6.4 regression holds across a mode switch too", async () => {
    const { result, broadcastRun } = setup();
    await act(async () => {
      await flushMicrotasks();
    });

    act(() => {
      result.current.setMode("debug");
    });
    await act(async () => {
      await flushMicrotasks();
    });

    // Replay an incoming broadcast while in debug mode.
    act(() => {
      result.current.run({ broadcast: false });
    });
    await act(async () => {
      await flushMicrotasks();
    });
    expect(broadcastRun).not.toHaveBeenCalled();

    act(() => {
      result.current.setMode("run");
    });
    act(() => {
      result.current.run();
    });
    await act(async () => {
      await flushMicrotasks();
    });
    expect(broadcastRun).toHaveBeenCalledTimes(1);
  });
});
