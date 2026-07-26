import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRoom } from "./useRoom";

class StubSocket {
  binaryType = "";
  readyState = 0;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: (() => void) | null = null;
  send() {}
  close() {}
}

beforeEach(() => {
  vi.stubGlobal("WebSocket", StubSocket);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useRoom seeding", () => {
  it("carries the current scratchpad into a room this client just created", () => {
    const { result } = renderHook(() => useRoom("newroom", "print('carry me')"));

    expect(result.current.ytext?.toString()).toBe("print('carry me')");
  });

  it("leaves a joined room empty so remote text is never duplicated", () => {
    const { result } = renderHook(() => useRoom("joinedroom"));

    expect(result.current.ytext?.toString()).toBe("");
  });
});
