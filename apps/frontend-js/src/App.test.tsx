import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "@/App";

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
  window.history.pushState({}, "", "/");
});

describe("App", () => {
  it("renders the homepage with offline and collab CTAs at the root path", () => {
    window.history.pushState({}, "", "/");
    render(<App />);
    expect(screen.getByText("txt4xyz")).toBeTruthy();
    expect(screen.getByRole("link", { name: /collab/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /offline/i })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "editor" })).toBeNull();
  });

  it("renders the editor with output pane at /edit", () => {
    window.history.pushState({}, "", "/edit");
    render(<App />);
    expect(screen.getByRole("region", { name: "editor" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "output" })).toBeTruthy();
  });

  it("renders the editor with output pane at /offline, without room participants", () => {
    window.history.pushState({}, "", "/offline");
    render(<App />);
    expect(screen.getByRole("region", { name: "editor" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "output" })).toBeTruthy();
    expect(screen.queryByLabelText(/^room:/i)).toBeNull();
  });
});
