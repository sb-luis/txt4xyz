import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createDebouncedRoomDocWriter,
  readStoredDoc,
  readStoredRoomDoc,
  roomStorageKey,
  writeStoredRoomDoc,
} from "./localStore";

const STORAGE_KEY = "txt4xyz:doc";

describe("readStoredDoc", () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("returns null when nothing is stored", () => {
    expect(readStoredDoc(STORAGE_KEY)).toBeNull();
  });

  it("returns the stored document", () => {
    window.localStorage.setItem(STORAGE_KEY, "print('hi')");
    expect(readStoredDoc(STORAGE_KEY)).toBe("print('hi')");
  });

  it("returns null instead of throwing when localStorage.getItem throws", () => {
    vi.spyOn(window.localStorage.__proto__, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(() => readStoredDoc(STORAGE_KEY)).not.toThrow();
    expect(readStoredDoc(STORAGE_KEY)).toBeNull();
  });
});

describe("createDebouncedRoomDocWriter", () => {
  const ROOM_ID = "room-a";
  const ROOM_KEY = roomStorageKey(ROOM_ID);

  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("coalesces rapid schedule calls into a single write", () => {
    const writer = createDebouncedRoomDocWriter(ROOM_ID, 500);

    writer.schedule("a");
    vi.advanceTimersByTime(100);
    writer.schedule("ab");
    vi.advanceTimersByTime(100);
    writer.schedule("abc");

    expect(window.localStorage.getItem(ROOM_KEY)).toBeNull();

    vi.advanceTimersByTime(500);

    expect(window.localStorage.getItem(ROOM_KEY)).toBe("abc");
  });

  it("does not throw when the underlying write fails", () => {
    vi.spyOn(window.localStorage.__proto__, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    const writer = createDebouncedRoomDocWriter(ROOM_ID, 500);

    writer.schedule("x");
    expect(() => vi.advanceTimersByTime(500)).not.toThrow();
  });

  it("cancel prevents a pending write", () => {
    const writer = createDebouncedRoomDocWriter(ROOM_ID, 500);
    writer.schedule("should-not-persist");
    writer.cancel();
    vi.advanceTimersByTime(1000);
    expect(window.localStorage.getItem(ROOM_KEY)).toBeNull();
  });
});

describe("writeStoredRoomDoc / readStoredRoomDoc", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("round-trips a document under its room-scoped key", () => {
    writeStoredRoomDoc("room-a", "print('a')");
    expect(readStoredRoomDoc("room-a")).toBe("print('a')");
    expect(readStoredDoc(roomStorageKey("room-a"))).toBe("print('a')");
  });

  it("keeps two rooms' documents from colliding", () => {
    writeStoredRoomDoc("room-a", "print('a')");
    writeStoredRoomDoc("room-b", "print('b')");

    expect(readStoredRoomDoc("room-a")).toBe("print('a')");
    expect(readStoredRoomDoc("room-b")).toBe("print('b')");
  });

  it("prunes the oldest room once the bound is exceeded, so storage cannot grow without limit", () => {
    for (let i = 0; i < 21; i++) {
      writeStoredRoomDoc(`room-${i}`, `print(${i})`);
    }

    // room-0 is the least-recently-touched of 21 rooms against a bound of 20.
    expect(readStoredRoomDoc("room-0")).toBeNull();
    expect(readStoredRoomDoc("room-20")).toBe("print(20)");
  });

  it("keeps a room's slot fresh (not evicted) when it is written again", () => {
    writeStoredRoomDoc("room-old", "print('old')");
    for (let i = 0; i < 19; i++) {
      writeStoredRoomDoc(`room-${i}`, `print(${i})`);
    }
    // Touch room-old again so it is no longer the least-recently-used entry.
    writeStoredRoomDoc("room-old", "print('old, edited')");
    writeStoredRoomDoc("room-new", "print('new')");

    expect(readStoredRoomDoc("room-old")).toBe("print('old, edited')");
    expect(readStoredRoomDoc("room-0")).toBeNull();
  });
});
