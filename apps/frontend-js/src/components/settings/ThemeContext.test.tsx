import { act } from "react";
import { render, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { systemTheme } from "./ThemeContext";

function mockMatchMedia(matches: boolean) {
  let listeners: Array<(event: MediaQueryListEvent) => void> = [];
  const media = {
    matches,
    media: "(prefers-color-scheme: dark)",
    addEventListener: vi.fn((_event: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.push(listener);
    }),
    removeEventListener: vi.fn((_event: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners = listeners.filter((l) => l !== listener);
    }),
  } as unknown as MediaQueryList;
  vi.spyOn(window, "matchMedia").mockReturnValue(media);
  return {
    fire: (nextMatches: boolean) => {
      listeners.forEach((listener) => listener({ matches: nextMatches } as MediaQueryListEvent));
    },
  };
}

// The module resolves its persisted setting's default theme once, at import
// time, from the OS/DOM state at that moment — so each scenario needs a fresh
// module instance loaded under its own mocked matchMedia.
async function freshThemeModule() {
  vi.resetModules();
  return import("./ThemeContext");
}

afterEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  vi.restoreAllMocks();
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

describe("ThemeProvider", () => {
  it("writes the resolved theme onto the document element", async () => {
    mockMatchMedia(true);
    const { ThemeProvider } = await freshThemeModule();
    render(
      <ThemeProvider>
        <div />
      </ThemeProvider>,
    );
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("toggleTheme flips the theme and persists an explicit choice", async () => {
    mockMatchMedia(false);
    const { ThemeProvider, useTheme } = await freshThemeModule();
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe("dark");
    expect(window.localStorage.getItem("txt4xyz:theme")).toBe(JSON.stringify("dark"));
  });

  it("follows a live OS change while no explicit choice has been made", async () => {
    const media = mockMatchMedia(false);
    const { ThemeProvider, useTheme } = await freshThemeModule();
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });

    expect(result.current.theme).toBe("light");
    act(() => {
      media.fire(true);
    });
    expect(result.current.theme).toBe("dark");
  });

  it("stops following the OS once the user has made an explicit choice", async () => {
    const media = mockMatchMedia(false);
    const { ThemeProvider, useTheme } = await freshThemeModule();
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });

    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.theme).toBe("dark");

    act(() => {
      media.fire(false);
    });
    expect(result.current.theme).toBe("dark");
  });

  it("throws when useTheme is used outside its Provider", async () => {
    mockMatchMedia(false);
    const { useTheme } = await freshThemeModule();
    function Consumer() {
      useTheme();
      return null;
    }
    expect(() => render(<Consumer />)).toThrow(/must be used within a ThemeProvider/);
  });
});
