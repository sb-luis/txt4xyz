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
