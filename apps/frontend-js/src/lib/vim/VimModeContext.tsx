import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { readStoredVimMode, writeStoredVimMode } from "./vim";

interface VimModeContextValue {
  vimMode: boolean;
  toggleVimMode: () => void;
}

const VimModeContext = createContext<VimModeContextValue | null>(null);

export function VimModeProvider({ children }: { children: ReactNode }) {
  const [vimMode, setVimMode] = useState<boolean>(readStoredVimMode);

  const value = useMemo<VimModeContextValue>(
    () => ({
      vimMode,
      toggleVimMode: () => {
        setVimMode((prev) => {
          const next = !prev;
          writeStoredVimMode(next);
          return next;
        });
      },
    }),
    [vimMode],
  );

  return <VimModeContext.Provider value={value}>{children}</VimModeContext.Provider>;
}

export function useVimMode(): VimModeContextValue {
  const value = useContext(VimModeContext);
  if (value === null) throw new Error("useVimMode must be used within a VimModeProvider");
  return value;
}
