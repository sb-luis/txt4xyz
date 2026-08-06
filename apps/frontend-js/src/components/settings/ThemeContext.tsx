import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { z } from "zod";
import { createPersistedSetting } from "@/lib/settings/createPersistedSetting";

export type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "txt4xyz:theme";
const themeSchema = z.union([z.literal("light"), z.literal("dark")]);

export function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// The inline script in index.html already resolves and writes data-theme
// before this module loads, to avoid a flash of the wrong theme.
function initialTheme(): Theme {
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "light" || attr === "dark" ? attr : systemTheme();
}

// Distinct from the persisted setting's own read: this only answers "has the
// user ever made an explicit choice", to gate whether OS changes should still
// be followed live.
function readStoredTheme(): Theme | null {
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === null) return null;
    let candidate: unknown;
    try {
      candidate = JSON.parse(raw);
    } catch {
      candidate = raw;
    }
    const parsed = themeSchema.safeParse(candidate);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

const themeSetting = createPersistedSetting<Theme>({
  key: THEME_STORAGE_KEY,
  schema: themeSchema,
  defaultValue: initialTheme(),
});

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function ThemeSync({ children }: { children: ReactNode }) {
  const { value: theme, setValue } = themeSetting.use();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Only follow the OS theme live when the user has never overridden it —
  // an explicit choice must stick even if the system theme changes later.
  useEffect(() => {
    if (readStoredTheme() !== null) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => {
      setValue(event.matches ? "dark" : "light");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [setValue]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      toggleTheme: () => setValue(theme === "dark" ? "light" : "dark"),
    }),
    [theme, setValue],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <themeSetting.Provider>
      <ThemeSync>{children}</ThemeSync>
    </themeSetting.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (value === null) throw new Error("useTheme must be used within a ThemeProvider");
  return value;
}
