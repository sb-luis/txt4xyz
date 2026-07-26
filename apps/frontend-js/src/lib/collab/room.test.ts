import { describe, expect, it } from "vitest";
import { generateRoomId, readRoomIdFromHash } from "./room";

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
