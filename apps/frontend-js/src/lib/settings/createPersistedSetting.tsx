import { createContext, useContext, useMemo, useState, type ReactNode, type FC } from "react";
import type { z } from "zod";

export interface PersistedSetting<T> {
  Provider: FC<{ children: ReactNode }>;
  use: () => { value: T; setValue: (next: T) => boolean };
}

interface PersistedSettingOptions<T> {
  key: string;
  schema: z.ZodType<T>;
  defaultValue: T;
}

function readStoredValue<T>(key: string, schema: z.ZodType<T>, defaultValue: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return defaultValue;
    // Pre-existing keys (theme, alias) hold a bare string, not JSON; a parse failure falls back to validating the raw string.
    let candidate: unknown;
    try {
      candidate = JSON.parse(raw);
    } catch {
      candidate = raw;
    }
    const parsed = schema.safeParse(candidate);
    return parsed.success ? parsed.data : defaultValue;
  } catch {
    return defaultValue;
  }
}

function writeStoredValue<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be full or disabled (Safari private mode); persistence is best-effort.
  }
}

export function createPersistedSetting<T>(options: PersistedSettingOptions<T>): PersistedSetting<T> {
  const { key, schema, defaultValue } = options;

  interface ContextValue {
    value: T;
    setValue: (next: T) => boolean;
  }

  const Context = createContext<ContextValue | null>(null);

  function Provider({ children }: { children: ReactNode }) {
    const [value, setValueState] = useState<T>(() => readStoredValue(key, schema, defaultValue));

    const contextValue = useMemo<ContextValue>(
      () => ({
        value,
        setValue: (next: T) => {
          const parsed = schema.safeParse(next);
          if (!parsed.success) return false;
          writeStoredValue(key, parsed.data);
          setValueState(parsed.data);
          return true;
        },
      }),
      [value],
    );

    return <Context.Provider value={contextValue}>{children}</Context.Provider>;
  }

  function use(): ContextValue {
    const value = useContext(Context);
    if (value === null) throw new Error(`useX must be used within its Provider (key: "${key}")`);
    return value;
  }

  return { Provider, use };
}
