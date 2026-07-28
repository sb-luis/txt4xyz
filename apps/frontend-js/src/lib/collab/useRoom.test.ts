import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness";
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

class AutoOpenSocket {
  binaryType = "";
  readyState = 1;
  onopen: (() => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: ArrayBuffer }) => void) | null = null;
  send() {}
  close() {
    this.readyState = 3;
    this.onclose?.({ code: 1000 });
  }
  constructor() {
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
    expect(result.current.participants[0].color).toEqual(expect.any(String));
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
    peerAwareness.setLocalStateField("user", { name: "peer", color: "oklch(0.7 0.1 30)" });
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
