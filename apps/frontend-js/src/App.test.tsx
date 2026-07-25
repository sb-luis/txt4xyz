import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "@/App";

class FakeWorker {
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  postMessage() {}
  terminate() {}
}

beforeEach(() => {
  vi.stubGlobal("Worker", FakeWorker);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("App", () => {
  it("renders the app shell with editor and output panes", () => {
    render(<App />);
    expect(screen.getByText("txt4.xyz")).toBeTruthy();
    expect(screen.getByRole("region", { name: "editor" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "output" })).toBeTruthy();
  });
});
