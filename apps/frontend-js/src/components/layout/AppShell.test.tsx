import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as encoding from "lib0/encoding";
import { AppShell } from "@/components/layout/AppShell";

let lastFakeWorker: FakeWorker | null = null;

class FakeWorker {
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  runCalls: string[] = [];
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
    this.runCalls.push(id);
    queueMicrotask(() => {
      if (type === "run-traced") {
        this.onmessage?.({ data: { type: "run-timeline", id, steps: [] } } as MessageEvent<unknown>);
      }
      this.onmessage?.({ data: { type: "run-result", id } } as MessageEvent<unknown>);
    });
  }
  terminate() {}
}

let lastFakeSocket: FakeSocket | null = null;

class FakeSocket {
  binaryType = "";
  readyState = 1;
  sent: Uint8Array[] = [];
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: ArrayBuffer }) => void) | null = null;
  send(data: Uint8Array) {
    this.sent.push(data);
  }
  close() {
    this.readyState = 3;
    this.onclose?.();
  }
  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- captures the instance for test assertions
    lastFakeSocket = this;
    queueMicrotask(() => this.onopen?.());
  }
}

beforeEach(() => {
  // The awareness broadcast is coalesced behind a real 50ms setTimeout
  // (provider.ts's AWARENESS_COALESCE_MS). Without fake timers, whether it
  // fires inside a test's microtask-flush window depends on wall-clock
  // scheduling, making socket-send-count assertions flaky under CI load.
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  vi.stubGlobal("Worker", FakeWorker);
  vi.stubGlobal("WebSocket", FakeSocket);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  window.location.hash = "";
  lastFakeSocket = null;
  lastFakeWorker = null;
});

async function flushMicrotasks() {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

const MESSAGE_RUN = 2;

function encodeRunBroadcast(runId: string, requestedBy: number): Uint8Array {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_RUN);
  encoding.writeVarString(encoder, runId);
  encoding.writeVarUint(encoder, requestedBy);
  return encoding.toUint8Array(encoder);
}

describe("AppShell", () => {
  it("renders both the editor and output panes", () => {
    render(<AppShell />);
    expect(screen.getByRole("region", { name: "editor" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "output" })).toBeTruthy();
  });

  it("mints a room and installs it in the URL fragment when none is present", () => {
    render(<AppShell />);
    expect(window.location.hash).toMatch(/^#room=[a-zA-Z0-9\-_]+$/);
  });

  it("joins the room already named in the URL fragment instead of minting a new one", () => {
    window.location.hash = "room=already-here";
    render(<AppShell />);
    expect(window.location.hash).toBe("#room=already-here");
  });

  it("running runs locally and broadcasts a run to the room", async () => {
    render(<AppShell />);
    await act(async () => {
      await flushMicrotasks();
    });

    const playButton = screen.getByRole("button", { name: "play" });
    expect((playButton as HTMLButtonElement).disabled).toBe(false);

    const sentBefore = lastFakeSocket!.sent.length;
    fireEvent.click(playButton);

    await act(async () => {
      await flushMicrotasks();
    });

    expect(lastFakeWorker!.runCalls.length).toBe(1);
    expect(lastFakeSocket!.sent.length).toBeGreaterThan(sentBefore);
  });

  it("runs locally when a run request arrives from the room, without re-broadcasting it", async () => {
    render(<AppShell />);
    await act(async () => {
      await flushMicrotasks();
    });

    expect(lastFakeWorker!.runCalls.length).toBe(0);

    const bytes = encodeRunBroadcast("peer-run-1", 7);
    const sentBefore = lastFakeSocket!.sent.length;
    act(() => {
      lastFakeSocket!.onmessage?.({
        data: bytes.slice().buffer,
      });
    });

    await act(async () => {
      await flushMicrotasks();
    });

    expect(lastFakeWorker!.runCalls.length).toBe(1);
    // A received run must not itself broadcast, or two tabs would ping-pong
    // run requests back and forth forever.
    expect(lastFakeSocket!.sent.length).toBe(sentBefore);
  });
});
