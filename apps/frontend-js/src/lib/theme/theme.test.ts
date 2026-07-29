import { afterEach, describe, expect, it, vi } from "vitest";
import { readStoredTheme, resolveInitialTheme, systemTheme, writeStoredTheme } from "./theme";

function mockMatchMedia(matches: boolean) {
  vi.spyOn(window, "matchMedia").mockReturnValue({
    matches,
    media: "(prefers-color-scheme: dark)",
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as MediaQueryList);
}

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("readStoredTheme", () => {
  it("returns null when nothing is stored", () => {
    expect(readStoredTheme()).toBeNull();
  });

  it("returns the stored theme", () => {
    window.localStorage.setItem("txt4xyz:theme", "dark");
    expect(readStoredTheme()).toBe("dark");
  });

  it("rejects an invalid stored value", () => {
    window.localStorage.setItem("txt4xyz:theme", "blue");
    expect(readStoredTheme()).toBeNull();
  });

  it("returns null instead of throwing when localStorage.getItem throws", () => {
    vi.spyOn(window.localStorage.__proto__, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(() => readStoredTheme()).not.toThrow();
    expect(readStoredTheme()).toBeNull();
  });
});

describe("writeStoredTheme", () => {
  it("round-trips through readStoredTheme", () => {
    writeStoredTheme("dark");
    expect(readStoredTheme()).toBe("dark");
  });

  it("does not throw when the underlying write fails", () => {
    vi.spyOn(window.localStorage.__proto__, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() => writeStoredTheme("dark")).not.toThrow();
  });
});

describe("systemTheme", () => {
  it("returns dark when the OS prefers dark", () => {
    mockMatchMedia(true);
    expect(systemTheme()).toBe("dark");
  });

  it("returns light when the OS prefers light", () => {
    mockMatchMedia(false);
    expect(systemTheme()).toBe("light");
  });
});

describe("resolveInitialTheme", () => {
  it("prefers a stored theme over the system theme", () => {
    mockMatchMedia(true);
    writeStoredTheme("light");
    expect(resolveInitialTheme()).toBe("light");
  });

  it("falls back to the system theme when nothing is stored", () => {
    mockMatchMedia(true);
    expect(resolveInitialTheme()).toBe("dark");
  });
});
