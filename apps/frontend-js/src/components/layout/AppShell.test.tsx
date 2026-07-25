import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/layout/AppShell";

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

describe("AppShell", () => {
  it("renders both the editor and output panes", () => {
    render(<AppShell />);
    expect(screen.getByRole("region", { name: "editor" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "output" })).toBeTruthy();
  });
});
