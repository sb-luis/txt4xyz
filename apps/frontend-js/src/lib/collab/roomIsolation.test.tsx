import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/layout/AppShell";

const joinedRooms: string[] = [];

class RecordingSocket {
  binaryType = "";
  readyState = 1;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: ArrayBuffer }) => void) | null = null;
  private first = true;

  constructor() {
    queueMicrotask(() => this.onopen?.());
  }

  send(data: Uint8Array) {
    if (this.first) {
      joinedRooms.push(new TextDecoder().decode(data));
      this.first = false;
    }
  }

  close() {
    this.readyState = 3;
    this.onclose?.();
  }
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
});
