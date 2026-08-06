import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { RESTORE_GRACE_MS, useRoom, type DocStore } from "./useRoom";

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

function memoryStore(seed: Record<string, string> = {}): DocStore {
  const map = new Map<string, string>(Object.entries(seed));
  return {
    read(roomId) {
      return map.get(roomId) ?? null;
    },
    write(roomId, doc) {
      map.set(roomId, doc);
    },
  };
}

beforeEach(() => {
  vi.stubGlobal("WebSocket", StubSocket);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useRoom awareness", () => {
  it("lists the local user as a participant as soon as the room is joined", () => {
    const { result } = renderHook(() => useRoom({ roomId: "newroom" }));

    expect(result.current.awareness).not.toBeNull();
    expect(result.current.participants).toHaveLength(1);
    expect(result.current.participants[0].name).toEqual(expect.any(String));
  });

  it("clears participants and awareness when leaving the room", () => {
    const { result, rerender } = renderHook(({ roomId }: { roomId: string | null }) => useRoom({ roomId }), {
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
    const { result } = renderHook(() => useRoom({ roomId: "runroom" }));
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
    const { result } = renderHook(() => useRoom({ roomId: null }));
    expect(() => result.current.broadcastRun("run-1")).not.toThrow();
  });

  it("updates lastRunBroadcast when the provider fires onRunBroadcast", async () => {
    const { result } = renderHook(() => useRoom({ roomId: "runroom2" }));
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
    vi.useRealTimers();
  });

  it("restores the stored doc once it has confirmed the room is empty and unaccompanied", async () => {
    const store = memoryStore({ emptyroom: "print('restored')" });

    const { result } = renderHook(() => useRoom({ roomId: "emptyroom", store }));

    await act(async () => {
      await flushMicrotasks();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(RESTORE_GRACE_MS + 100);
    });

    expect(result.current.ytext?.toString()).toBe("print('restored')");
  });

  it("does not restore when another participant is already present, to avoid duplicating their document", async () => {
    const store = memoryStore({ crowdedroom: "print('should not appear')" });

    const { result } = renderHook(() => useRoom({ roomId: "crowdedroom", store }));
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
    const store = memoryStore({ syncedroom: "print('should not appear')" });

    const { result } = renderHook(() => useRoom({ roomId: "syncedroom", store }));
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

  it("does not restore when no store is provided", async () => {
    const { result } = renderHook(() => useRoom({ roomId: "nostoreroom" }));

    await act(async () => {
      await flushMicrotasks();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(RESTORE_GRACE_MS + 100);
    });

    expect(result.current.ytext?.toString()).toBe("");
  });
});

describe("useRoom option stability", () => {
  let socketConstructions = 0;

  class CountingSocket extends StubSocket {
    constructor() {
      super();
      socketConstructions++;
    }
  }

  beforeEach(() => {
    socketConstructions = 0;
    vi.stubGlobal("WebSocket", CountingSocket);
  });

  it("does not reconnect when a caller passes a newly constructed store on every render", () => {
    const { rerender } = renderHook(() => useRoom({ roomId: "stableroom", store: createStore() }));

    expect(socketConstructions).toBe(1);

    rerender();
    rerender();
    rerender();

    expect(socketConstructions).toBe(1);
  });
});

function createStore(): DocStore {
  const map = new Map<string, string>();
  return {
    read(roomId) {
      return map.get(roomId) ?? null;
    },
    write(roomId, doc) {
      map.set(roomId, doc);
    },
  };
}
