import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { RESTORE_GRACE_MS, useRoom } from "./useRoom";
import { roomStorageKey } from "@/lib/persistence/localStore";

class StubSocket {
  binaryType = "";
  readyState = 0;
  onopen: (() => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: (() => void) | null = null;
  send() {}
  close() {}
}

let lastAutoOpenSocket: AutoOpenSocket | null = null;

class AutoOpenSocket {
  binaryType = "";
  readyState = 1;
  sent: Uint8Array[] = [];
  onopen: (() => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: ArrayBuffer }) => void) | null = null;
  send(data: Uint8Array) {
    this.sent.push(data);
  }
  close() {
    this.readyState = 3;
    this.onclose?.({ code: 1000 });
  }
  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- captures the instance for test assertions
    lastAutoOpenSocket = this;
    queueMicrotask(() => this.onopen?.());
  }
}

async function flushMicrotasks() {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

beforeEach(() => {
  vi.stubGlobal("WebSocket", StubSocket);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useRoom awareness", () => {
  it("lists the local user as a participant as soon as the room is joined", () => {
    const { result } = renderHook(() => useRoom("newroom"));

    expect(result.current.awareness).not.toBeNull();
    expect(result.current.participants).toHaveLength(1);
    expect(result.current.participants[0].name).toEqual(expect.any(String));
  });

  it("clears participants and awareness when leaving the room", () => {
    const { result, rerender } = renderHook(({ roomId }: { roomId: string | null }) => useRoom(roomId), {
      initialProps: { roomId: "newroom" as string | null },
    });

    expect(result.current.participants).toHaveLength(1);

    rerender({ roomId: null });

    expect(result.current.participants).toHaveLength(0);
    expect(result.current.awareness).toBeNull();
  });
});

describe("useRoom run broadcasts", () => {
  beforeEach(() => {
    vi.stubGlobal("WebSocket", AutoOpenSocket);
  });

  it("sends a run broadcast frame carrying the run id over the socket", async () => {
    const { result } = renderHook(() => useRoom("runroom"));
    await act(async () => {
      await flushMicrotasks();
    });

    const sentBefore = lastAutoOpenSocket!.sent.length;
    act(() => {
      result.current.broadcastRun("run-1");
    });
    await act(async () => {
      await flushMicrotasks();
    });

    expect(lastAutoOpenSocket!.sent.length).toBe(sentBefore + 1);
    const decoder = decoding.createDecoder(lastAutoOpenSocket!.sent.at(-1)!);
    expect(decoding.readVarUint(decoder)).toBe(2); // MESSAGE_RUN
    expect(decoding.readVarString(decoder)).toBe("run-1");
  });

  it("is a no-op when there is no live provider", () => {
    const { result } = renderHook(() => useRoom(null));
    expect(() => result.current.broadcastRun("run-1")).not.toThrow();
  });

  it("updates lastRunBroadcast when the provider fires onRunBroadcast", async () => {
    const { result } = renderHook(() => useRoom("runroom2"));
    await act(async () => {
      await flushMicrotasks();
    });

    expect(result.current.lastRunBroadcast).toBeNull();

    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, 2);
    encoding.writeVarString(encoder, "run-abc");
    encoding.writeVarUint(encoder, 42);
    const bytes = encoding.toUint8Array(encoder);

    act(() => {
      lastAutoOpenSocket!.onmessage?.({
        data: bytes.slice().buffer,
      });
    });

    await act(async () => {
      await flushMicrotasks();
    });

    expect(result.current.lastRunBroadcast).toEqual({ id: "run-abc", requestedBy: 42 });
  });
});

describe("useRoom local backstop", () => {
  beforeEach(() => {
    vi.stubGlobal("WebSocket", AutoOpenSocket);
    vi.useFakeTimers();
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.useRealTimers();
  });

  it("restores the stored doc once it has confirmed the room is empty and unaccompanied", async () => {
    window.localStorage.setItem(roomStorageKey("emptyroom"), "print('restored')");

    const { result } = renderHook(() => useRoom("emptyroom"));

    await act(async () => {
      await flushMicrotasks();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(RESTORE_GRACE_MS + 100);
    });

    expect(result.current.ytext?.toString()).toBe("print('restored')");
  });

  it("does not restore when another participant is already present, to avoid duplicating their document", async () => {
    window.localStorage.setItem(roomStorageKey("crowdedroom"), "print('should not appear')");

    const { result } = renderHook(() => useRoom("crowdedroom"));
    await act(async () => {
      await flushMicrotasks();
    });

    const peerDoc = new Y.Doc();
    const peerAwareness = new awarenessProtocol.Awareness(peerDoc);
    peerAwareness.setLocalStateField("user", { name: "peer" });
    const update = awarenessProtocol.encodeAwarenessUpdate(peerAwareness, [peerDoc.clientID]);

    act(() => {
      awarenessProtocol.applyAwarenessUpdate(result.current.awareness!, update, "test");
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(RESTORE_GRACE_MS + 100);
    });

    expect(result.current.ytext?.toString()).toBe("");

    peerAwareness.destroy();
    peerDoc.destroy();
  });

  it("does not restore when the document already has content, to avoid duplicating it", async () => {
    window.localStorage.setItem(roomStorageKey("syncedroom"), "print('should not appear')");

    const { result } = renderHook(() => useRoom("syncedroom"));
    await act(async () => {
      await flushMicrotasks();
    });

    act(() => {
      result.current.ytext!.insert(0, "print('from a peer via sync')");
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(RESTORE_GRACE_MS + 100);
    });

    expect(result.current.ytext?.toString()).toBe("print('from a peer via sync')");
  });
});
