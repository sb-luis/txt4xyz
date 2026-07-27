import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as Y from "yjs";
import * as decoding from "lib0/decoding";
import * as awarenessProtocol from "y-protocols/awareness";
import { AppShell } from "@/components/layout/AppShell";

const joinedRooms: string[] = [];
const sentFrames: Array<{ room: string; bytes: Uint8Array }> = [];

class RecordingSocket {
  binaryType = "";
  readyState = 1;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: ArrayBuffer }) => void) | null = null;
  private first = true;
  private room: string | null = null;

  constructor() {
    queueMicrotask(() => this.onopen?.());
  }

  send(data: Uint8Array) {
    if (this.first) {
      this.room = new TextDecoder().decode(data);
      joinedRooms.push(this.room);
      this.first = false;
      return;
    }
    sentFrames.push({ room: this.room!, bytes: data.slice() });
  }

  close() {
    this.readyState = 3;
    this.onclose?.();
  }
}

// Message type 1 is awareness (see the envelope in provider.ts). Decoding it
// through a scratch Awareness instance is the only way to read the client
// ids a frame carries without duplicating the wire format here.
function awarenessClientIds(bytes: Uint8Array): number[] {
  const decoder = decoding.createDecoder(bytes);
  if (decoding.readVarUint(decoder) !== 1) return [];
  const scratchAwareness = new awarenessProtocol.Awareness(new Y.Doc());
  awarenessProtocol.applyAwarenessUpdate(scratchAwareness, decoding.readTailAsUint8Array(decoder), "test");
  const ids = Array.from(scratchAwareness.getStates().keys());
  scratchAwareness.destroy();
  return ids;
}

function setHash(hash: string) {
  window.location.hash = hash;
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

class FakeWorker {
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  postMessage() {}
  terminate() {}
}

beforeEach(() => {
  joinedRooms.length = 0;
  sentFrames.length = 0;
  vi.stubGlobal("WebSocket", RecordingSocket);
  vi.stubGlobal("Worker", FakeWorker);
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.location.hash = "";
});

describe("room isolation", () => {
  it("stops relaying into the previous room when the fragment names a new one", async () => {
    window.location.hash = "room=roomOne";
    render(<AppShell />);
    await act(async () => {});

    expect(joinedRooms).toEqual(["roomOne"]);

    await act(async () => {
      setHash("room=roomTwo");
    });

    // The socket carrying roomOne must be gone, not merely joined alongside:
    // a client still holding it would relay edits into a room whose link the
    // user believes they have left.
    expect(joinedRooms).toEqual(["roomOne", "roomTwo"]);
    expect(joinedRooms.at(-1)).toBe("roomTwo");
  });

  it("does not carry the previous room's awareness client into the next room", async () => {
    window.location.hash = "room=roomOne";
    render(<AppShell />);
    await act(async () => {});

    const roomOneClientIds = sentFrames
      .filter((frame) => frame.room === "roomOne")
      .flatMap((frame) => awarenessClientIds(frame.bytes));
    expect(roomOneClientIds.length).toBeGreaterThan(0);

    sentFrames.length = 0;

    await act(async () => {
      setHash("room=roomTwo");
    });

    const roomTwoClientIds = sentFrames
      .filter((frame) => frame.room === "roomTwo")
      .flatMap((frame) => awarenessClientIds(frame.bytes));
    expect(roomTwoClientIds.length).toBeGreaterThan(0);

    // A client id this old (an unrelated Y.Doc's random id) showing up in the
    // new room's awareness traffic would mean the old room's Y.Doc/Awareness
    // pair was never torn down before the new one was created.
    for (const id of roomOneClientIds) {
      expect(roomTwoClientIds).not.toContain(id);
    }
  });
});
