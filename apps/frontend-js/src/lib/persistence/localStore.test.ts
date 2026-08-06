import { afterEach, describe, expect, it, vi } from "vitest";
import { readStoredDoc } from "./localStore";

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
