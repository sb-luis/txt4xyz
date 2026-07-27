import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/layout/AppShell";

class FakeWorker {
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  postMessage() {}
  terminate() {}
}

class FakeSocket {
  binaryType = "";
  readyState = 0;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: ArrayBuffer }) => void) | null = null;
  send() {}
  close() {
    this.readyState = 3;
    this.onclose?.();
  }
}

beforeEach(() => {
  vi.stubGlobal("Worker", FakeWorker);
  vi.stubGlobal("WebSocket", FakeSocket);
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.location.hash = "";
});

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
});
