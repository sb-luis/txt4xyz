import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const init = vi.fn(async () => {});
const workspaceCtor = vi.fn(function Workspace(this: { format: () => string }) {
  this.format = () => "";
});

vi.mock("@astral-sh/ruff-wasm-web", () => ({
  default: init,
  Workspace: Object.assign(workspaceCtor, { defaultSettings: () => ({}) }),
  PositionEncoding: { Utf16: 1 },
}));

// ruffFormatter caches its wasm-init promise in a module-level singleton, so
// each test needs a fresh module instance to control whether init succeeds
// or fails on that run.
beforeEach(() => {
  vi.resetModules();
  init.mockClear().mockImplementation(async () => {});
});

describe("useFormatterStatus", () => {
  it("starts loading and moves to ready once the wasm module initializes", async () => {
    const { useFormatterStatus } = await import("./useFormatterStatus");
    const { result } = renderHook(() => useFormatterStatus());

    expect(result.current).toBe("loading");
    await waitFor(() => expect(result.current).toBe("ready"));
  });

  it("reports error when the wasm module fails to initialize", async () => {
    init.mockImplementation(async () => {
      throw new Error("network error");
    });
    const { useFormatterStatus } = await import("./useFormatterStatus");
    const { result } = renderHook(() => useFormatterStatus());

    await waitFor(() => expect(result.current).toBe("error"));
  });
});
