import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDebouncedDocWriter, readStoredDoc } from "./localStore";

const STORAGE_KEY = "txt4xyz:doc";

describe("readStoredDoc", () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("returns null when nothing is stored", () => {
    expect(readStoredDoc()).toBeNull();
  });

  it("returns the stored document", () => {
    window.localStorage.setItem(STORAGE_KEY, "print('hi')");
    expect(readStoredDoc()).toBe("print('hi')");
  });

  it("returns null instead of throwing when localStorage.getItem throws", () => {
    vi.spyOn(window.localStorage.__proto__, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(() => readStoredDoc()).not.toThrow();
    expect(readStoredDoc()).toBeNull();
  });
});

describe("createDebouncedDocWriter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("coalesces rapid schedule calls into a single write", () => {
    const writer = createDebouncedDocWriter(500);

    writer.schedule("a");
    vi.advanceTimersByTime(100);
    writer.schedule("ab");
    vi.advanceTimersByTime(100);
    writer.schedule("abc");

    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();

    vi.advanceTimersByTime(500);

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("abc");
  });

  it("does not throw when the underlying write fails", () => {
    vi.spyOn(window.localStorage.__proto__, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    const writer = createDebouncedDocWriter(500);

    writer.schedule("x");
    expect(() => vi.advanceTimersByTime(500)).not.toThrow();
  });

  it("cancel prevents a pending write", () => {
    const writer = createDebouncedDocWriter(500);
    writer.schedule("should-not-persist");
    writer.cancel();
    vi.advanceTimersByTime(1000);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
