import { afterEach, describe, expect, it, vi } from "vitest";
import { generateRoomId, readRoomIdFromHash, resolveEditorRoomId } from "./room";

const RELAY_VALID_PATTERN = /^[a-zA-Z0-9\-_]{1,128}$/;

describe("generateRoomId", () => {
  it("produces ids the relay's validation rules accept, and different ones per call", () => {
    const one = generateRoomId();
    const two = generateRoomId();

    expect(one).toMatch(RELAY_VALID_PATTERN);
    expect(two).toMatch(RELAY_VALID_PATTERN);
    expect(one).not.toBe(two);
  });
});

describe("readRoomIdFromHash", () => {
  it("accepts a well-formed room fragment", () => {
    expect(readRoomIdFromHash("#room=abcDEF123-_")).toBe("abcDEF123-_");
  });

  it("rejects a fragment with disallowed characters", () => {
    expect(readRoomIdFromHash("#room=abc def")).toBeNull();
  });

  it("rejects an oversized id", () => {
    const tooLong = "a".repeat(129);
    expect(readRoomIdFromHash(`#room=${tooLong}`)).toBeNull();
  });

  it("rejects a hash that isn't a room fragment", () => {
    expect(readRoomIdFromHash("#somethingelse")).toBeNull();
  });
});

describe("resolveEditorRoomId", () => {
  afterEach(() => {
    window.location.hash = "";
    vi.restoreAllMocks();
  });

  it("mints exactly one room and installs it with replaceState when there is no fragment", () => {
    const replaceState = vi.spyOn(window.history, "replaceState");
    const pushState = vi.spyOn(window.history, "pushState");

    const id = resolveEditorRoomId();

    expect(id).toBeTruthy();
    expect(replaceState).toHaveBeenCalledTimes(1);
    expect(pushState).not.toHaveBeenCalled();
    expect(window.location.hash).toBe(`#room=${id}`);
  });

  it("treats an invalid fragment as absent and mints a fresh room", () => {
    window.location.hash = "not-a-room-fragment";
    const replaceState = vi.spyOn(window.history, "replaceState");

    const id = resolveEditorRoomId();

    expect(replaceState).toHaveBeenCalledTimes(1);
    expect(window.location.hash).toBe(`#room=${id}`);
  });

  it("keeps an existing valid room id and does not touch history", () => {
    window.location.hash = "room=already-here";
    const replaceState = vi.spyOn(window.history, "replaceState");

    const id = resolveEditorRoomId();

    expect(id).toBe("already-here");
    expect(replaceState).not.toHaveBeenCalled();
  });
});
